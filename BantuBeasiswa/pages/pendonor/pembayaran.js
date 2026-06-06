import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/db';
import { getServerSupabase } from '../../lib/supabaseServer';
import { withAuth } from '../../lib/auth';
import PendonorLayout from '../../components/layouts/PendonorLayout';
import KonfirmasiTransferModal from '../../components/KonfirmasiTransferModal';

const C = {
  blue: '#0056b3',
  gold: '#ffc107',
  dark: '#333333',
  light: '#f8f9fa',
  white: '#ffffff',
  gray: '#6b7280',
  green: '#059669',
  indigo: '#4f46e5',
  amber: '#d97706',
};

const STATUS_CONFIG = {
  pending: { bg: '#fffbeb', color: '#b45309', label: 'Pending' },
  confirmed: { bg: '#eff6ff', color: '#1d4ed8', label: 'Confirmed' },
  tersalurkan: { bg: '#ecfdf5', color: '#047857', label: 'Tersalurkan ✓' },
  gagal: { bg: '#fef2f2', color: '#b91c1c', label: 'Gagal' },
  diproses: { bg: '#f5f3ff', color: '#6d28d9', label: 'Diproses' },
};

function StatusBadge({ status }) {
  const s = STATUS_CONFIG[status] || { bg: '#f3f4f6', color: '#374151', label: status };
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

export default function PembayaranDashboard({ user, pendonorId, initialPenyaluranList }) {
  const router = useRouter();

  const [penyaluranList, setPenyaluranList] = useState(initialPenyaluranList || []);
  const [selectedFilter, setSelectedFilter] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePenyaluran, setActivePenyaluran] = useState(null);

  // Sync state if initial props change
  useEffect(() => {
    setPenyaluranList(initialPenyaluranList || []);
  }, [initialPenyaluranList]);

  // Refresh page data using Next.js routing
  const refreshData = () => {
    router.replace(router.asPath);
  };

  // Stats calculation
  const totalDanaPending = penyaluranList
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + (p.jumlahDana || 0), 0);

  const totalDanaConfirmed = penyaluranList
    .filter(p => p.status === 'confirmed' || p.status === 'tersalurkan')
    .reduce((sum, p) => sum + (p.jumlahDana || 0), 0);

  const totalDisbursedCount = penyaluranList.filter(p => p.status === 'tersalurkan').length;
  const totalPendingCount = penyaluranList.filter(p => p.status === 'pending').length;

  // Filters logic
  const filteredList = penyaluranList.filter((item) => {
    const programTitle = item.beasiswa?.judul?.toLowerCase() || '';
    const matchesSearch = programTitle.includes(searchQuery.toLowerCase()) || (item.idTransaksi || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedFilter === 'Semua') return matchesSearch;
    if (selectedFilter === 'Pending') return item.status === 'pending' && matchesSearch;
    if (selectedFilter === 'Confirmed') return item.status === 'confirmed' && matchesSearch;
    if (selectedFilter === 'Tersalurkan') return item.status === 'tersalurkan' && matchesSearch;
    return matchesSearch;
  });

  return (
    <>
      <Head>
        <title>Pembayaran Beasiswa · BantuBeasiswa</title>
        <meta
          name="description"
          content="Dashboard konfirmasi transfer dan penyaluran dana beasiswa."
        />
      </Head>

      <PendonorLayout user={{ nama: user.nama || 'Pendonor', role: 'pendonor' }}>
        {/* ── Header ── */}
        <div className="mb-7">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-7 rounded-full" style={{ backgroundColor: C.gold }} />
            <h1 className="text-2xl font-extrabold" style={{ color: C.dark }}>
              Pembayaran Beasiswa
            </h1>
          </div>
          <p className="text-sm ml-4" style={{ color: C.gray }}>
            Kelola rincian transfer dana dan konfirmasi bukti pembayaran penyaluran beasiswa Anda.
          </p>
        </div>

        {/* ── Stats Summary Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {/* Card 1: Pending Amount */}
          <div
            className="rounded-xl p-5 border bg-white transition-all duration-200 hover:shadow-md"
            style={{ borderColor: '#e5e7eb', borderTop: `4px solid ${C.amber}` }}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Dana Belum Dikonfirmasi
            </p>
            <p className="text-2xl font-extrabold text-amber-700">
              Rp {totalDanaPending.toLocaleString('id-ID')}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              {totalPendingCount} transaksi menunggu bukti transfer
            </p>
          </div>

          {/* Card 2: Confirmed Amount */}
          <div
            className="rounded-xl p-5 border bg-white transition-all duration-200 hover:shadow-md"
            style={{ borderColor: '#e5e7eb', borderTop: `4px solid ${C.green}` }}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Dana Sudah Dikonfirmasi
            </p>
            <p className="text-2xl font-extrabold text-emerald-700">
              Rp {totalDanaConfirmed.toLocaleString('id-ID')}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Total dana terverifikasi oleh pendonor
            </p>
          </div>

          {/* Card 3: Pending Count */}
          <div
            className="rounded-xl p-5 border bg-white transition-all duration-200 hover:shadow-md"
            style={{ borderColor: '#e5e7eb', borderTop: `4px solid ${C.blue}` }}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Penyaluran Pending
            </p>
            <p className="text-2xl font-extrabold text-blue-700">{totalPendingCount}</p>
            <p className="text-xs text-gray-400 mt-2">Program beasiswa menunggu konfirmasi</p>
          </div>

          {/* Card 4: Disbursed Count */}
          <div
            className="rounded-xl p-5 border bg-white transition-all duration-200 hover:shadow-md"
            style={{ borderColor: '#e5e7eb', borderTop: `4px solid ${C.indigo}` }}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Tersalurkan Penuh
            </p>
            <p className="text-2xl font-extrabold text-indigo-700">{totalDisbursedCount}</p>
            <p className="text-xs text-gray-400 mt-2">Selesai terdistribusikan ke mahasiswa</p>
          </div>
        </div>

        {/* ── Main Content Area ── */}
        <div className="rounded-xl border bg-white overflow-hidden shadow-sm" style={{ borderColor: '#e5e7eb' }}>
          {/* Action and Filter Controls */}
          <div className="flex flex-col md:flex-row items-center justify-between p-5 border-b gap-4" style={{ borderColor: '#f3f4f6' }}>
            {/* Filter Tabs */}
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              {['Semua', 'Pending', 'Confirmed', 'Tersalurkan'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-all shrink-0"
                  style={{
                    backgroundColor: selectedFilter === filter ? C.blue : '#f3f4f6',
                    color: selectedFilter === filter ? C.white : C.gray,
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <input
                type="text"
                placeholder="Cari program beasiswa / ID transaksi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100"
                style={{ borderColor: '#d1d5db', color: C.dark }}
              />
              <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th className="px-6 py-4 font-semibold text-xs uppercase text-gray-500 tracking-wider">
                    Nama Program Beasiswa
                  </th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase text-gray-500 tracking-wider">
                    Total Dana
                  </th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase text-gray-500 tracking-wider">
                    Penerima
                  </th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase text-gray-500 tracking-wider">
                    Tanggal Penyaluran
                  </th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase text-gray-500 tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase text-gray-500 tracking-wider text-center">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-16 text-gray-400">
                      <div className="text-4xl mb-2">💸</div>
                      <p className="font-semibold text-base text-gray-600">Tidak ada data penyaluran</p>
                      <p className="text-xs">Data transaksi penyaluran tidak ditemukan untuk filter ini.</p>
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item, idx) => (
                    <tr
                      key={item.penyaluranId}
                      className="transition-colors hover:bg-slate-50"
                      style={{ backgroundColor: idx % 2 === 1 ? '#f9fafb' : C.white }}
                    >
                      {/* Nama Program */}
                      <td className="px-6 py-4.5">
                        <p className="font-bold text-gray-900 leading-snug">{item.beasiswa?.judul}</p>
                        {item.idTransaksi && (
                          <p className="text-xs text-gray-400 mt-1">ID Transaksi: {item.idTransaksi}</p>
                        )}
                      </td>

                      {/* Total Dana */}
                      <td className="px-6 py-4.5 font-bold text-gray-900 tabular-nums">
                        Rp {item.jumlahDana?.toLocaleString('id-ID')}
                      </td>

                      {/* Penerima */}
                      <td className="px-6 py-4.5 font-semibold text-gray-600">
                        {item.jumlahPenerima} Mahasiswa
                      </td>

                      {/* Tanggal Penyaluran */}
                      <td className="px-6 py-4.5 text-gray-600">
                        {item.tanggalPenyaluran ? (
                          new Date(item.tanggalPenyaluran).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        ) : (
                          <span className="text-gray-400 font-medium">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4.5">
                        <StatusBadge status={item.status} />
                      </td>

                      {/* Action Button */}
                      <td className="px-6 py-4.5 text-center">
                        {item.status === 'pending' ? (
                          <button
                            onClick={() => {
                              setActivePenyaluran(item);
                              setIsModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-lg transition-all hover:shadow-md active:scale-95"
                            style={{ backgroundColor: C.blue }}
                          >
                            Initiate
                          </button>
                        ) : item.buktiTransferUrl ? (
                          <a
                            href={item.buktiTransferUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold border rounded-lg transition-colors"
                            style={{ borderColor: C.blue, color: C.blue }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#f0f7ff';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <span>📄</span> Lihat Bukti
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Tidak ada bukti</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Card */}
          <div className="px-6 py-4 border-t flex justify-end" style={{ borderColor: '#f3f4f6' }}>
            <p className="text-xs text-gray-400">
              Menampilkan {filteredList.length} dari {penyaluranList.length} transaksi penyaluran dana.
            </p>
          </div>
        </div>
      </PendonorLayout>

      {/* Modal Konfirmasi Transfer */}
      <KonfirmasiTransferModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setActivePenyaluran(null);
        }}
        penyaluran={activePenyaluran}
        pendonorId={pendonorId}
        onSuccess={() => {
          // Refresh data dari server side setelah transaksi sukses
          refreshData();
        }}
      />
    </>
  );
}

export async function getServerSideProps(context) {
  const auth = withAuth(context, 'pendonor');
  if (auth.redirect) return auth;

  const { user } = auth.props;
  const supabaseClient = getServerSupabase();

  // Resolve pendonorId
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
        initialPenyaluranList: [],
      },
    };
  }

  // Fetch penyaluran_dana + relation beasiswa
  const { data: penyaluranList, error } = await supabaseClient
    .from('penyaluran_dana')
    .select(`
      *,
      beasiswa (
        beasiswaId,
        judul,
        nominal
      )
    `)
    .eq('pendonorId', pendonorId)
    .order('penyaluranId', { ascending: false });

  if (error) {
    console.error('[PembayaranDashboard getServerSideProps] Error fetching penyaluran_dana:', error);
  }

  return {
    props: {
      user,
      pendonorId,
      initialPenyaluranList: penyaluranList || [],
    },
  };
}
