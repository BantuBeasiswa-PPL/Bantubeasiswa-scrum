import Head from 'next/head';
import Link from 'next/link';
import MahasiswaLayout from '../../components/layouts/MahasiswaLayout';
import { withAuth } from '../../lib/auth';

// ─── Color tokens (sama dengan file lain di project) ─────────────────────────
const C = {
  blue  : '#0056b3',
  gold  : '#ffc107',
  dark  : '#333333',
  light : '#f8f9fa',
  white : '#ffffff',
  gray  : '#6b7280',
};

// ─── Menu Cepat ───────────────────────────────────────────────────────────────
const QUICK_LINKS = [
  {
    id         : 'quick-cari-beasiswa',
    href       : '/mahasiswa/cari',
    icon       : '🔍',
    label      : 'Cari Beasiswa',
    desc       : 'Temukan beasiswa yang sesuai',
    accentColor: C.blue,
  },
  {
    id         : 'quick-pendaftaran',
    href       : '/mahasiswa/pendaftaran',
    icon       : '📋',
    label      : 'Status Pendaftaran',
    desc       : 'Pantau progress pendaftaranmu',
    accentColor: '#7c3aed',
  },
  {
    id         : 'quick-favorit',
    href       : '/mahasiswa/favorit',
    icon       : '⭐',
    label      : 'Beasiswa Favorit',
    desc       : 'Beasiswa yang kamu simpan',
    accentColor: '#d97706',
  },
  {
    id         : 'quick-tutorial',
    href       : '/mahasiswa/tutorial',
    icon       : '📚',
    label      : 'Tutorial Administrasi',
    desc       : 'Panduan kelengkapan dokumen',
    accentColor: '#059669',
  },
];

// ─── Tips ─────────────────────────────────────────────────────────────────────
const TIPS = [
  { text: 'Siapkan transkrip nilai terbaru sebelum mendaftar beasiswa.' },
  { text: 'Tulis esai motivasi yang jujur dan spesifik sesuai program beasiswa.' },
  { text: 'Pantau deadline secara rutin agar tidak kelewatan kesempatan.' },
  { text: 'Simpan beasiswa favorit agar mudah dibandingkan nanti.' },
];

// ─── Quick Link Card ──────────────────────────────────────────────────────────
function QuickLinkCard({ item }) {
  return (
    <Link
      href={item.href}
      id={item.id}
      style={{
        display        : 'block',
        textDecoration : 'none',
        borderRadius   : '12px',
        border         : '1px solid #e5e7eb',
        backgroundColor: C.white,
        padding        : '20px',
        transition     : 'box-shadow 0.2s, transform 0.2s, border-color 0.2s',
        borderTopWidth : '4px',
        borderTopColor : item.accentColor,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow   = '0 4px 20px rgba(0,0,0,0.1)';
        e.currentTarget.style.transform   = 'translateY(-2px)';
        e.currentTarget.style.borderColor = item.accentColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow   = 'none';
        e.currentTarget.style.transform   = 'none';
        e.currentTarget.style.borderColor = '#e5e7eb';
        e.currentTarget.style.borderTopColor = item.accentColor;
      }}
    >
      <div style={{ fontSize: '28px', marginBottom: '10px' }}>{item.icon}</div>
      <p style={{ fontWeight: '700', fontSize: '15px', color: C.dark, marginBottom: '4px' }}>
        {item.label}
      </p>
      <p style={{ fontSize: '13px', color: C.gray }}>
        {item.desc}
      </p>
    </Link>
  );
}

// ─── Halaman Dashboard ────────────────────────────────────────────────────────
export default function MahasiswaDashboardPage({ user }) {
  const namaDepan = user?.nama?.split(' ')[0] ?? 'Mahasiswa';

  return (
    <>
      <Head>
        <title>Dashboard · BantuBeasiswa</title>
        <meta name="description" content="Dashboard mahasiswa BantuBeasiswa — temukan dan pantau beasiswa pilihanmu." />
      </Head>

      <MahasiswaLayout user={user}>

        {/* ── Greeting Banner ───────────────────────────────────────────────── */}
        <div
          style={{
            borderRadius   : '16px',
            background     : `linear-gradient(135deg, ${C.blue} 0%, #0077cc 100%)`,
            padding        : '28px 32px',
            marginBottom   : '28px',
            color          : C.white,
            position       : 'relative',
            overflow       : 'hidden',
          }}
        >
          {/* Dekorasi lingkaran */}
          <div style={{
            position       : 'absolute',
            top            : '-30px',
            right          : '-30px',
            width          : '160px',
            height         : '160px',
            borderRadius   : '50%',
            backgroundColor: 'rgba(255,255,255,0.08)',
          }} />
          <div style={{
            position       : 'absolute',
            bottom         : '-50px',
            right          : '80px',
            width          : '100px',
            height         : '100px',
            borderRadius   : '50%',
            backgroundColor: 'rgba(255,255,255,0.06)',
          }} />

          <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '4px' }}>
            Selamat datang kembali 👋
          </p>
          <h1 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '8px' }}>
            Halo, {namaDepan}!
          </h1>
          <p style={{ fontSize: '14px', opacity: 0.85, maxWidth: '480px' }}>
            Gunakan platform ini untuk menemukan beasiswa yang tepat, memantau proses pendaftaran, dan mengembangkan potensimu.
          </p>

          <Link
            href="/mahasiswa/cari"
            id="btn-mulai-cari"
            style={{
              display        : 'inline-block',
              marginTop      : '16px',
              padding        : '10px 22px',
              backgroundColor: C.gold,
              color          : C.dark,
              borderRadius   : '8px',
              fontWeight     : '700',
              fontSize       : '14px',
              textDecoration : 'none',
              transition     : 'opacity 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Mulai Cari Beasiswa →
          </Link>
        </div>

        {/* ── Section: Menu Cepat ───────────────────────────────────────────── */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: '4px', height: '22px', borderRadius: '9999px', backgroundColor: C.gold }} />
            <h2 style={{ fontSize: '17px', fontWeight: '700', color: C.dark }}>Menu Cepat</h2>
          </div>

          <div style={{
            display              : 'grid',
            gridTemplateColumns  : 'repeat(auto-fill, minmax(200px, 1fr))',
            gap                  : '16px',
          }}>
            {QUICK_LINKS.map((item) => (
              <QuickLinkCard key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* ── Section: Tips & Informasi ─────────────────────────────────────── */}
        <div
          style={{
            borderRadius   : '12px',
            border         : '1px solid #e5e7eb',
            backgroundColor: C.white,
            padding        : '20px 24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: '4px', height: '22px', borderRadius: '9999px', backgroundColor: C.blue }} />
            <h2 style={{ fontSize: '17px', fontWeight: '700', color: C.dark }}>Tips Sukses Beasiswa</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {TIPS.map((tip, i) => (
              <div
                key={i}
                style={{
                  display        : 'flex',
                  alignItems     : 'flex-start',
                  gap            : '12px',
                  padding        : '12px 16px',
                  borderRadius   : '8px',
                  backgroundColor: '#f8faff',
                  border         : '1px solid #e8f0fe',
                }}
              >
                <span style={{ fontSize: '20px', lineHeight: 1 }}>{tip.icon}</span>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>{tip.text}</p>
              </div>
            ))}
          </div>
        </div>

      </MahasiswaLayout>
    </>
  );
}

// ─── SSR Auth Guard ───────────────────────────────────────────────────────────
export async function getServerSideProps(context) {
  return withAuth(context, 'mahasiswa');
}
