import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import MahasiswaLayout from '../../components/layouts/MahasiswaLayout';
import { withAuth } from '../../lib/auth';
import {
  fetchBeasiswa,
  fetchWilayahAfirmasi,
  fetchWilayah3T,
} from '../../lib/beasiswaQuery';

// ─── Color tokens (sama dengan file lain di project) ─────────────────────────
const C = {
  blue  : '#0056b3',
  gold  : '#ffc107',
  dark  : '#333333',
  light : '#f8f9fa',
  white : '#ffffff',
  gray  : '#6b7280',
};

// ─── Helper: hitung selisih hari deadline ─────────────────────────────────────
function hitungHariTersisa(deadline) {
  if (!deadline) return null;
  const selisihMs   = new Date(deadline) - new Date();
  return Math.ceil(selisihMs / (1000 * 60 * 60 * 24));
}

// ─── Helper: format Rupiah ────────────────────────────────────────────────────
function formatRupiah(angka) {
  if (!angka) return '—';
  return new Intl.NumberFormat('id-ID', {
    style   : 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(angka);
}

// ─── Badge deadline ───────────────────────────────────────────────────────────
function DeadlineBadge({ deadline }) {
  const hari = hitungHariTersisa(deadline);

  if (hari === null) return null;

  if (hari < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
        style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}>
        Berakhir
      </span>
    );
  }
  if (hari <= 7) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
        style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>
        Closing Soon · {hari}h lagi
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: '#d1fae5', color: '#065f46' }}>
      {hari} hari lagi
    </span>
  );
}

// ─── Badge wilayah ────────────────────────────────────────────────────────────
function WilayahBadge({ wilayah }) {
  const isAfirmasi = wilayah.isAfirmasi;
  const is3T       = wilayah.is3T;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border"
      style={{
        backgroundColor: isAfirmasi || is3T ? '#eff6ff' : '#f9fafb',
        borderColor    : isAfirmasi || is3T ? '#bfdbfe' : '#e5e7eb',
        color          : isAfirmasi || is3T ? C.blue    : C.gray,
      }}
    >
      {wilayah.nama}
    </span>
  );
}

// ─── Public homepage layout ──────────────────────────────────────────────────
function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-lg font-bold text-blue-900">BantuBeasiswa</p>
            <p className="text-sm text-gray-600">Cari beasiswa tanpa harus masuk terlebih dahulu.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg border border-blue-500 bg-white px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
            >
              Masuk
            </Link>
            <Link
              href="/register/mahasiswa"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Daftar
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonBeasiswaCard() {
  return (
    <div className="rounded-xl border p-5 animate-pulse"
      style={{ backgroundColor: C.white, borderColor: '#e5e7eb' }}>
      <div className="flex justify-between items-start mb-3">
        <div className="h-5 w-2/3 rounded bg-gray-200" />
        <div className="h-5 w-20 rounded-full bg-gray-200" />
      </div>
      <div className="h-3 w-1/3 rounded bg-gray-100 mb-4" />
      <div className="space-y-2 mb-4">
        <div className="h-3 w-full rounded bg-gray-100" />
        <div className="h-3 w-4/5 rounded bg-gray-100" />
      </div>
      <div className="flex gap-2 mb-4">
        <div className="h-5 w-16 rounded-full bg-gray-200" />
        <div className="h-5 w-20 rounded-full bg-gray-200" />
      </div>
      <div className="h-9 w-full rounded-lg bg-gray-200 mt-3" />
    </div>
  );
}

// ─── Card Beasiswa ────────────────────────────────────────────────────────────
function BeasiswaCard({ beasiswa }) {
  const [hovered, setHovered] = useState(false);

  const wilayahList = (beasiswa.beasiswa_wilayah ?? [])
    .map((bw) => bw.wilayah)
    .filter(Boolean);

  const namaOrganisasi = beasiswa.pendonor?.statusOrganisasi ?? '—';

  const deadlineFormatted = beasiswa.deadline
    ? new Date(beasiswa.deadline).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : '—';

  return (
    <div
      className="rounded-xl border flex flex-col transition-all duration-200"
      style={{
        backgroundColor: C.white,
        borderColor    : hovered ? C.blue : '#e5e7eb',
        boxShadow      : hovered ? '0 4px 20px rgba(0,86,179,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
        transform      : hovered ? 'translateY(-2px)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Stripe warna atas card ─── */}
      <div className="h-1.5 rounded-t-xl" style={{ backgroundColor: C.blue }} />

      <div className="p-5 flex flex-col flex-1">
        {/* ── Header baris 1: judul + badge deadline ─── */}
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="text-base font-bold leading-snug line-clamp-2"
            style={{ color: C.dark }}>
            {beasiswa.judul}
          </h2>
          <div className="shrink-0">
            <DeadlineBadge deadline={beasiswa.deadline} />
          </div>
        </div>

        {/* ── Nama pendonor ─── */}
        <p className="text-sm mb-3" style={{ color: C.gray }}>
          {namaOrganisasi}
        </p>

        {/* ── Deskripsi singkat ─── */}
        {beasiswa.deskripsi && (
          <p className="text-sm leading-relaxed line-clamp-2 mb-3"
            style={{ color: '#4b5563' }}>
            {beasiswa.deskripsi}
          </p>
        )}

        {/* ── Info jalur + deadline ─── */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
          <div className="rounded-lg px-3 py-2" style={{ backgroundColor: '#f0f7ff' }}>
            <p className="text-xs mb-0.5" style={{ color: C.gray }}>Jalur</p>
            <p className="font-bold" style={{ color: C.blue }}>
              {beasiswa.jalur || 'Reguler'}
            </p>
          </div>
          <div className="rounded-lg px-3 py-2" style={{ backgroundColor: '#f0f7ff' }}>
            <p className="text-xs mb-0.5" style={{ color: C.gray }}>Deadline</p>
            <p className="font-bold text-xs" style={{ color: C.dark }}>
              {deadlineFormatted}
            </p>
          </div>
        </div>

        {/* ── Badge wilayah ─── */}
        {wilayahList.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {wilayahList.slice(0, 3).map((w) => (
              <WilayahBadge key={w.wilayahId} wilayah={w} />
            ))}
            {wilayahList.length > 3 && (
              <span className="text-xs px-2 py-0.5 rounded border"
                style={{ color: C.gray, borderColor: '#e5e7eb' }}>
                +{wilayahList.length - 3} lainnya
              </span>
            )}
          </div>
        )}

        {/* ── Tombol Detail (push ke bawah) ─── */}
        <div className="mt-auto pt-3 border-t" style={{ borderColor: '#f3f4f6' }}>
          <Link
            href={`/beasiswa/${beasiswa.beasiswaId}`}
            id={`btn-detail-beasiswa-${beasiswa.beasiswaId}`}
            className="block w-full text-center py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
            style={{
              backgroundColor: hovered ? C.blue : '#eff6ff',
              color          : hovered ? C.white : C.blue,
            }}
          >
            Lihat Detail →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ onReset }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
      <p className="text-base font-semibold mb-1" style={{ color: C.dark }}>
        Beasiswa tidak ditemukan
      </p>
      <p className="text-sm mb-5" style={{ color: C.gray }}>
        Coba ubah kata kunci atau filter wilayah
      </p>
      <button
        onClick={onReset}
        className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
        style={{ backgroundColor: C.blue }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#004494')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.blue)}
      >
        Reset Filter
      </button>
    </div>
  );
}

// ─── Halaman Utama ────────────────────────────────────────────────────────────
export default function CariBeasiswaPage({ user, publicMode = false }) {
  const router = useRouter();
  const Layout = publicMode ? PublicLayout : MahasiswaLayout;

  // ── State filter + data ────────────────────────────────────────────────────────────────
  const [keyword,          setKeyword       ] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [afirmasiId,       setAfirmasiId    ] = useState('');
  const [tiga_tId,         setTigaTId       ] = useState('');

  const [beasiswaList, setBeasiswaList] = useState([]);
  const [wilayahAfirmasi, setWilayahAfirmasi] = useState([]);
  const [wilayah3T,       setWilayah3T      ] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error,   setError  ] = useState('');

  // ── Sync filter dari URL query params ──────────────────────────────────
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query.q || '';
    setKeyword(q);
    setDebouncedKeyword(q); // Init tanpa delay agar tidak delayed saat pertama load
    if (router.query.afirmasi)   setAfirmasiId(router.query.afirmasi);
    if (router.query.tiga_t)     setTigaTId(router.query.tiga_t);
  }, [router.isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Debounce keyword: update debouncedKeyword 400ms setelah user berhenti ketik ─
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 400);
    return () => clearTimeout(timer); // Batalkan timer jika keyword berubah lagi
  }, [keyword]);

  // ── Fetch dropdown wilayah (sekali saat mount) ───────────────────────────────
  useEffect(() => {
    async function loadWilayah() {
      try {
        const [afirmasi, tigaT] = await Promise.all([
          fetchWilayahAfirmasi(),
          fetchWilayah3T(),
        ]);
        setWilayahAfirmasi(afirmasi);
        setWilayah3T(tigaT);
      } catch (err) {
        console.error('Gagal fetch wilayah dropdown:', err);
      }
    }
    loadWilayah();
  }, []);

  // ── Fetch beasiswa (dipanggil ulang setiap debouncedKeyword atau filter berubah) ─
  const loadBeasiswa = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchBeasiswa({
        keyword   : debouncedKeyword, // pakai debouncedKeyword, bukan keyword mentah
        afirmasiId: afirmasiId ? Number(afirmasiId) : null,
        tiga_tId  : tiga_tId   ? Number(tiga_tId)   : null,
      });
      setBeasiswaList(data);
    } catch (err) {
      setError(err.message || 'Gagal memuat daftar beasiswa.');
    } finally {
      setLoading(false);
    }
  }, [debouncedKeyword, afirmasiId, tiga_tId]);

  useEffect(() => {
    loadBeasiswa();
  }, [loadBeasiswa]);

  // ── Update URL query params saat filter berubah ──────────────────────────────
  useEffect(() => {
    if (!router.isReady) return;
    const q = {};
    if (keyword)    q.q        = keyword;
    if (afirmasiId) q.afirmasi = afirmasiId;
    if (tiga_tId)   q.tiga_t   = tiga_tId;
    router.replace({ pathname: router.pathname, query: q }, undefined, { shallow: true });
  }, [keyword, afirmasiId, tiga_tId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleReset() {
    setKeyword('');
    setAfirmasiId('');
    setTigaTId('');
  }

  const isFilterActive = keyword || afirmasiId || tiga_tId;

  return (
    <>
      <Head>
        <title>Cari Beasiswa · BantuBeasiswa</title>
        <meta name="description"
          content="Cari dan filter beasiswa aktif berdasarkan kata kunci, wilayah afirmasi, dan daerah 3T." />
      </Head>

      <Layout user={user}>

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-7 rounded-full" style={{ backgroundColor: C.gold }} />
            <h1 className="text-2xl font-extrabold" style={{ color: C.dark }}>
              Cari Beasiswa
            </h1>
          </div>
          <p className="text-sm ml-4" style={{ color: C.gray }}>
            Temukan beasiswa yang sesuai dengan profil dan domisili Anda
          </p>
        </div>

        {/* ── Filter Bar ───────────────────────────────────────────────────── */}
        <div
          className="rounded-xl border p-4 mb-6 flex flex-col sm:flex-row gap-3"
          style={{ backgroundColor: C.white, borderColor: '#e5e7eb' }}
        >
          {/* Search keyword */}
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
              style={{ color: '#9ca3af' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              id="search-beasiswa"
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Cari nama beasiswa..."
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border outline-none transition-all"
              style={{ borderColor: '#e5e7eb', color: C.dark }}
              onFocus={(e) => { e.target.style.borderColor = C.blue; e.target.style.boxShadow = '0 0 0 3px rgba(0,86,179,0.1)'; }}
              onBlur={(e)  => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Dropdown Provinsi Afirmasi */}
          <select
            id="filter-afirmasi"
            value={afirmasiId}
            onChange={(e) => setAfirmasiId(e.target.value)}
            className="py-2.5 px-3 text-sm rounded-lg border outline-none transition-all sm:w-52"
            style={{
              borderColor    : afirmasiId ? C.blue : '#e5e7eb',
              backgroundColor: afirmasiId ? '#eff6ff' : C.white,
              color          : C.dark,
            }}
          >
            <option value="">Provinsi Afirmasi</option>
            {wilayahAfirmasi.map((w) => (
              <option key={w.wilayahId} value={w.wilayahId}>
                {w.nama}
              </option>
            ))}
          </select>

          {/* Dropdown Kabupaten 3T */}
          <select
            id="filter-3t"
            value={tiga_tId}
            onChange={(e) => setTigaTId(e.target.value)}
            className="py-2.5 px-3 text-sm rounded-lg border outline-none transition-all sm:w-52"
            style={{
              borderColor    : tiga_tId ? C.blue : '#e5e7eb',
              backgroundColor: tiga_tId ? '#eff6ff' : C.white,
              color          : C.dark,
            }}
          >
            <option value="">Kabupaten / Kota 3T</option>
            {wilayah3T.map((w) => (
              <option key={w.wilayahId} value={w.wilayahId}>
                {w.nama}
              </option>
            ))}
          </select>

          {/* Tombol Reset (tampil hanya jika ada filter aktif) */}
          {isFilterActive && (
            <button
              id="btn-reset-filter"
              onClick={handleReset}
              className="py-2.5 px-4 rounded-lg text-sm font-semibold border transition-all shrink-0"
              style={{ borderColor: '#e5e7eb', color: C.gray }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#fca5a5'; e.currentTarget.style.color = '#dc2626'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = C.gray; }}
            >
              ✕ Reset
            </button>
          )}
        </div>

        {/* ── Counter hasil ──────────────────────────────────────────────────── */}
        {!loading && !error && (
          <p className="text-sm mb-4" style={{ color: C.gray }}>
            Menampilkan <span className="font-semibold" style={{ color: C.dark }}>{beasiswaList.length}</span> peluang
            {debouncedKeyword && (
              <> untuk pencarian &ldquo;<span className="font-semibold" style={{ color: C.blue }}>{debouncedKeyword}</span>&rdquo;</>
            )}
          </p>
        )}

        {/* ── Error State ───────────────────────────────────────────────────── */}
        {error && (
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-lg mb-5 text-sm"
            style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c' }}
            role="alert"
          >
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-semibold">Gagal memuat data</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonBeasiswaCard key={i} />)
            : beasiswaList.length === 0
              ? <EmptyState onReset={handleReset} />
              : beasiswaList.map((b) => <BeasiswaCard key={b.beasiswaId} beasiswa={b} />)
          }
        </div>

      </Layout>
    </>
  );
}

// ─── SSR Auth Guard ───────────────────────────────────────────────────────────
export async function getServerSideProps(context) {
  return withAuth(context, 'mahasiswa');
}
