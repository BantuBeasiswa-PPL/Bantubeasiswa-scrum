import React, { useState } from 'react';
import Link from 'next/link';

export default function ResultBanner({ status, judulBeasiswa, namaMahasiswa, nominal, namaOrganisasi }) {
  const [showFeedback, setShowFeedback] = useState(false);

  if (!status || (status !== 'LULUS' && status !== 'DITOLAK')) {
    return null;
  }

  const formatRupiah = (value) => {
    if (!value) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const handleDownload = () => {
    alert('Mengunduh Surat Keputusan Kelulusan Beasiswa... (Unduhan Simulasi PDF)');
  };

  const isLulus = status === 'LULUS';

  return (
    <div
      className={`w-full animate-fade-in-premium ${isLulus ? 'result-banner--lulus' : 'result-banner--ditolak'}`}
      role="alert"
      aria-live="polite"
      data-testid="result-banner"
      data-result-status={status}
      data-result-tone={isLulus ? 'blue' : 'red'}
    >
      <style>{`
        @keyframes fadeInPremium {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fade-in-premium {
          animation: fadeInPremium 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {isLulus ? (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2563eb] via-[#1d4ed8] to-[#1e40af] p-8 md:p-10 shadow-[0_20px_50px_rgba(37,99,235,0.3)] text-white border border-blue-400/20">
          {/* Enhanced decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400 rounded-full blur-[80px] opacity-20 -ml-20 -mb-20 pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Check Circle Icon with Ring */}
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-400 blur-xl opacity-40 animate-pulse" />
                <div className="relative w-20 h-20 rounded-full bg-white flex items-center justify-center text-emerald-600 shrink-0 shadow-2xl border-4 border-emerald-100">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] bg-emerald-500 text-white rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                    Candidate Verified
                  </span>
                  <span className="px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] bg-white/20 backdrop-blur-md text-white rounded-full border border-white/20">
                    Full Tuition
                  </span>
                </div>

                <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
                  Selamat, {namaMahasiswa || 'Pendaftar'}!<br />
                  <span className="text-blue-100">Anda Dinyatakan Lulus.</span>
                </h2>

                <p className="text-lg text-blue-50/80 max-w-xl leading-relaxed">
                  Kami bangga mengumumkan bahwa Anda terpilih sebagai penerima **{judulBeasiswa || 'Beasiswa'}**. Persiapkan diri Anda untuk masa depan yang lebih cerah!
                </p>
              </div>
            </div>

            {/* Program Info Card */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-inner w-full md:w-auto min-w-[280px]">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-8">
                  <span className="text-blue-200 text-xs font-bold uppercase tracking-wider">Program</span>
                  <span className="font-bold text-sm truncate max-w-[150px]">{judulBeasiswa || 'Beasiswa'}</span>
                </div>
                <div className="flex items-center justify-between gap-8">
                  <span className="text-blue-200 text-xs font-bold uppercase tracking-wider">Nominal</span>
                  <span className="font-black text-sm text-emerald-300">{formatRupiah(nominal)}</span>
                </div>
                <div className="flex items-center justify-between gap-8">
                  <span className="text-blue-200 text-xs font-bold uppercase tracking-wider">Organisasi</span>
                  <span className="font-bold text-sm">{namaOrganisasi || 'Pendonor'}</span>
                </div>
                <div className="flex items-center justify-between gap-8 pt-2 border-t border-white/10">
                  <span className="text-blue-200 text-xs font-bold uppercase tracking-wider">Batch</span>
                  <span className="font-bold text-sm">2024–2025</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-4 relative z-10">
            <button
              onClick={handleDownload}
              className="px-8 py-4 bg-white text-blue-600 hover:bg-blue-50 active:scale-95 rounded-2xl text-base font-black shadow-xl transition-all flex items-center gap-2 group"
            >
              <svg className="w-5 h-5 transition-transform group-hover:translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Unduh Surat Kelulusan
            </button>

            <Link href="/mahasiswa/daftar-ulang">
              <span className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-2xl text-base font-black shadow-xl hover:shadow-emerald-500/30 transition-all flex items-center gap-2 cursor-pointer">
                Langkah Selanjutnya
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#dc2626] via-[#b91c1c] to-[#991b1b] p-8 md:p-10 shadow-[0_20px_50px_rgba(220,38,38,0.3)] text-white border border-red-400/20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-400 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20 pointer-events-none" />

          <div className="flex flex-col gap-8 relative z-10">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-red-600 shrink-0 shadow-2xl border-4 border-red-100">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
                  Terima Kasih Atas Partisipasi Anda
                </h2>
                <p className="text-lg text-red-50/80 max-w-2xl leading-relaxed">
                  Kami sangat menghargai dedikasi Anda. Meskipun kali ini belum berhasil, pintu kesempatan lain masih terbuka lebar. Tetaplah berjuang dan jangan pernah menyerah!
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => setShowFeedback(!showFeedback)}
                className="px-8 py-4 bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 rounded-2xl text-base font-black shadow-lg transition-all flex items-center gap-2 backdrop-blur-sm"
              >
                <svg className="w-5 h-5 text-red-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {showFeedback ? 'Tutup Feedback' : 'Lihat Feedback Seleksi'}
              </button>
            </div>

            {showFeedback && (
              <div className="mt-2 p-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-500">
                <h3 className="text-sm uppercase font-black tracking-widest text-red-100 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-300 rounded-full animate-ping" />
                  Review Tim Panitia
                </h3>
                <p className="text-red-50 leading-relaxed italic text-lg font-medium">
                  &quot;Profil akademik Anda sangat impresif. Namun, persaingan tahun ini sangat ketat dan kuota terbatas. Kami sangat menyarankan Anda mencoba kembali di gelombang berikutnya.&quot;
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
