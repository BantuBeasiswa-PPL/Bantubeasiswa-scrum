import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import MahasiswaLayout from '../../components/layouts/MahasiswaLayout';
import LaporLinkRusakModal from '../../components/LaporLinkRusakModal';
import { withAuth } from '../../lib/auth';
import { fetchBeasiswaById } from '../../lib/beasiswaQuery';

// ─── Color Tokens ─────────────────────────────────────────────────────────────
const C = {
  blue  : '#0056b3',
  gold  : '#ffc107',
  dark  : '#333333',
  green : '#059669',
  red   : '#dc2626',
  white : '#ffffff',
  light : '#f8f9fa',
  gray  : '#6b7280',
};

const ANTI_SPAM_MS = 5000;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRupiah(angka) {
  if (!angka) return '—';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(angka);
}

function formatTanggal(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function hitungHariTersisa(deadline) {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
}

// ─── Components ───────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const config = {
    aktif   : { bg: '#d1fae5', color: '#065f46', label: 'Aktif'  },
    draft   : { bg: '#f3f4f6', color: '#6b7280', label: 'Draft'  },
    draf    : { bg: '#f3f4f6', color: '#6b7280', label: 'Draft'  },
    ditutup : { bg: '#fee2e2', color: '#991b1b', label: 'Ditutup' },
    tutup   : { bg: '#fee2e2', color: '#991b1b', label: 'Ditutup' },
    selesai : { bg: '#e0e7ff', color: '#3730a3', label: 'Selesai' },
  }[status?.toLowerCase()] ?? { bg: '#f3f4f6', color: '#6b7280', label: status || 'Unknown' };

  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold"
      style={{ backgroundColor: config.bg, color: config.color }}>
      {config.label}
    </span>
  );
}

function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', paddingBottom: '0.875rem' }}>
      {icon && <span style={{ fontSize: '1.1rem', marginTop: '0.1rem' }}>{icon}</span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.125rem' }}>{label}</p>
        <p style={{ fontSize: '0.9375rem', color: C.dark, fontWeight: 500, wordBreak: 'break-word' }}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Halaman Detail ───────────────────────────────────────────────────────────
export default function DetailBeasiswaPage({ user, beasiswa, errorMsg }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [laporDisabled, setLaporDisabled] = useState(false);
  const [laporCountdown, setLaporCountdown] = useState(0);

  // ─ Fallback jika data tidak ditemukan ─────
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

  const hariTersisa   = hitungHariTersisa(beasiswa.deadline);
  const sudahBerakhir = hariTersisa !== null && hariTersisa < 0;

  const wilayahList = (beasiswa.beasiswa_wilayah ?? [])
    .map((bw) => ({ wilayah: bw.wilayah, keterangan: bw.keterangan }))
    .filter((bw) => bw.wilayah);

  // ─ Handler tombol Laporkan Link Rusak ────────────────────────────────────
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

  return (
    <>
      <Head>
        <title>{beasiswa.judul || beasiswa.nama} · BantuBeasiswa</title>
        <meta name="description"
          content={`Detail beasiswa ${beasiswa.judul || beasiswa.nama} dari ${beasiswa.pendonor?.statusOrganisasi ?? ''}. Deadline: ${formatTanggal(beasiswa.deadline)}.`} />
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
            {beasiswa.judul || beasiswa.nama}
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
                  {beasiswa.judul || beasiswa.nama}
                </h1>
                <StatusBadge status={beasiswa.status} />
              </div>
              <p className="text-sm mb-4" style={{ color: C.gray }}>
                {beasiswa.pendonor?.statusOrganisasi ?? beasiswa.penyelenggara ?? '—'}
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
            {(beasiswa.syarat || beasiswa.persyaratan) && (
              <div className="rounded-xl border p-6"
                style={{ backgroundColor: C.white, borderColor: '#e5e7eb' }}>
                <h2 className="text-base font-bold mb-3" style={{ color: C.dark }}>
                  Syarat & Ketentuan
                </h2>
                <p className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: '#4b5563' }}>
                  {beasiswa.syarat || beasiswa.persyaratan}
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
                    <div key={w.wilayahId || w.nama}
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
               <InfoRow icon="🎓" label="Jalur"             value={beasiswa.jalur || 'Reguler'} />
               <InfoRow icon="💰" label="Nilai Beasiswa"    value={formatRupiah(beasiswa.nilai_beasiswa)} />
               <InfoRow icon="📅" label="Deadline"          value={formatTanggal(beasiswa.deadline)} />
               <InfoRow icon="🏢" label="Pendonor"          value={beasiswa.pendonor?.statusOrganisasi ?? '\u2014'} />
              {beasiswa.pendonor?.kontak && (
                <InfoRow icon="📞" label="Kontak Pendonor" value={beasiswa.pendonor.kontak} />
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
                  <Link
                    id="btn-daftar-beasiswa"
                    href={beasiswa.link_pendaftaran || `/mahasiswa/daftar/${beasiswa.beasiswaId}`}
                    target={beasiswa.link_pendaftaran ? "_blank" : "_self"}
                    rel={beasiswa.link_pendaftaran ? "noopener noreferrer" : ""}
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

              {/* Tombol Laporkan Link Rusak */}
              <button
                id="btn-laporkan-link-rusak"
                onClick={handleLaporClick}
                disabled={laporDisabled}
                className="w-full flex items-center justify-center gap-2 text-center text-xs mt-3 py-2 rounded-lg border transition-all"
                style={{ 
                  borderColor: laporDisabled ? '#d1d5db' : '#fca5a5', 
                  color: laporDisabled ? '#9ca3af' : '#dc2626', 
                  backgroundColor: laporDisabled ? '#f9fafb' : '#fff1f2',
                  cursor: laporDisabled ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={(e) => { if (!laporDisabled) e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                onMouseLeave={(e) => { if (!laporDisabled) e.currentTarget.style.backgroundColor = '#fff1f2'; }}
              >
                <svg style={{ width: '0.9rem', height: '0.9rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {laporDisabled
                  ? `Terkirim (${laporCountdown}s)`
                  : 'Laporkan Link Rusak'}
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

      {/* ── Modal Lapor Link Rusak ─────────────────────────────────────────── */}
      <LaporLinkRusakModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        beasiswaId={beasiswa?.beasiswaId}
        beasiswaNama={beasiswa?.judul || beasiswa?.nama}
        userId={user?.accountId ?? null}
        onSuccess={handleLaporSuccess}
      />
    </>
  );
}

// ─── SSR: Fetch data + Auth guard ─────────────────────────────────────────────
export async function getServerSideProps(context) {
  const authResult = await withAuth(context, 'mahasiswa');

  if (authResult.redirect) return authResult;

  const { id } = context.params;

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