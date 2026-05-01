import React, { useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useStatusPendaftaran, STATUS_TO_STEP } from '@/hooks/useStatusPendaftaran';
import ResultBanner from '@/components/ResultBanner';

// ─── Konfigurasi Stepper ─────────────────────────────────────────────────────
const STEPS = [
  { id: 1, title: 'Terdaftar',            dbStatus: 'TERDAFTAR' },
  { id: 2, title: 'Verifikasi Dokumen',   dbStatus: 'REVIEW' },
  { id: 3, title: 'Tahap Ujian/Seleksi',  dbStatus: 'EXAM' },
  { id: 4, title: 'Keputusan Akhir',      dbStatus: ['LULUS', 'DITOLAK'] },
];

const PHASE_DETAILS = {
  1: {
    title: 'Tahap 1: Pendaftaran Terkirim',
    description:
      'Aplikasi pendaftaran beasiswa Anda berhasil kami terima dan masuk ke dalam sistem. Saat ini kami sedang menunggu antrean untuk proses verifikasi. Pastikan Anda rajin mengecek status secara berkala.',
  },
  2: {
    title: 'Tahap 2: Verifikasi Dokumen',
    description:
      'Tim reviewer kami sedang melakukan pengecekan terhadap keabsahan dokumen persyaratan yang Anda unggah (KTP, KTM, Transkrip Nilai, dan Surat Rekomendasi). Proses ini memakan waktu maksimal 5–7 hari kerja.',
  },
  3: {
    title: 'Tahap 3: Ujian / Seleksi',
    description:
      'Selamat! Dokumen Anda dinyatakan valid. Silakan bersiap untuk tahap seleksi atau ujian. Cek email Anda secara berkala untuk menerima undangan berisi jadwal dan informasi lebih lanjut dari panitia.',
  },
  4: {
    title: 'Tahap 4: Keputusan Akhir',
    description:
      'Semua rangkaian seleksi telah Anda selesaikan. Saat ini panitia sedang melakukan rapat pleno untuk menentukan finalis penerima Beasiswa. Pengumuman resmi akan dipublikasikan selambat-lambatnya akhir pekan ini.',
  },
};

// ─── Helper ──────────────────────────────────────────────────────────────────
function formatDate(isoString) {
  if (!isoString) return '–';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(isoString));
}

// ─── Skeleton loader ─────────────────────────────────────────────────────────
function SkeletonBlock({ className = '' }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
  );
}

// ─── Komponen Utama ──────────────────────────────────────────────────────────
export default function StatusPendaftaran() {
  const router = useRouter();
  // Ambil id pendaftaran dari URL query: /mahasiswa/status-pendaftaran?id=<uuid>
  const pendaftaranId = router.query.id ?? null;

  const { status, beasiswaInfo, createdAt, loading, error } =
    useStatusPendaftaran(pendaftaranId);

  // Mapping status → nomor step aktif
  const currentStep = useMemo(
    () => (status ? (STATUS_TO_STEP[status] ?? 1) : 1),
    [status]
  );

  const isFinished = status === 'LULUS' || status === 'DITOLAK';

  // ── Render: Error ──
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8 font-sans">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Gagal Memuat Data</h2>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => router.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <Head>
        <title>Status Pendaftaran – BantuBeasiswa</title>
        <meta
          name="description"
          content="Pantau status pendaftaran beasiswamu secara real-time di BantuBeasiswa."
        />
      </Head>

      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── ResultBanner (muncul hanya saat LULUS / DITOLAK) ── */}
        {!loading && isFinished && (
          <ResultBanner status={status} judulBeasiswa={beasiswaInfo?.judul} />
        )}

        {/* ── Header Section ── */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            {loading ? (
              <>
                <SkeletonBlock className="h-7 w-72 mb-3" />
                <SkeletonBlock className="h-4 w-48" />
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-900">
                  {beasiswaInfo?.judul ?? 'Beasiswa'}
                </h1>
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    ID:{' '}
                    <span className="font-semibold text-gray-700 font-mono text-xs">
                      {pendaftaranId ?? '–'}
                    </span>
                  </span>
                  <span className="hidden md:inline-block w-1.5 h-1.5 bg-gray-300 rounded-full" />
                  <span className="text-gray-500">
                    {beasiswaInfo?.pendonor?.nama_organisasi ?? ''}
                  </span>
                  <span className="hidden md:inline-block w-1.5 h-1.5 bg-gray-300 rounded-full" />
                  <span>Daftar: {formatDate(createdAt)}</span>
                </div>
              </>
            )}
          </div>

          {/* Status Badge */}
          {!loading && status && (
            <StatusBadge status={status} />
          )}
        </div>

        {/* ── Stepper Section ── */}
        <div className="bg-white rounded-2xl p-6 md:p-10 shadow-sm border border-gray-100 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-between gap-4 min-w-[600px]">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col items-center flex-1 gap-3">
                  <SkeletonBlock className="w-8 h-8 rounded-full" />
                  <SkeletonBlock className="h-3 w-20" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-between min-w-[600px]">
              {STEPS.map((step, index) => {
                const isCompleted = step.id < currentStep;
                const isActive    = step.id === currentStep;
                const isNotYet    = step.id > currentStep;
                const isLast      = index === STEPS.length - 1;

                return (
                  <div key={step.id} className="relative flex flex-col items-center flex-1">

                    {/* Connector Line */}
                    {!isLast && (
                      <div
                        className={`absolute top-4 left-1/2 w-full h-[2px] transition-colors duration-500 ${
                          isCompleted ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                        style={{ borderStyle: isCompleted ? 'solid' : 'dashed' }}
                      />
                    )}

                    {/* Step Circle */}
                    <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-white mb-3">
                      {isCompleted && (
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      {isActive && (
                        <div className="relative flex items-center justify-center w-8 h-8">
                          <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-75" />
                          <div className="relative z-10 w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-sm" />
                        </div>
                      )}
                      {isNotYet && (
                        <div className="w-6 h-6 rounded-full border-2 border-gray-300 bg-white" />
                      )}
                    </div>

                    {/* Step Labels */}
                    <div className="text-center">
                      <h3 className={`text-sm ${
                        isActive    ? 'font-bold text-blue-700' :
                        isCompleted ? 'font-medium text-gray-800' :
                                      'font-medium text-gray-400'
                      }`}>
                        {step.title}
                      </h3>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Content Section ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Current Phase Panel */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col justify-center">
            {loading ? (
              <>
                <SkeletonBlock className="h-6 w-64 mb-4" />
                <SkeletonBlock className="h-24 w-full" />
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {PHASE_DETAILS[currentStep].title}
                </h2>
                <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 mt-2 text-gray-700 leading-relaxed text-sm md:text-base">
                  {PHASE_DETAILS[currentStep].description}
                </div>
                <div className="mt-6">
                  <PhaseAction currentStep={currentStep} />
                </div>
              </>
            )}
          </div>

          {/* Info Panel */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Info Pendaftaran</h2>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <SkeletonBlock key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                <InfoRow label="Pendonor"  value={beasiswaInfo?.pendonor?.nama_organisasi ?? '–'} />
                <InfoRow label="Beasiswa"  value={beasiswaInfo?.judul ?? '–'} />
                <InfoRow label="Terdaftar" value={formatDate(createdAt)} />
                <InfoRow
                  label="Status"
                  value={
                    <span className={`font-semibold ${
                      status === 'LULUS'   ? 'text-emerald-600' :
                      status === 'DITOLAK' ? 'text-red-600' :
                                            'text-blue-600'
                    }`}>
                      {status ?? '–'}
                    </span>
                  }
                />
                {/* Realtime indicator */}
                <div className="pt-2 flex items-center gap-2 text-xs text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
                  Terhubung — update otomatis
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = {
    TERDAFTAR: { bg: 'bg-blue-50 text-blue-700 border-blue-200',  dot: 'bg-blue-500',   label: 'Terdaftar' },
    REVIEW:    { bg: 'bg-yellow-50 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500', label: 'Sedang Diverifikasi' },
    EXAM:      { bg: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500', label: 'Tahap Seleksi' },
    LULUS:     { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Lulus' },
    DITOLAK:   { bg: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', label: 'Tidak Lolos' },
  };
  const c = cfg[status] ?? cfg.TERDAFTAR;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${c.bg}`}>
      <span className={`w-2 h-2 mr-2 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="font-medium text-gray-800 text-right">{value}</span>
    </div>
  );
}

function PhaseAction({ currentStep }) {
  if (currentStep === 1)
    return (
      <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
        Lihat Berkas Saya
      </button>
    );
  if (currentStep === 2)
    return (
      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
        Hubungi Helpdesk
      </button>
    );
  if (currentStep === 3)
    return (
      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Buka Tautan Seleksi
      </button>
    );
  if (currentStep === 4)
    return (
      <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm">
        Lihat Pengumuman Lengkap
      </button>
    );
  return null;
}
