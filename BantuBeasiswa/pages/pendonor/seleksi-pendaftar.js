import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import PendonorLayout from '../../components/layouts/PendonorLayout';
import { withAuth } from '../../lib/auth';

// ─── Color tokens ─────────────────────────────────────────────────────────────
const C = {
  blue  : '#0056b3',
  gold  : '#ffc107',
  dark  : '#333333',
  light : '#f8f9fa',
  white : '#ffffff',
  gray  : '#6b7280',
  green : '#10b981',
  red   : '#ef4444',
  yellow: '#f59e0b',
};

// Status Pendaftaran configuration
const REG_STATUS_CONFIG = {
  TERDAFTAR: { label: 'Terdaftar', bg: '#eff6ff', text: '#1d4ed8' },
  REVIEW   : { label: 'Review', bg: '#fefce8', text: '#854d0e' },
  EXAM     : { label: 'Ujian (Exam)', bg: '#ede9fe', text: '#7c3aed' },
  LULUS    : { label: 'Lulus', bg: '#d1fae5', text: '#065f46' },
  DITOLAK  : { label: 'Ditolak', bg: '#fee2e2', text: '#b91c1c' },
  TOLAK    : { label: 'Ditolak', bg: '#fee2e2', text: '#b91c1c' },
  DITERIMA : { label: 'Diterima', bg: '#d1fae5', text: '#065f46' },
};

// Resolves file URL gracefully (supporting public storage folders and full URLs)
function resolveFileUrl(url) {
  if (!url) return '#';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('/')) return url;
  return '/' + url;
}

function splitNamRekening(namRekening = '') {
  if (!namRekening.includes(' - ')) {
    return { namaBank: '', namaPemilik: namRekening };
  }

  const [namaBank, ...namaPemilikParts] = namRekening.split(' - ');
  return {
    namaBank,
    namaPemilik: namaPemilikParts.join(' - '),
  };
}

function RekeningPenerimaCard({ rekening }) {
  const hasRekening = Boolean(rekening);
  const fallback = splitNamRekening(rekening?.namRekening || '');
  const namaBank = rekening?.namaBank || fallback.namaBank || '-';
  const namaPemilik = rekening?.namaPemilik || fallback.namaPemilik || rekening?.namRekening || '-';
  const fotoBukuUrl = rekening?.fotoBukuUrl || '';

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-gray-800">
          Informasi Rekening Penerima
        </h4>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
            hasRekening
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}
        >
          {hasRekening ? 'Sudah daftar' : 'Belum daftar'}
        </span>
      </div>

      {hasRekening ? (
        <div className="grid gap-4 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
              Bank
            </p>
            <p className="mt-1 break-words font-semibold text-gray-800">
              {namaBank}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
              Nama Pemilik
            </p>
            <p className="mt-1 break-words font-semibold text-gray-800">
              {namaPemilik}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
              Nomor Rekening
            </p>
            <p className="mt-1 break-all font-mono font-semibold text-gray-800">
              {rekening.nomorRekening || '-'}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
              Status
            </p>
            <p className="mt-1">
              <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                {rekening.status || '-'}
              </span>
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
              Buku Rekening
            </p>
            {fotoBukuUrl ? (
              <a
                href={resolveFileUrl(fotoBukuUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                Lihat Foto
              </a>
            ) : (
              <p className="mt-1 text-sm text-gray-400">Belum ada foto</p>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 text-sm text-gray-500">
          Mahasiswa belum mengirim data rekening daftar ulang.
        </div>
      )}
    </div>
  );
}

export default function SeleksiPendaftarPage({ user }) {
  const router = useRouter();
  
  // State variables
  const [programs, setPrograms] = useState([]);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  
  const [applicants, setApplicants] = useState([]);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Flag Document Modal State
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [flagDoc, setFlagDoc] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Mobile responsive view toggle (true = show Verification Desk, false = show Queue list)
  const [mobileShowDesk, setMobileShowDesk] = useState(false);

  // ── Fetch all programs on load ──────────────────────────────────────────────
  useEffect(() => {
    async function fetchPrograms() {
      try {
        setLoadingPrograms(true);
        const res = await fetch('/api/pendonor/beasiswa');
        const json = await res.json();
        
        if (res.ok) {
          const list = json.data || [];
          setPrograms(list);
          
          // Determine initial program selection
          const queryId = router.query.beasiswaId;
          if (queryId && list.some(p => String(p.beasiswaId) === String(queryId))) {
            setSelectedProgramId(String(queryId));
          } else if (list.length > 0) {
            setSelectedProgramId(String(list[0].beasiswaId));
          }
        } else {
          setErrorMsg(json.message || 'Gagal memuat program beasiswa');
        }
      } catch (err) {
        console.error('Fetch programs error:', err);
        setErrorMsg('Terjadi kesalahan koneksi saat memuat program.');
      } finally {
        setLoadingPrograms(false);
      }
    }
    fetchPrograms();
  }, [router.query.beasiswaId]);

  // ── Fetch applicants when selected program changes ──────────────────────────
  useEffect(() => {
    if (!selectedProgramId) return;

    async function fetchApplicants() {
      try {
        setLoadingApplicants(true);
        setErrorMsg('');
        const res = await fetch(`/api/pendonor/seleksi/list?beasiswaId=${selectedProgramId}`);
        const json = await res.json();
        
        if (res.ok) {
          const list = json.data || [];
          setApplicants(list);
          
          // Automatically select first applicant if any
          if (list.length > 0) {
            setSelectedApplicant(list[0]);
          } else {
            setSelectedApplicant(null);
          }
        } else {
          setErrorMsg(json.message || 'Gagal memuat daftar pendaftar');
        }
      } catch (err) {
        console.error('Fetch applicants error:', err);
        setErrorMsg('Terjadi kesalahan koneksi saat memuat daftar pendaftar.');
      } finally {
        setLoadingApplicants(false);
      }
    }

    // Update query param in URL without reload for better UX
    router.replace({
      pathname: router.pathname,
      query: { beasiswaId: selectedProgramId }
    }, undefined, { shallow: true });

    fetchApplicants();
    setMobileShowDesk(false);
  }, [selectedProgramId]);

  // ── Handle Approve Document ──────────────────────────────────────────────────
  const handleApproveDocument = async (dokumenId) => {
    try {
      const res = await fetch('/api/pendonor/seleksi/document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dokumenId,
          statusDokumen: 'TRUE',
        }),
      });
      const json = await res.json();
      
      if (res.ok) {
        // Update document state locally
        updateLocalDocState(dokumenId, 'TRUE', null);
      } else {
        alert(json.message || 'Gagal menyetujui dokumen');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan.');
    }
  };

  // ── Handle Open Flag Issue Modal ─────────────────────────────────────────────
  const openFlagModal = (doc) => {
    setFlagDoc(doc);
    setRejectionReason(doc.rejectionReason || '');
    setFlagModalOpen(true);
  };

  // ── Handle Submit Flag Issue ─────────────────────────────────────────────────
  const handleFlagDocument = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      alert('Alasan penolakan wajib diisi');
      return;
    }

    try {
      const res = await fetch('/api/pendonor/seleksi/document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dokumenId: flagDoc.dokumenId,
          statusDokumen: 'FALSE',
          rejectionReason: rejectionReason.trim(),
        }),
      });
      const json = await res.json();
      
      if (res.ok) {
        updateLocalDocState(flagDoc.dokumenId, 'FALSE', rejectionReason.trim());
        setFlagModalOpen(false);
        setFlagDoc(null);
        setRejectionReason('');
      } else {
        alert(json.message || 'Gagal memberi flag pada dokumen');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan.');
    }
  };

  // Helper to update state locally after document actions
  const updateLocalDocState = (dokumenId, status, reason) => {
    const updatedApplicants = applicants.map(app => {
      if (app.pendaftaranId === selectedApplicant.pendaftaranId) {
        const updatedDocs = app.dokumen.map(d => {
          if (d.dokumenId === dokumenId) {
            return { ...d, statusDokumen: status, rejectionReason: reason };
          }
          return d;
        });
        const updatedApp = { ...app, dokumen: updatedDocs };
        
        // Also update the active selectedApplicant
        if (selectedApplicant.pendaftaranId === app.pendaftaranId) {
          setSelectedApplicant(updatedApp);
        }
        return updatedApp;
      }
      return app;
    });
    setApplicants(updatedApplicants);
  };

  // ── Handle Registration Action (Verify, Request Revision, Reject, Batch Verify) ──
  const handleRegistrationAction = async (action) => {
    const actionLabel = {
      reject: 'menolak pendaftaran ini',
      revision: 'meminta revisi berkas pendaftaran',
      verify: 'meloloskan pendaftaran ini (LULUS)',
      batch_verify: 'menyetujui semua dokumen dan meloloskan pendaftaran ini (LULUS)'
    }[action];

    const confirmMsg = action === 'batch_verify'
      ? 'Apakah Anda yakin ingin menyetujui semua dokumen dan meloloskan pendaftaran ini?'
      : `Apakah Anda yakin ingin ${actionLabel}?`;

    if (!confirm(confirmMsg)) {
      return;
    }

    try {
      const res = await fetch('/api/pendonor/seleksi/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pendaftaranId: selectedApplicant.pendaftaranId,
          action,
        }),
      });
      const json = await res.json();
      
      if (res.ok) {
        const newStatus = json.data.status;
        
        // Update local applicants list
        const updatedApplicants = applicants.map(app => {
          if (app.pendaftaranId === selectedApplicant.pendaftaranId) {
            let updatedDocs = app.dokumen;
            if (action === 'batch_verify') {
              updatedDocs = app.dokumen.map(d => ({
                ...d,
                statusDokumen: 'TRUE',
                rejectionReason: null
              }));
            }
            const updatedApp = { ...app, status: newStatus, dokumen: updatedDocs };
            if (selectedApplicant.pendaftaranId === app.pendaftaranId) {
              setSelectedApplicant(updatedApp);
            }
            return updatedApp;
          }
          return app;
        });
        
        setApplicants(updatedApplicants);
        alert(action === 'batch_verify'
          ? 'Berhasil: Semua dokumen disetujui dan status pendaftaran diubah menjadi LULUS'
          : `Berhasil: Status pendaftaran diubah menjadi ${newStatus}`
        );
      } else {
        alert(json.message || 'Gagal mengubah status pendaftaran');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan.');
    }
  };

  return (
    <>
      <Head>
        <title>Verifikasi Berkas Pendaftar · BantuBeasiswa</title>
        <meta name="description" content="Dashboard verifikasi berkas pendaftar beasiswa untuk pendonor. Tinjau dokumen KTP, transkrip, dan berkas lainnya secara real-time." />
      </Head>

      <PendonorLayout user={user}>
        {/* ── Page Header & Program Selector ─────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-1 h-7 rounded-full" style={{ backgroundColor: C.gold }} />
              <h1 className="text-2xl font-extrabold" style={{ color: C.dark }}>
                Verifikasi Berkas Pendaftar
              </h1>
            </div>
            <p className="text-sm ml-4" style={{ color: C.gray }}>
              Tinjau berkas pendaftaran calon penerima beasiswa secara real-time
            </p>
          </div>

          {/* Program Select Dropdown */}
          <div className="min-w-64 max-w-sm">
            {loadingPrograms ? (
              <div className="h-10 w-full bg-gray-200 animate-pulse rounded-lg" />
            ) : (
              <div className="relative">
                <select
                  id="scholarship-program-select"
                  value={selectedProgramId}
                  onChange={(e) => setSelectedProgramId(e.target.value)}
                  className="w-full pl-3 pr-8 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                  style={{ color: C.dark }}
                >
                  <option value="" disabled>Pilih Program Beasiswa</option>
                  {programs.map((p) => (
                    <option key={p.beasiswaId} value={p.beasiswaId}>
                      {p.judul}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                  ▼
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Error Messages ──────────────────────────────────────────────── */}
        {errorMsg && (
          <div className="p-4 mb-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── Main Two-Panel Layout ────────────────────────────────────────── */}
        {!selectedProgramId ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">🎓</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Pilih Program Beasiswa</h3>
            <p className="text-sm text-gray-500">Silakan pilih program beasiswa di dropdown pojok kanan atas untuk mulai verifikasi berkas.</p>
          </div>
        ) : loadingApplicants ? (
          /* Loading Skeleton Grid */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-14rem)] min-h-[500px]">
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-6 w-1/3 bg-gray-200 rounded mb-4" />
              <div className="h-24 w-full bg-gray-100 rounded mb-6" />
              <div className="space-y-4">
                <div className="h-10 bg-gray-100 rounded" />
                <div className="h-10 bg-gray-100 rounded" />
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="h-5 w-1/2 bg-gray-200 rounded mb-4" />
              <div className="space-y-3">
                <div className="h-14 bg-gray-100 rounded" />
                <div className="h-14 bg-gray-100 rounded" />
                <div className="h-14 bg-gray-100 rounded" />
              </div>
            </div>
          </div>
        ) : applicants.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">📂</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Belum Ada Pendaftar</h3>
            <p className="text-sm text-gray-500">Belum ada mahasiswa yang mengirimkan pendaftaran untuk program beasiswa ini.</p>
          </div>
        ) : (
          /* Verification Workspace Grid */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-14rem)] min-h-[500px] overflow-hidden items-stretch">
            
            {/* ── PANEL 1: Verification Desk (Left/Center - 2/3 width) ─────── */}
            <div 
              className={`lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden ${
                mobileShowDesk ? 'flex' : 'hidden lg:flex'
              }`}
            >
              {selectedApplicant ? (
                <>
                  {/* Verification Desk Header */}
                  <div className="px-6 py-4 border-b border-gray-200 bg-[#f9fafb] flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-bold text-gray-800 truncate">
                          {selectedApplicant.user?.nama}
                        </h2>
                        <span className="text-xs px-2 py-0.5 font-semibold text-gray-500 bg-gray-100 rounded-md">
                          ID Pendaftaran: #{selectedApplicant.pendaftaranId}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        📧 {selectedApplicant.user?.email} &nbsp;•&nbsp; ⏰ Terdaftar: {new Date(selectedApplicant.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {/* Back Button (Mobile only) */}
                    <button
                      id="back-to-queue-btn"
                      onClick={() => setMobileShowDesk(false)}
                      className="lg:hidden text-sm font-semibold px-3 py-1.5 border rounded-lg bg-white shadow-sm"
                      style={{ color: C.blue, borderColor: '#e5e7eb' }}
                    >
                      ← Antrean
                    </button>
                  </div>

                  {/* Verification Desk Body */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* System Pre-Check Section */}
                    <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                        System Pre-Check (Automated Info)
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-xs font-semibold text-emerald-800">
                          <span className="text-emerald-500 text-sm">✔</span>
                          <span>Format KTP & Dokumen Valid (PDF/Image)</span>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-xs font-semibold text-emerald-800">
                          <span className="text-emerald-500 text-sm">✔</span>
                          <span>IPK Terbaca & Memenuhi Syarat</span>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-xs font-semibold text-emerald-800">
                          <span className="text-emerald-500 text-sm">✔</span>
                          <span>Kelengkapan Berkas (100%)</span>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-xs font-semibold text-emerald-800">
                          <span className="text-emerald-500 text-sm">✔</span>
                          <span>Bebas dari Terdeteksi Beasiswa Ganda</span>
                        </div>
                      </div>
                    </div>

                    {/* Documents List */}
                    <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                        Daftar Dokumen Pendaftar
                      </h3>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold uppercase text-gray-500">
                              <th className="px-4 py-3">Jenis Dokumen</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedApplicant.dokumen?.length === 0 ? (
                              <tr>
                                <td colSpan="3" className="px-4 py-8 text-center text-gray-500">
                                  Belum ada dokumen yang diunggah.
                                </td>
                              </tr>
                            ) : (
                              selectedApplicant.dokumen?.map((doc) => (
                                <tr key={doc.dokumenId} className="border-b border-gray-100 hover:bg-gray-50/50">
                                  <td className="px-4 py-3.5 font-medium text-gray-800">
                                    <div className="flex flex-col">
                                      <span>{doc.jenis === 'ktp' ? 'KTP' : doc.jenis === 'transkrip' ? 'Transkrip Nilai' : doc.jenis === 'motivation_letter' ? 'Motivation Letter' : doc.jenis}</span>
                                      {doc.statusDokumen === 'FALSE' && doc.rejectionReason && (
                                        <span className="text-xs text-red-500 font-normal mt-0.5">
                                          Masalah: &quot;{doc.rejectionReason}&quot;
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    {doc.statusDokumen === 'TRUE' && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                                        Disetujui
                                      </span>
                                    )}
                                    {doc.statusDokumen === 'FALSE' && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                                        Bermasalah
                                      </span>
                                    )}
                                    {doc.statusDokumen === 'MENUNGGU' && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                        Menunggu
                                      </span>
                                    )}
                                    {doc.statusDokumen === 'EXAM' && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                        Ujian (Exam)
                                      </span>
                                    )}
                                    {doc.statusDokumen === 'NILAI' && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                        Penilaian
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3.5 text-right space-x-1 whitespace-nowrap">
                                    {/* View Button */}
                                    <a
                                      id={`view-doc-btn-${doc.jenis}-${doc.dokumenId}`}
                                      href={resolveFileUrl(doc.error)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-100 transition shadow-sm text-gray-700 bg-white"
                                    >
                                      View
                                    </a>

                                    {/* Approve Button */}
                                    <button
                                      id={`approve-doc-btn-${doc.jenis}-${doc.dokumenId}`}
                                      onClick={() => handleApproveDocument(doc.dokumenId)}
                                      className={`inline-flex items-center px-3 py-1.5 border rounded-lg text-xs font-semibold transition shadow-sm ${
                                        doc.statusDokumen === 'TRUE'
                                          ? 'bg-green-600 border-green-600 text-white cursor-default'
                                          : 'border-green-200 hover:bg-green-50 text-green-700 bg-white'
                                      }`}
                                      disabled={doc.statusDokumen === 'TRUE'}
                                    >
                                      Approve
                                    </button>

                                    {/* Flag Button */}
                                    <button
                                      id={`flag-doc-btn-${doc.jenis}-${doc.dokumenId}`}
                                      onClick={() => openFlagModal(doc)}
                                      className={`inline-flex items-center px-3 py-1.5 border rounded-lg text-xs font-semibold transition shadow-sm ${
                                        doc.statusDokumen === 'FALSE'
                                          ? 'bg-red-600 border-red-600 text-white'
                                          : 'border-red-200 hover:bg-red-50 text-red-700 bg-white'
                                      }`}
                                    >
                                      Flag Issue
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {selectedApplicant.status === 'LULUS' && (
                      <RekeningPenerimaCard rekening={selectedApplicant.rekening} />
                    )}
                  </div>

                  {/* Verification Desk Footer - Overall Actions */}
                  <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between flex-wrap gap-3">
                    <div className="text-sm font-semibold text-gray-600">
                      Status Pendaftaran saat ini:{' '}
                      <span 
                        className="px-2.5 py-0.5 rounded-full text-xs" 
                        style={{ 
                          backgroundColor: REG_STATUS_CONFIG[selectedApplicant.status]?.bg || '#f3f4f6', 
                          color: REG_STATUS_CONFIG[selectedApplicant.status]?.text || '#374151' 
                        }}
                      >
                        {REG_STATUS_CONFIG[selectedApplicant.status]?.label || selectedApplicant.status}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {/* Reject Button */}
                      <button
                        id="reject-registration-btn"
                        onClick={() => handleRegistrationAction('reject')}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-red-700 transition active:scale-95 disabled:opacity-50"
                        disabled={selectedApplicant.status === 'DITOLAK' || selectedApplicant.status === 'LULUS'}
                      >
                        Reject
                      </button>

                      {/* Request Revision Button */}
                      <button
                        id="request-revision-btn"
                        onClick={() => handleRegistrationAction('revision')}
                        className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-bold shadow-md hover:bg-yellow-600 transition active:scale-95 disabled:opacity-50"
                        disabled={selectedApplicant.status === 'DITOLAK' || selectedApplicant.status === 'LULUS'}
                      >
                        Request Revision
                      </button>

                      {/* Verify Button (PBI-24) */}
                      <button
                        id="verify-registration-btn"
                        onClick={() => handleRegistrationAction('verify')}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-emerald-700 transition active:scale-95 disabled:opacity-50"
                        disabled={selectedApplicant.status === 'LULUS' || selectedApplicant.status === 'DITOLAK'}
                      >
                        Verify Pendaftaran
                      </button>

                      {/* Batch Verify Button (PBI-24) */}
                      <button
                        id="batch-verify-registration-btn"
                        onClick={() => handleRegistrationAction('batch_verify')}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-indigo-700 transition active:scale-95 disabled:opacity-50"
                        disabled={selectedApplicant.status === 'LULUS' || selectedApplicant.status === 'DITOLAK'}
                      >
                        Batch Verify
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500">
                  <div className="text-5xl mb-4">👥</div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1">Pilih Pendaftar</h3>
                  <p className="text-sm max-w-md">Silakan pilih salah satu nama pendaftar di daftar antrean sebelah kanan untuk memulai peninjauan berkas pendaftaran.</p>
                </div>
              )}
            </div>

            {/* ── PANEL 2: Active Queue Sidebar (Right - 1/3 width) ────────── */}
            <div 
              className={`bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden ${
                mobileShowDesk ? 'hidden lg:flex' : 'flex'
              }`}
            >
              {/* Sidebar Header */}
              <div className="px-5 py-4 border-b border-gray-200 bg-[#f9fafb] flex items-center justify-between">
                <h2 className="font-bold text-base" style={{ color: C.dark }}>
                  Active Queue
                </h2>
                <span className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                  {applicants.length} Antrean
                </span>
              </div>

              {/* Sidebar Queue List */}
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {applicants.map((app) => {
                  const isActive = selectedApplicant && selectedApplicant.pendaftaranId === app.pendaftaranId;
                  const totalDocs = app.dokumen?.length || 0;
                  const approvedDocs = app.dokumen?.filter(d => d.statusDokumen === 'TRUE').length || 0;
                  const hasIssues = app.dokumen?.some(d => d.statusDokumen === 'FALSE');
                  
                  return (
                    <div
                      id={`queue-item-${app.pendaftaranId}`}
                      key={app.pendaftaranId}
                      onClick={() => {
                        setSelectedApplicant(app);
                        setMobileShowDesk(true);
                      }}
                      className={`p-4 transition-all duration-200 cursor-pointer flex flex-col gap-2 ${
                        isActive 
                          ? 'bg-blue-50/70 border-l-4 border-blue-600 pl-3' 
                          : 'hover:bg-gray-50 border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-gray-800 truncate">
                            {app.user?.nama}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            ID: #{app.pendaftaranId} • {new Date(app.createdAt).toLocaleDateString('id-ID')}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <span 
                          className="px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0"
                          style={{ 
                            backgroundColor: REG_STATUS_CONFIG[app.status]?.bg || '#f3f4f6', 
                            color: REG_STATUS_CONFIG[app.status]?.text || '#374151' 
                          }}
                        >
                          {REG_STATUS_CONFIG[app.status]?.label || app.status}
                        </span>
                      </div>

                      {/* Documents Progress Indicator */}
                      <div className="flex items-center justify-between text-xs mt-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400">📄 {totalDocs} Dokumen</span>
                          {totalDocs > 0 && (
                            <span className="text-[10px] text-gray-500">
                              ({approvedDocs} disetujui)
                            </span>
                          )}
                        </div>

                        {/* Warnings or Success indicators */}
                        {hasIssues ? (
                          <span className="text-[10px] text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded font-bold">
                            ⚠️ Bermasalah
                          </span>
                        ) : approvedDocs === totalDocs && totalDocs > 0 ? (
                          <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
                            ✓ Siap Verif
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* ── Flag Issue Modal ─────────────────────────────────────────────── */}
        {flagModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full shadow-lg border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-gray-200 bg-[#f9fafb] flex justify-between items-center">
                <h3 className="font-bold text-gray-800">
                  Flag Masalah Dokumen
                </h3>
                <button
                  id="close-flag-modal-top-btn"
                  onClick={() => {
                    setFlagModalOpen(false);
                    setFlagDoc(null);
                  }}
                  className="text-2xl leading-none text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleFlagDocument}>
                <div className="p-6 space-y-4">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Tandai dokumen <strong className="text-gray-700">{flagDoc?.jenis === 'ktp' ? 'KTP' : flagDoc?.jenis === 'transkrip' ? 'Transkrip Nilai' : flagDoc?.jenis === 'motivation_letter' ? 'Motivation Letter' : flagDoc?.jenis}</strong> sebagai bermasalah. Tulis alasan penolakan di bawah agar pendaftar dapat memperbaikinya.
                  </p>

                  <div>
                    <label htmlFor="rejection-reason-textarea" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Alasan Penolakan / Masalah *
                    </label>
                    <textarea
                      id="rejection-reason-textarea"
                      rows="4"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Contoh: Format foto KTP blur, harap unggah kembali scan KTP dalam format PDF yang jelas."
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                      style={{ color: '#000000' }}
                      required
                    />
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
                  <button
                    id="cancel-flag-modal-btn"
                    type="button"
                    onClick={() => {
                      setFlagModalOpen(false);
                      setFlagDoc(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-100 transition shadow-sm text-gray-700 bg-white"
                  >
                    Batal
                  </button>
                  <button
                    id="submit-flag-modal-btn"
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-red-700 transition"
                  >
                    Flag Dokumen
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </PendonorLayout>
    </>
  );
}

// ─── SSR Auth Guard ───────────────────────────────────────────────────────────
export async function getServerSideProps(context) {
  return withAuth(context, 'pendonor');
}
