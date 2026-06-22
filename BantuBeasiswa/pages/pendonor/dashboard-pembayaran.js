import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase, getStorageBucket } from '../../lib/db';
import { getServerSupabase } from '../../lib/supabaseServer';
import { withAuth } from '../../lib/auth';
import PendonorLayout from '../../components/layouts/PendonorLayout';
import KonfirmasiTransferModal from '../../components/KonfirmasiTransferModal';
import * as XLSX from 'xlsx';
import { showSuccess, showError, showConfirm, showWarning } from '../../lib/swal';

// --- Harmonious Design Tokens & Premium Color Palette ---
const C = {
  blue: '#0056b3',
  blueLight: '#eff6ff',
  blueBorder: '#bfdbfe',
  gold: '#ffc107',
  dark: '#1e293b',
  gray: '#64748b',
  grayLight: '#f8fafc',
  white: '#ffffff',
  green: '#10b981',
  greenBg: '#ecfdf5',
  greenText: '#047857',
  amber: '#f59e0b',
  amberBg: '#fffbeb',
  amberText: '#b45309',
  border: '#e2e8f0',
};

async function decryptQueueRekeningList(list) {
  const { decryptRekeningRow } = await import('../../lib/rekeningCrypto');

  return (list ?? []).map((item) => ({
    ...item,
    user: item.user
      ? {
          ...item.user,
          rekening: (item.user.rekening ?? []).map(decryptRekeningRow),
        }
      : item.user,
  }));
}

export default function DashboardPembayaran({ user, pendonorId, initialQueueList }) {
  const router = useRouter();

  // State Management
  const [selectedFilter, setSelectedFilter] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItemForModal, setSelectedItemForModal] = useState(null);

  const batchFileInputRef = useRef(null);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

  const handleBatchFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];

    if (!ACCEPTED_TYPES.includes(file.type)) {
      await showWarning('Perhatian', 'Format file tidak didukung. Harap unggah berkas PNG, JPG, JPEG, atau PDF.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      await showWarning('Perhatian', 'Ukuran file melebihi 5MB. Harap unggah berkas yang lebih kecil.');
      return;
    }

    const pendingItems = validQueue.filter((item) => {
      const p = item.penyaluran_dana?.[0];
      return p && p.status === 'pending';
    });

    if (pendingItems.length === 0) return;

    setIsProcessingBatch(true);

    try {
      // 1. Upload batch receipt file to Supabase Storage
      const ext = file.name.split('.').pop().toLowerCase();
      const storagePath = `transfer/batch_${pendonorId}_${Date.now()}.${ext}`;

      const bucket = getStorageBucket();
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(storagePath, file, { upsert: true });

      if (uploadError) {
        throw new Error(`Gagal mengunggah bukti transfer: ${uploadError.message}`);
      }

      // 2. Get Public URL
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) {
        throw new Error('Gagal mendapatkan URL bukti transfer.');
      }

      // 3. Send API confirmation request
      const penyaluranIds = pendingItems.map(item => item.penyaluran_dana[0].penyaluranId);
      
      const response = await fetch('/api/pendonor/pembayaran/confirm-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ penyaluranIds, buktiTransferUrl: publicUrl }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || 'Gagal mengonfirmasi batch pembayaran.');
      }

      await showSuccess('Berhasil!', resData.message);
      refreshData();
    } catch (err) {
      console.error('[Confirm Batch Error]', err);
      await showError('Gagal!', err.message || 'Terjadi kesalahan tidak terduga saat memproses batch.');
    } finally {
      setIsProcessingBatch(false);
      if (batchFileInputRef.current) {
        batchFileInputRef.current.value = ''; // Reset file input
      }
    }
  };

  // Refresh page data using shallow Next.js routing replacement
  const refreshData = () => {
    router.replace(router.asPath);
  };

  // Helper: Get local date string in YYYY-MM-DD
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 1. Filter: Penerima yang sudah LULUS dan sudah input rekening (Valid Queue)
  const validQueue = (initialQueueList || []).filter((item) => {
    return item.user?.rekening && item.user.rekening.length > 0;
  });

  // Calculate Metrics from Valid Queue
  const queueTotal = validQueue.length;

  const totalAmountPending = validQueue
    .filter((item) => {
      const p = item.penyaluran_dana?.[0];
      return !p || (p.status !== 'confirmed' && p.status !== 'tersalurkan');
    })
    .reduce((sum, item) => sum + (item.beasiswa?.nominal || 0), 0);

  const todayStr = getTodayStr();
  const verifiedToday = validQueue.filter((item) => {
    const p = item.penyaluran_dana?.[0];
    if (!p || (p.status !== 'confirmed' && p.status !== 'tersalurkan')) return false;
    const dateStr = p.tanggalPenyaluran || (p.updatedAt ? p.updatedAt.split('T')[0] : '');
    return dateStr === todayStr;
  }).length;

  const nextBatchRelease = '15 Juni 2026';

  // Apply Table Search & Filter controls
  const filteredQueue = validQueue.filter((item) => {
    const studentName = item.user?.nama?.toLowerCase() || '';
    const scholarshipTitle = item.beasiswa?.judul?.toLowerCase() || '';
    const matchesSearch = studentName.includes(searchQuery.toLowerCase()) || 
                          scholarshipTitle.includes(searchQuery.toLowerCase());

    const p = item.penyaluran_dana?.[0];
    const isVerified = p && (p.status === 'confirmed' || p.status === 'tersalurkan');

    if (selectedFilter === 'Semua') return matchesSearch;
    if (selectedFilter === 'Pending') return !isVerified && matchesSearch;
    if (selectedFilter === 'Verified') return isVerified && matchesSearch;
    return matchesSearch;
  });

  // 1. Fungsi exportToCSV(data)
  const exportToCSV = (data = filteredQueue) => {
    const headers = ['No', 'Nama Penerima', 'Email', 'Nama Bank', 'No Rekening', 'Nama Pemilik', 'Nominal (Rp)', 'Status'];
    const rows = data.map((item, index) => {
      const rek = item.user?.rekening?.[0];
      const bankName = rek?.namaBank || (rek?.namRekening ? rek.namRekening.split(' - ')[0]?.trim() : '—');
      const ownerName = rek?.namaPemilik || (rek?.namRekening ? rek.namRekening.split(' - ')[1]?.trim() : '—') || item.user?.nama || '—';
      const p = item.penyaluran_dana?.[0];
      const isVerified = p && (p.status === 'confirmed' || p.status === 'tersalurkan');
      const nominalFormatted = `Rp ${(item.beasiswa?.nominal || 0).toLocaleString('id-ID')}`;

      return [
        index + 1,
        item.user?.nama || '—',
        item.user?.email || '—',
        bankName,
        rek?.nomorRekening || '—',
        ownerName,
        nominalFormatted,
        isVerified ? 'Verified' : 'Pending',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `data-penerima-${todayStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Fungsi exportToExcel(data)
  const exportToExcel = (data = filteredQueue) => {
    const excelData = data.map((item, index) => {
      const rek = item.user?.rekening?.[0];
      const bankName = rek?.namaBank || (rek?.namRekening ? rek.namRekening.split(' - ')[0]?.trim() : '—');
      const ownerName = rek?.namaPemilik || (rek?.namRekening ? rek.namRekening.split(' - ')[1]?.trim() : '—') || item.user?.nama || '—';
      const p = item.penyaluran_dana?.[0];
      const isVerified = p && (p.status === 'confirmed' || p.status === 'tersalurkan');
      const nominalFormatted = `Rp ${(item.beasiswa?.nominal || 0).toLocaleString('id-ID')}`;

      return {
        'No': index + 1,
        'Nama Penerima': item.user?.nama || '—',
        'Email': item.user?.email || '—',
        'Nama Bank': bankName,
        'No Rekening': rek?.nomorRekening || '—',
        'Nama Pemilik': ownerName,
        'Nominal (Rp)': nominalFormatted,
        'Status': isVerified ? 'Verified' : 'Pending',
      };
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Penerima Beasiswa');
    XLSX.writeFile(wb, `data-penerima-${todayStr}.xlsx`);
  };

  // Action: Confirm & Send Batch (Mass Approve)
  const handleConfirmSendBatch = async () => {
    const pendingItems = validQueue.filter((item) => {
      const p = item.penyaluran_dana?.[0];
      return p && p.status === 'pending';
    });

    if (pendingItems.length === 0) {
      await showWarning('Perhatian', 'Tidak ada transaksi pending dalam antrean batch saat ini.');
      return;
    }

    const confirmMsg = `Apakah Anda yakin ingin menyetujui dan memproses pembayaran batch secara massal untuk ${pendingItems.length} transaksi pending senilai Rp ${totalAmountPending.toLocaleString('id-ID')}?\n\nAnda akan diminta untuk mengunggah 1 file bukti transfer untuk seluruh transaksi dalam batch ini.`;
    
    const result = await showConfirm('Konfirmasi Batch?', confirmMsg, 'Ya, Lanjutkan', 'Batal');
    if (result.isConfirmed) {
      batchFileInputRef.current?.click();
    }
  };

  // Prepare standard payload format needed by KonfirmasiTransferModal
  const handleInitiateClick = async (item) => {
    const p = item.penyaluran_dana?.[0];
    if (!p || !p.penyaluranId) {
      await showWarning('Perhatian', 'Data transaksi penyaluran belum berhasil dibuat atau sedang diproses. Silakan refresh halaman.');
      return;
    }
    
    // Construct standard penyaluran_dana structure for the modal
    const mockPenyaluran = {
      penyaluranId: p.penyaluranId,
      jumlahDana: p.jumlahDana || item.beasiswa?.nominal || 0,
      beasiswa: item.beasiswa,
      pendaftaran: {
        pendaftaranId: item.pendaftaranId,
        user: {
          nama: item.user?.nama,
          email: item.user?.email,
          rekening: item.user?.rekening || [],
        },
      },
    };

    setSelectedItemForModal(mockPenyaluran);
    setIsModalOpen(true);
  };

  return (
    <>
      <Head>
        <title>Instruksi Pembayaran · BantuBeasiswa</title>
        <meta
          name="description"
          content="Dashboard instruksi pembayaran beasiswa untuk pendonor. Kelola rekapitulasi antrean penyaluran dana beasiswa secara berkala."
        />
      </Head>

      <PendonorLayout user={{ nama: user.nama || 'Pendonor', role: 'pendonor' }}>
        {/* --- Header Section --- */}
        <div className="mb-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: C.gold }} />
              <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: C.dark }}>
                Instruksi Pembayaran
              </h1>
            </div>
            <p className="text-sm ml-4" style={{ color: C.gray }}>
              Rekapitulasi penerima beasiswa yang sudah LULUS seleksi dan siap ditransfer.
            </p>
          </div>

          {/* Action Top Bar */}
          <div className="flex items-center gap-3">
            <button
              id="export-csv-btn"
              onClick={() => exportToCSV()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold border rounded-lg bg-white shadow-sm transition-all duration-150 hover:bg-slate-50 active:scale-95"
              style={{ color: C.blue, borderColor: C.blue }}
            >
              📥 Export CSV
            </button>
            <button
              id="export-excel-btn"
              onClick={() => exportToExcel()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold border rounded-lg bg-white shadow-sm transition-all duration-150 hover:bg-slate-50 active:scale-95"
              style={{ color: C.green, borderColor: C.green }}
            >
              📊 Export Excel
            </button>
            <button
              id="confirm-batch-btn"
              disabled={isProcessingBatch}
              onClick={handleConfirmSendBatch}
              className="inline-flex items-center gap-2 px-4.5 py-2 text-sm font-bold text-white rounded-lg shadow-md transition-all duration-150 hover:shadow-lg active:scale-95"
              style={{ backgroundColor: isProcessingBatch ? C.gray : C.blue, cursor: isProcessingBatch ? 'not-allowed' : 'pointer' }}
            >
              {isProcessingBatch ? (
                <>
                  <span
                    style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid rgba(255,255,255,0.4)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  Memproses Batch...
                </>
              ) : (
                '🚀 Confirm & Send Batch'
              )}
            </button>
            <input
              ref={batchFileInputRef}
              type="file"
              onChange={handleBatchFileChange}
              style={{ display: 'none' }}
              accept=".png,.jpg,.jpeg,.pdf"
            />
          </div>
        </div>

        {/* --- Premium Stat Cards Section --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {/* Queue Total Card */}
          <div
            className="rounded-xl p-5 border bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            style={{ borderColor: C.border, borderTop: `4px solid ${C.blue}` }}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Queue Total
            </p>
            <p className="text-3xl font-extrabold" style={{ color: C.dark }}>
              {queueTotal} <span className="text-sm font-medium text-slate-400">Penerima</span>
            </p>
            <p className="text-xs text-slate-400 mt-2">Pendaftar LULUS & rekening terisi</p>
          </div>

          {/* Amount Pending Card */}
          <div
            className="rounded-xl p-5 border bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            style={{ borderColor: C.border, borderTop: `4px solid ${C.amber}` }}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Total Amount Pending
            </p>
            <p className="text-2xl font-extrabold text-amber-600">
              Rp {totalAmountPending.toLocaleString('id-ID')}
            </p>
            <p className="text-xs text-slate-400 mt-2.5">Akumulasi nominal yang belum ditransfer</p>
          </div>

          {/* Verified Today Card */}
          <div
            className="rounded-xl p-5 border bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            style={{ borderColor: C.border, borderTop: `4px solid ${C.green}` }}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Verified Today
            </p>
            <p className="text-3xl font-extrabold text-emerald-600">
              {verifiedToday} <span className="text-sm font-medium text-slate-400">Mahasiswa</span>
            </p>
            <p className="text-xs text-slate-400 mt-2">Dikonfirmasi selesai hari ini</p>
          </div>

          {/* Next Batch Card */}
          <div
            className="rounded-xl p-5 border bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            style={{ borderColor: C.border, borderTop: `4px solid ${C.gold}` }}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Next Batch Release
            </p>
            <p className="text-xl font-extrabold text-slate-700 mt-1">
              {nextBatchRelease}
            </p>
            <p className="text-xs text-slate-400 mt-3.5">Tanggal pelepasan batch berikutnya</p>
          </div>
        </div>

        {/* --- Disbursement Queue Table Section --- */}
        <div className="rounded-xl border bg-white overflow-hidden shadow-sm" style={{ borderColor: C.border }}>
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-5 border-b gap-4" style={{ borderColor: C.grayLight }}>
            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {['Semua', 'Pending', 'Verified'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-all shrink-0 active:scale-95"
                  style={{
                    backgroundColor: selectedFilter === filter ? C.blue : C.grayLight,
                    color: selectedFilter === filter ? C.white : C.gray,
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Cari nama mahasiswa / program..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
                style={{ borderColor: C.border, color: C.dark }}
              />
              <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">
                    Nama Mahasiswa
                  </th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">
                    Kategori Beasiswa
                  </th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">
                    Nama Bank + Nomor Rekening
                  </th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">
                    Nominal
                  </th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-center">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQueue.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-20 text-slate-400">
                      <div className="text-5xl mb-3">💸</div>
                      <p className="font-bold text-lg text-slate-700">Antrean Kosong</p>
                      <p className="text-xs max-w-sm mx-auto mt-1">Tidak ada data pendaftar yang memenuhi kriteria pencarian dan filter saat ini.</p>
                    </td>
                  </tr>
                ) : (
                  filteredQueue.map((item, idx) => {
                    const rek = item.user?.rekening?.[0];
                    let bankName = '—';
                    if (rek?.namRekening) {
                      bankName = rek.namRekening.split(' - ')[0]?.trim() || '—';
                    }

                    const p = item.penyaluran_dana?.[0];
                    const isVerified = p && (p.status === 'confirmed' || p.status === 'tersalurkan');

                    return (
                      <tr
                        key={item.pendaftaranId}
                        className="transition-colors hover:bg-slate-50/50"
                        style={{ backgroundColor: idx % 2 === 1 ? C.grayLight : C.white }}
                      >
                        {/* Nama Mahasiswa */}
                        <td className="px-6 py-4.5">
                          <p className="font-bold text-slate-900 leading-tight">
                            {item.user?.nama || '—'}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {item.user?.email || '—'}
                          </p>
                        </td>

                        {/* Kategori Beasiswa */}
                        <td className="px-6 py-4.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
                            🎓 {item.beasiswa?.judul || '—'}
                          </span>
                        </td>

                        {/* Nama Bank + No Rekening */}
                        <td className="px-6 py-4.5">
                          <p className="font-bold text-slate-700">{bankName}</p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{rek?.nomorRekening || '—'}</p>
                        </td>

                        {/* Nominal */}
                        <td className="px-6 py-4.5 font-bold text-slate-900 tabular-nums">
                          Rp {(item.beasiswa?.nominal || 0).toLocaleString('id-ID')}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4.5">
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold shadow-sm"
                            style={{
                              backgroundColor: isVerified ? C.greenBg : C.amberBg,
                              color: isVerified ? C.greenText : C.amberText,
                            }}
                          >
                            {isVerified ? 'Verified ✓' : 'Pending'}
                          </span>
                        </td>

                        {/* Aksi */}
                        <td className="px-6 py-4.5 text-center whitespace-nowrap">
                          {!isVerified ? (
                            <button
                              id={`initiate-btn-${item.pendaftaranId}`}
                              onClick={() => handleInitiateClick(item)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-lg shadow-sm transition-all duration-150 hover:shadow active:scale-95"
                              style={{ backgroundColor: C.blue }}
                            >
                              Initiate
                            </button>
                          ) : p?.buktiTransferUrl ? (
                            <a
                              id={`view-proof-btn-${item.pendaftaranId}`}
                              href={p.buktiTransferUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border rounded-lg transition-all duration-150 hover:bg-slate-50"
                              style={{ borderColor: C.blue, color: C.blue }}
                            >
                              📄 Lihat Bukti
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No Attachment</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Card Info */}
          <div className="px-6 py-4 border-t flex justify-between items-center text-xs text-slate-400" style={{ borderColor: C.border }}>
            <p>
              Menampilkan {filteredQueue.length} dari {queueTotal} penerima valid.
            </p>
            <p className="hidden sm:block">
              BantuBeasiswa Payments System • Real-Time Sync
            </p>
          </div>
        </div>
      </PendonorLayout>

      {/* Standard Confirmation Transfer Modal */}
      {selectedItemForModal && (
        <KonfirmasiTransferModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedItemForModal(null);
          }}
          penyaluran={selectedItemForModal}
          pendonorId={pendonorId}
          onSuccess={() => {
            refreshData();
          }}
        />
      )}
    </>
  );
}

// --- Next.js SSR Authorization Guard & Data Prefetching ---
export async function getServerSideProps(context) {
  const auth = withAuth(context, 'pendonor');
  if (auth.redirect) return auth;

  const { user } = auth.props;
  const supabaseClient = getServerSupabase();

  // 1. Resolve pendonorId matching accountId
  let pendonorId = user.userId;
  if (!pendonorId) {
    const { data } = await supabaseClient
      .from('pendonor')
      .select('pendonorId')
      .eq('accountId', user.accountId)
      .maybeSingle();
    pendonorId = data?.pendonorId ?? null;
  }

  if (!pendonorId) {
    return {
      props: {
        user,
        pendonorId: null,
        initialQueueList: [],
      },
    };
  }

  // 2. Fetch all beasiswa details for this donor
  const { data: beasiswaList } = await supabaseClient
    .from('beasiswa')
    .select('beasiswaId, judul, nominal')
    .eq('pendonorId', pendonorId);

  // Auto-heal logic: if any scholarship has a null or 0 nominal, resolve it from the seed defaults
  if (beasiswaList && beasiswaList.length > 0) {
    for (const b of beasiswaList) {
      if (b.nominal === null || b.nominal === 0) {
        let defaultNominal = 5000000;
        if (b.judul.includes('Afirmasi')) defaultNominal = 4000000;
        if (b.judul.includes('Inovasi')) defaultNominal = 6000000;

        await supabaseClient
          .from('beasiswa')
          .update({ nominal: defaultNominal })
          .eq('beasiswaId', b.beasiswaId);

        b.nominal = defaultNominal;
      }
    }
  }

  const beasiswaIds = (beasiswaList ?? []).map((b) => b.beasiswaId);

  if (beasiswaIds.length === 0) {
    return {
      props: {
        user,
        pendonorId,
        initialQueueList: [],
      },
    };
  }

  // 3. Fetch applications matching donor beasiswas with status LULUS and user + rekening
  const { data: pendaftaranList, error } = await supabaseClient
    .from('pendaftaran')
    .select(`
      pendaftaranId,
      status,
      createdAt,
      user:userId (
        userId,
        nama,
        email,
        rekening (
          rekeningId,
          namRekening,
          nomorRekening,
          namaBank,
          namaPemilik,
          status
        )
      ),
      beasiswa:beasiswaId (
        beasiswaId,
        judul,
        nominal
      ),
      penyaluran_dana (
        penyaluranId,
        status,
        jumlahDana,
        buktiTransferUrl,
        idTransaksi,
        tanggalPenyaluran,
        updatedAt
      )
    `)
    .in('beasiswaId', beasiswaIds)
    .eq('status', 'LULUS')
    .order('pendaftaranId', { ascending: false });

  if (error) {
    console.error('[dashboard-pembayaran getServerSideProps] Error fetching pendaftaran:', error);
  }

  // Auto-heal logic: ensure every LULUS application has a corresponding penyaluran_dana row.
  // Also correct any existing rows that have 0 amount due to the previous schema aliasing issue.
  if (pendaftaranList && pendaftaranList.length > 0) {
    // 1. Correct any existing entries with 0 amount
    const zeroAmountRecords = pendaftaranList.filter(
      (item) => item.penyaluran_dana?.[0] && item.penyaluran_dana[0].jumlahDana === 0 && item.beasiswa?.nominal > 0
    );

    if (zeroAmountRecords.length > 0) {
      for (const item of zeroAmountRecords) {
        const p = item.penyaluran_dana[0];
        await supabaseClient
          .from('penyaluran_dana')
          .update({ jumlahDana: item.beasiswa.nominal })
          .eq('penyaluranId', p.penyaluranId);
      }
    }

    // 2. Insert missing entries
    const missingPenyaluran = pendaftaranList.filter(
      (item) => !item.penyaluran_dana || item.penyaluran_dana.length === 0
    );

    if (missingPenyaluran.length > 0) {
      const inserts = missingPenyaluran.map((item) => ({
        pendonorId: pendonorId,
        beasiswaId: item.beasiswa.beasiswaId,
        pendaftaranId: item.pendaftaranId,
        jumlahDana: item.beasiswa.nominal || 0,
        jumlahPenerima: 1,
        status: 'pending',
      }));

      const { error: insertError } = await supabaseClient
        .from('penyaluran_dana')
        .insert(inserts);

      if (insertError) {
        console.error('[dashboard-pembayaran getServerSideProps] Error auto-creating penyaluran_dana:', insertError);
      }
    }

    // If we updated or inserted any records, perform a clean re-fetch to get the corrected database state
    if (zeroAmountRecords.length > 0 || missingPenyaluran.length > 0) {
      const { data: reFetchedList } = await supabaseClient
        .from('pendaftaran')
        .select(`
          pendaftaranId,
          status,
          createdAt,
          user:userId (
            userId,
            nama,
            email,
            rekening (
              rekeningId,
              namRekening,
              nomorRekening,
              namaBank,
              namaPemilik,
              status
            )
          ),
          beasiswa:beasiswaId (
            beasiswaId,
            judul,
            nominal
          ),
          penyaluran_dana (
            penyaluranId,
            status,
            jumlahDana,
            buktiTransferUrl,
            idTransaksi,
            tanggalPenyaluran,
            updatedAt
          )
        `)
          .in('beasiswaId', beasiswaIds)
          .eq('status', 'LULUS')
          .order('pendaftaranId', { ascending: false });

      if (reFetchedList) {
        const decryptedList = await decryptQueueRekeningList(reFetchedList);
        return {
          props: {
            user,
            pendonorId,
            initialQueueList: decryptedList,
          },
        };
      }
    }
  }

  return {
    props: {
      user,
      pendonorId,
      initialQueueList: await decryptQueueRekeningList(pendaftaranList || []),
    },
  };
}
