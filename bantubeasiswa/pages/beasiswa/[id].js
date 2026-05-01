import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import MahasiswaLayout from '../../components/layouts/MahasiswaLayout';
import LaporLinkRusakModal from '../../components/LaporLinkRusakModal';
import { supabase } from '../../lib/db';

// ─── Color Tokens ─────────────────────────────────────────────────────────────
import { withAuth } from '../../lib/auth';
import { fetchBeasiswaById } from '../../lib/beasiswaQuery';

// ─── Color tokens ─────────────────────────────────────────────────────────────
const C = {
  blue  : '#0056b3',
  gold  : '#ffc107',
  dark  : '#333333',
  green : '#059669',
  red   : '#dc2626',
  white : '#ffffff',
};

const ANTI_SPAM_MS = 5000;

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_MAP = {
  aktif  : { label: 'Aktif',   bg: '#d1fae5', color: '#065f46' },
  tutup  : { label: 'Tutup',   bg: '#fee2e2', color: '#b91c1c' },
  draf   : { label: 'Draf',    bg: '#f3f4f6', color: '#374151' },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.draf;
  return (
    <span
      style={{
        backgroundColor: s.bg,
        color          : s.color,
        padding        : '0.25rem 0.75rem',
        borderRadius   : '9999px',
        fontSize       : '0.75rem',
        fontWeight     : 700,
        display        : 'inline-block',
      }}
    >
      {s.label}
  light : '#f8f9fa',
  white : '#ffffff',
  gray  : '#6b7280',
};

// ─── Helper: format Rupiah ────────────────────────────────────────────────────
function formatRupiah(angka) {
  if (!angka) return '—';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(angka);
}

// ─── Helper: format tanggal ───────────────────────────────────────────────────
function formatTanggal(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ─── Helper: hitung hari tersisa ─────────────────────────────────────────────
function hitungHariTersisa(deadline) {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
}

// ─── Badge status beasiswa ────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const config = {
    aktif   : { bg: '#d1fae5', color: '#065f46', label: 'Aktif'  },
    draft   : { bg: '#f3f4f6', color: '#6b7280', label: 'Draft'  },
    ditutup : { bg: '#fee2e2', color: '#991b1b', label: 'Ditutup' },
    selesai : { bg: '#e0e7ff', color: '#3730a3', label: 'Selesai' },
  }[status] ?? { bg: '#f3f4f6', color: '#6b7280', label: status };

  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold"
      style={{ backgroundColor: config.bg, color: config.color }}>
      {config.label}
    </span>
  );
}

// ─── Info Row (label + value) ─────────────────────────────────────────────────
function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', paddingBottom: '0.875rem' }}>
      <span style={{ fontSize: '1.1rem', marginTop: '0.1rem' }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.125rem' }}>{label}</p>
        <p style={{ fontSize: '0.9375rem', color: C.dark, fontWeight: 500, wordBreak: 'break-word' }}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DetailBeasiswaPage({ beasiswa, user }) {
  const router = useRouter();

  const [modalOpen,        setModalOpen       ] = useState(false);
  const [laporDisabled,    setLaporDisabled   ] = useState(false);
  const [laporCountdown,   setLaporCountdown  ] = useState(0);

  // Aktifkan anti-spam setelah laporan berhasil terkirim
  const handleLaporSuccess = () => {
    setLaporDisabled(true);
    let sisa = Math.ceil(ANTI_SPAM_MS / 1000);
    setLaporCountdown(sisa);

    const interval = setInterval(() => {
      sisa -= 1;
      setLaporCountdown(sisa);
      if (sisa <= 0) {
        clearInterval(interval);
        setLaporDisabled(false);
        setLaporCountdown(0);
      }
    }, 1000);
  };

  const handleLaporClick = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    setModalOpen(true);
  };

  // Format currency
  const formatRp = (val) =>
    val ? 'Rp ' + Number(val).toLocaleString('id-ID') : null;

  // Format date
  const formatTanggal = (iso) => {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  };
// ─── Halaman Detail ───────────────────────────────────────────────────────────
export default function DetailBeasiswaPage({ user, beasiswa, errorMsg }) {
  const router = useRouter();

  // ─ Fallback jika data tidak ditemukan (error dari getServerSideProps) ─────
  if (errorMsg) {
    return (
      <>
        <Head><title>Beasiswa Tidak Ditemukan · BantuBeasiswa</title></Head>
        <MahasiswaLayout user={user}>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h1 className="text-xl font-bold mb-2" style={{ color: C.dark }}>
              Beasiswa Tidak Ditemukan
            </h1>
            <p className="text-sm mb-6" style={{ color: C.gray }}>{errorMsg}</p>
            <Link href="/mahasiswa/cari"
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: C.blue }}>
              ← Kembali ke Pencarian
            </Link>
          </div>
        </MahasiswaLayout>
      </>
    );
  }

  const hariTersisa  = hitungHariTersisa(beasiswa.deadline);
  const sudahBerakhir = hariTersisa !== null && hariTersisa < 0;

  const wilayahList = (beasiswa.beasiswa_wilayah ?? [])
    .map((bw) => ({ wilayah: bw.wilayah, keterangan: bw.keterangan }))
    .filter((bw) => bw.wilayah);

  // ─ Handler tombol Laporkan Link Rusak ────────────────────────────────────
  function handleLaporkan() {
    // FR-05: placeholder — akan dihubungkan ke API laporan link rusak
    alert('Terima kasih! Laporan Anda akan kami tindaklanjuti.');
  }

  return (
    <>
      <Head>
        <title>{beasiswa.nama} · BantuBeasiswa</title>
        <meta name="description" content={`Detail beasiswa ${beasiswa.nama} — BantuBeasiswa.`} />
      </Head>

      <MahasiswaLayout user={user ? { nama: user.email, role: user.role } : null}>

        {/* ── Breadcrumb ────────────────────────────────────────────────── */}
        <nav style={{ marginBottom: '1.25rem', fontSize: '0.8125rem', color: '#9ca3af' }}>
          <Link href="/mahasiswa/cari" style={{ color: C.blue, textDecoration: 'none', fontWeight: 500 }}>
            Cari Beasiswa
          </Link>
          {' / '}
          <span style={{ color: C.dark }}>{beasiswa.nama}</span>
        </nav>

        {/* ── Main Card ─────────────────────────────────────────────────── */}
        <div
          style={{
            backgroundColor: C.white,
            borderRadius   : '1rem',
            border         : '1px solid #e5e7eb',
            overflow       : 'hidden',
            boxShadow      : '0 1px 8px rgba(0,0,0,0.06)',
          }}
        >
          {/* Hero Header */}
          <div
            style={{
              background: `linear-gradient(135deg, ${C.blue} 0%, #003d82 100%)`,
              padding   : '2rem 1.75rem',
            }}
          >
            <StatusBadge status={beasiswa.status} />
            <h1
              style={{
                color     : C.white,
                fontSize  : 'clamp(1.25rem, 3vw, 1.625rem)',
                fontWeight: 800,
                marginTop : '0.75rem',
                lineHeight: 1.3,
              }}
            >
              {beasiswa.nama}
            </h1>
            {beasiswa.penyelenggara && (
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem', marginTop: '0.375rem' }}>
                🏢 {beasiswa.penyelenggara}
              </p>
            )}
          </div>

          {/* Content */}
          <div
            style={{
              display            : 'grid',
              gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
              gap                : 0,
            }}
            className="beasiswa-detail-grid"
          >
            {/* ── Left Column: Deskripsi + CTA ─────────────────────────── */}
            <div
              style={{
                padding     : '1.75rem',
                borderRight : '1px solid #f3f4f6',
              }}
            >
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: C.dark, marginBottom: '0.75rem' }}>
                Tentang Beasiswa
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#4b5563', lineHeight: 1.75, marginBottom: '1.5rem' }}>
                {beasiswa.deskripsi || 'Tidak ada deskripsi tersedia.'}
              </p>

              {/* Persyaratan */}
              {beasiswa.persyaratan && (
                <>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, color: C.dark, marginBottom: '0.75rem' }}>
                    Persyaratan
                  </h2>
                  <p style={{ fontSize: '0.9rem', color: '#4b5563', lineHeight: 1.75, marginBottom: '1.5rem' }}>
                    {beasiswa.persyaratan}
                  </p>
                </>
              )}

              {/* CTA utama */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem' }}>
                {beasiswa.link_pendaftaran ? (
                  <a
                    id="btn-daftar-beasiswa"
                    href={beasiswa.link_pendaftaran}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display        : 'inline-flex',
                      alignItems     : 'center',
                      gap            : '0.5rem',
                      padding        : '0.75rem 1.5rem',
                      borderRadius   : '0.625rem',
                      background     : `linear-gradient(135deg, ${C.gold} 0%, #e6a800 100%)`,
                      color          : '#1a1a1a',
                      fontWeight     : 700,
                      fontSize       : '0.9375rem',
                      textDecoration : 'none',
                      boxShadow      : '0 2px 8px rgba(255,193,7,0.4)',
                      transition     : 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform  = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow  = '0 6px 16px rgba(255,193,7,0.45)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform  = 'none';
                      e.currentTarget.style.boxShadow  = '0 2px 8px rgba(255,193,7,0.4)';
                    }}
                  >
                    <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                    Daftar Sekarang
                  </a>
                ) : (
                  <span
                    style={{
                      padding        : '0.75rem 1.5rem',
                      borderRadius   : '0.625rem',
                      backgroundColor: '#f3f4f6',
                      color          : '#9ca3af',
                      fontWeight     : 600,
                      fontSize       : '0.9375rem',
                    }}
                  >
                    Link belum tersedia
                  </span>
                )}

                {/* ── Tombol Laporkan Link Rusak ─────────────────────── */}
                <button
                  id="btn-lapor-link-rusak"
                  type="button"
                  onClick={handleLaporClick}
                  disabled={laporDisabled}
                  title={laporDisabled ? `Bisa lapor lagi dalam ${laporCountdown} detik` : 'Laporkan link bermasalah'}
                  style={{
                    display        : 'inline-flex',
                    alignItems     : 'center',
                    gap            : '0.5rem',
                    padding        : '0.75rem 1.125rem',
                    borderRadius   : '0.625rem',
                    border         : `1.5px solid ${laporDisabled ? '#d1d5db' : '#fca5a5'}`,
                    backgroundColor: laporDisabled ? '#f9fafb' : '#fff1f2',
                    color          : laporDisabled ? '#9ca3af' : C.red,
                    fontWeight     : 600,
                    fontSize       : '0.875rem',
                    cursor         : laporDisabled ? 'not-allowed' : 'pointer',
                    transition     : 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!laporDisabled) {
                      e.currentTarget.style.backgroundColor = '#fee2e2';
                      e.currentTarget.style.borderColor     = '#f87171';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!laporDisabled) {
                      e.currentTarget.style.backgroundColor = '#fff1f2';
                      e.currentTarget.style.borderColor     = '#fca5a5';
                    }
                  }}
                >
                  <svg style={{ width: '0.9rem', height: '0.9rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {laporDisabled
                    ? `Terkirim (${laporCountdown}s)`
                    : 'Laporkan Link Rusak'}
                </button>
              </div>
            </div>

            {/* ── Right Column: Info Detail ─────────────────────────────── */}
            <div style={{ padding: '1.75rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: C.dark, marginBottom: '1rem' }}>
                Informasi Beasiswa
              </h2>

              <InfoRow icon="💰" label="Nilai Beasiswa"   value={formatRp(beasiswa.nilai_beasiswa)} />
              <InfoRow icon="🎓" label="Jenjang"           value={beasiswa.jenjang}                  />
              <InfoRow icon="📍" label="Wilayah"           value={beasiswa.wilayah}                  />
              <InfoRow icon="👥" label="Kuota"             value={beasiswa.kuota ? `${beasiswa.kuota} penerima` : null} />
              <InfoRow icon="📅" label="Deadline Pendaftaran" value={formatTanggal(beasiswa.deadline)} />
              <InfoRow icon="🗓️" label="Periode"           value={beasiswa.periode}                  />

              {/* Link raw */}
              {beasiswa.link_pendaftaran && (
                <div style={{ marginTop: '0.5rem' }}>
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                    🔗 Link Pendaftaran
                  </p>
                  <a
                    href={beasiswa.link_pendaftaran}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize       : '0.8125rem',
                      color          : C.blue,
                      textDecoration : 'none',
                      wordBreak      : 'break-all',
                      fontWeight     : 500,
                    }}
                  >
                    {beasiswa.link_pendaftaran}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Responsive: stack columns on small screens */}
        <style>{`
          @media (max-width: 640px) {
            .beasiswa-detail-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>

      </MahasiswaLayout>

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      <LaporLinkRusakModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        beasiswaId={beasiswa.beasiswaId}
        beasiswaNama={beasiswa.nama}
        userId={user?.accountId ?? null}
        onSuccess={handleLaporSuccess}
      />
    </>
  );
}

// ─── SSR: Fetch beasiswa + auth ───────────────────────────────────────────────
export async function getServerSideProps(context) {
  const { id } = context.params;

  // Auth: coba decode token tapi tidak redirect kalau belum login
  // Halaman detail beasiswa bisa diakses siapa saja
  let user = null;
  try {
    const { verifyToken } = await import('../../lib/auth');
    const decoded = verifyToken(context.req);
    if (decoded) {
      user = {
        accountId: decoded.accountId,
        email    : decoded.email,
        role     : decoded.role,
      };
    }
  } catch { /* user tetap null */ }

  // Fetch detail beasiswa dari Supabase
  const { data: beasiswa, error } = await supabase
    .from('beasiswa')
    .select('*')
    .eq('beasiswaId', id)
    .single();

  if (error || !beasiswa) {
    return { notFound: true };
  }

  return {
    props: {
      beasiswa,
      user,
    },
  };
        <title>{beasiswa.judul} · BantuBeasiswa</title>
        <meta name="description"
          content={`Detail beasiswa ${beasiswa.judul} dari ${beasiswa.pendonor?.statusOrganisasi ?? ''}. Deadline: ${formatTanggal(beasiswa.deadline)}.`} />
      </Head>

      <MahasiswaLayout user={user}>

        {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
        <nav className="flex items-center gap-2 text-sm mb-5" style={{ color: C.gray }}>
          <Link href="/mahasiswa/cari"
            className="hover:underline transition-colors"
            style={{ color: C.blue }}>
            Cari Beasiswa
          </Link>
          <span>›</span>
          <span className="truncate max-w-xs" style={{ color: C.dark }}>
            {beasiswa.judul}
          </span>
        </nav>

        {/* ── Layout 2 kolom ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── KOLOM KIRI: info utama ──────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Card Header */}
            <div className="rounded-xl border p-6"
              style={{ backgroundColor: C.white, borderColor: '#e5e7eb' }}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <h1 className="text-xl font-extrabold leading-snug" style={{ color: C.dark }}>
                  {beasiswa.judul}
                </h1>
                <StatusBadge status={beasiswa.status} />
              </div>
              <p className="text-sm mb-4" style={{ color: C.gray }}>
                {beasiswa.pendonor?.statusOrganisasi ?? '—'}
              </p>

              {/* Deadline banner */}
              {hariTersisa !== null && (
                <div
                  className="rounded-lg px-4 py-3 text-sm font-medium"
                  style={{
                    backgroundColor: sudahBerakhir ? '#f9fafb'
                      : hariTersisa <= 7           ? '#fef3c7'
                      :                              '#d1fae5',
                    color          : sudahBerakhir ? C.gray
                      : hariTersisa <= 7           ? '#92400e'
                      :                              '#065f46',
                  }}
                >
                  {sudahBerakhir
                    ? `Pendaftaran telah berakhir pada ${formatTanggal(beasiswa.deadline)}`
                    : hariTersisa <= 7
                      ? `Closing Soon! Deadline: ${formatTanggal(beasiswa.deadline)} (${hariTersisa} hari lagi)`
                      : `Batas pendaftaran: ${formatTanggal(beasiswa.deadline)} (${hariTersisa} hari lagi)`}
                </div>
              )}
            </div>

            {/* Deskripsi */}
            {beasiswa.deskripsi && (
              <div className="rounded-xl border p-6"
                style={{ backgroundColor: C.white, borderColor: '#e5e7eb' }}>
                <h2 className="text-base font-bold mb-3" style={{ color: C.dark }}>
                  Tentang Beasiswa
                </h2>
                <p className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: '#4b5563' }}>
                  {beasiswa.deskripsi}
                </p>
              </div>
            )}

            {/* Syarat & Ketentuan */}
            {beasiswa.syarat && (
              <div className="rounded-xl border p-6"
                style={{ backgroundColor: C.white, borderColor: '#e5e7eb' }}>
                <h2 className="text-base font-bold mb-3" style={{ color: C.dark }}>
                  Syarat & Ketentuan
                </h2>
                <p className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: '#4b5563' }}>
                  {beasiswa.syarat}
                </p>
              </div>
            )}

            {/* Wilayah Target */}
            {wilayahList.length > 0 && (
              <div className="rounded-xl border p-6"
                style={{ backgroundColor: C.white, borderColor: '#e5e7eb' }}>
                <h2 className="text-base font-bold mb-3" style={{ color: C.dark }}>
                  Wilayah Target
                </h2>
                <div className="space-y-2">
                  {wilayahList.map(({ wilayah: w, keterangan }) => (
                    <div key={w.wilayahId}
                      className="flex items-start gap-3 p-3 rounded-lg"
                      style={{ backgroundColor: '#f8f9fa' }}>
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: C.dark }}>
                          {w.nama}
                        </p>
                        {keterangan && (
                          <p className="text-xs mt-0.5" style={{ color: C.gray }}>{keterangan}</p>
                        )}
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {w.isAfirmasi && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: '#eff6ff', color: C.blue }}>
                            Afirmasi
                          </span>
                        )}
                        {w.is3T && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                            3T
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── KOLOM KANAN: sidebar ringkasan + CTA ───────────────────── */}
          <div className="space-y-5">

            {/* Info Cepat */}
            <div className="rounded-xl border p-5"
               style={{ backgroundColor: C.white, borderColor: '#e5e7eb' }}>
               <h2 className="text-sm font-bold mb-3" style={{ color: C.dark }}>
                 Ringkasan Beasiswa
               </h2>
               <InfoRow icon="" label="Jalur"             value={beasiswa.jalur || 'Reguler'} />
               <InfoRow icon="" label="Deadline"          value={formatTanggal(beasiswa.deadline)} />
               <InfoRow icon="" label="Pendonor"          value={beasiswa.pendonor?.statusOrganisasi ?? '\u2014'} />
              {beasiswa.pendonor?.kontak && (
                <InfoRow icon="" label="Kontak Pendonor" value={beasiswa.pendonor.kontak} />
              )}
            </div>

            {/* CTA Daftar */}
            <div className="rounded-xl border p-5 sticky top-5"
              style={{ backgroundColor: C.white, borderColor: '#e5e7eb' }}>
              {sudahBerakhir ? (
                <div className="text-center py-4">
                  <p className="text-sm font-semibold mb-1" style={{ color: '#6b7280' }}>
                    Pendaftaran Ditutup
                  </p>
                  <p className="text-xs" style={{ color: '#9ca3af' }}>
                    Beasiswa ini telah melewati batas waktu pendaftaran.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs mb-3 text-center" style={{ color: C.gray }}>
                    Pastikan Anda telah membaca semua syarat sebelum mendaftar.
                  </p>
                  {/* Tombol Daftar Sekarang → redirect ke halaman form daftar */}
                  <Link
                    id="btn-daftar-beasiswa"
                    href={`/mahasiswa/daftar/${beasiswa.beasiswaId}`}
                    className="block w-full text-center py-3 rounded-lg text-sm font-bold text-white transition-all duration-200"
                    style={{
                      backgroundColor: C.blue,
                      boxShadow: '0 4px 14px rgba(0,86,179,0.3)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#004494')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.blue)}
                  >
                    Daftar Sekarang
                  </Link>
                </>
              )}

              {/* Tombol Laporkan Link Rusak (FR-05) */}
              <button
                id="btn-laporkan-link-rusak"
                onClick={handleLaporkan}
                className="w-full text-center text-xs mt-3 py-2 rounded-lg border transition-all"
                style={{ borderColor: '#fca5a5', color: '#dc2626', backgroundColor: '#fff1f2' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff1f2'; }}
              >
                Laporkan Link Rusak
              </button>

              <Link href="/mahasiswa/cari"
                className="block text-center text-sm mt-3 py-2.5 rounded-lg border transition-colors"
                style={{ borderColor: '#e5e7eb', color: C.gray }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.blue)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
              >
                ← Kembali ke Pencarian
              </Link>
            </div>

          </div>
        </div>

      </MahasiswaLayout>
    </>
  );
}

// ─── SSR: Fetch data + Auth guard ─────────────────────────────────────────────
export async function getServerSideProps(context) {
  // 1. Cek auth dulu
  const authResult = await withAuth(context, 'mahasiswa');

  // Jika withAuth redirect, kembalikan langsung
  if (authResult.redirect) return authResult;

  const { id } = context.params;

  // 2. Fetch detail beasiswa
  try {
    const beasiswa = await fetchBeasiswaById(id);

    if (!beasiswa) {
      return {
        props: {
          ...authResult.props,
          beasiswa: null,
          errorMsg: 'Beasiswa tidak ditemukan atau telah dihapus.',
        },
      };
    }

    return {
      props: {
        ...authResult.props,
        beasiswa,
        errorMsg: null,
      },
    };
  } catch (err) {
    return {
      props: {
        ...authResult.props,
        beasiswa: null,
        errorMsg: err.message || 'Gagal memuat data beasiswa.',
      },
    };
  }
}
