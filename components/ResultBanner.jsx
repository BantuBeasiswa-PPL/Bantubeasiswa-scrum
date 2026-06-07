import React from 'react';

/**
 * ResultBanner — ditampilkan saat status pendaftaran adalah LULUS atau DITOLAK.
 *
 * Props:
 *   status       {string}  'LULUS' | 'DITOLAK'
 *   judulBeasiswa {string} Judul beasiswa (untuk pesan personal)
 */
export default function ResultBanner({ status, judulBeasiswa }) {
  if (status !== 'LULUS' && status !== 'DITOLAK') return null;

  const isLulus = status === 'LULUS';

  const config = {
    LULUS: {
      bg: 'bg-gradient-to-r from-emerald-500 to-green-600',
      border: 'border-emerald-400',
      badgeBg: 'bg-emerald-400/30',
      badgeText: 'text-emerald-100',
      icon: (
        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      badge: '🎉 SELAMAT, KAMU LULUS!',
      heading: 'Kamu dinyatakan sebagai penerima beasiswa!',
      description: `Selamat! Pendaftaran kamu untuk ${judulBeasiswa ?? 'beasiswa ini'} telah resmi disetujui. 
        Tim kami akan segera menghubungi kamu melalui email terdaftar mengenai langkah selanjutnya.`,
      buttonLabel: 'Lihat Surat Keputusan',
      buttonClass: 'bg-white text-emerald-700 hover:bg-emerald-50',
    },
    DITOLAK: {
      bg: 'bg-gradient-to-r from-red-500 to-rose-600',
      border: 'border-red-400',
      badgeBg: 'bg-red-400/30',
      badgeText: 'text-red-100',
      icon: (
        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      badge: 'STATUS: TIDAK LOLOS',
      heading: 'Pendaftaran kamu belum berhasil kali ini.',
      description: `Terima kasih atas semangat dan usahamu mendaftar ${judulBeasiswa ?? 'beasiswa ini'}. 
        Sayangnya kamu belum terpilih pada seleksi ini. Jangan menyerah — masih banyak kesempatan beasiswa lain untukmu!`,
      buttonLabel: 'Cari Beasiswa Lainnya',
      buttonClass: 'bg-white text-rose-700 hover:bg-rose-50',
    },
  };

  const c = config[status];

  return (
    <div
      className={`w-full rounded-2xl p-6 md:p-8 text-white border ${c.bg} ${c.border} shadow-lg`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        {/* Icon */}
        <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-full bg-white/20">
          {c.icon}
        </div>

        {/* Content */}
        <div className="text-center sm:text-left flex-1">
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase ${c.badgeBg} ${c.badgeText} mb-2`}
          >
            {c.badge}
          </span>
          <h2 className="text-xl md:text-2xl font-bold leading-snug mb-2">
            {c.heading}
          </h2>
          <p className="text-sm md:text-base text-white/85 leading-relaxed">
            {c.description}
          </p>
        </div>

        {/* CTA Button */}
        <div className="flex-shrink-0">
          <button
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors whitespace-nowrap ${c.buttonClass}`}
          >
            {c.buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}