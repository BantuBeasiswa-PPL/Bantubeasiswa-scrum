import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/layouts/AdminLayout';
import { withAuth } from '../../lib/auth';
import { supabase } from '../../lib/db';

// ─── Color tokens ─────────────────────────────────────────────────────────────
const C = {
  blue      : '#0056b3',
  blue_light: '#3b82f6',
  green     : '#059669',
  gold      : '#d97706',
  dark      : '#1e293b',
  white     : '#ffffff',
  red       : '#dc2626',
  gray      : '#6b7280',
  gray_light: '#f3f4f6',
  purple    : '#7c3aed',
};

// ─── 16 provinsi afirmasi resmi ───────────────────────────────────────────────
const PROVINSI_AFIRMASI_RESMI = [
  'Papua','Papua Barat','Papua Pegunungan','Papua Selatan','Papua Tengah','Papua Barat Daya',
  'Maluku','Maluku Utara','Nusa Tenggara Timur','Nusa Tenggara Barat',
  'Sulawesi Tengah','Sulawesi Tenggara','Sulawesi Barat',
  'Kalimantan Utara','Kalimantan Barat','Kalimantan Tengah',
];

// ─── Peta visual provinsi (grid bubble) ──────────────────────────────────────
function AfirmasiMap({ provinsiList, onToggle, saving }) {
  // Kelompokkan per pulau
  const groups = [
    {
      label: 'Papua & Maluku',
      icon: '🌴',
      names: ['Papua','Papua Barat','Papua Pegunungan','Papua Selatan','Papua Tengah',
              'Papua Barat Daya','Maluku','Maluku Utara'],
    },
    {
      label: 'Nusa Tenggara & Sulawesi',
      icon: '🌊',
      names: ['Nusa Tenggara Timur','Nusa Tenggara Barat','Sulawesi Tengah',
              'Sulawesi Tenggara','Sulawesi Barat'],
    },
    {
      label: 'Kalimantan',
      icon: '🌿',
      names: ['Kalimantan Utara','Kalimantan Barat','Kalimantan Tengah'],
    },
  ];

  const getProvinsi = (nama) => provinsiList.find(
    (p) => p.nama.toLowerCase() === nama.toLowerCase()
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {groups.map((group) => (
        <div key={group.label}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.gray, marginBottom: 10,
            textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {group.icon} {group.label}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {group.names.map((nama) => {
              const prov = getProvinsi(nama);
              const isAfirmasi = prov?.isAfirmasi ?? false;
              const isSaving = saving === prov?.provinsiId;
              return (
                <button
                  key={nama}
                  disabled={isSaving || !prov}
                  onClick={() => prov && onToggle(prov.provinsiId, !isAfirmasi)}
                  title={prov ? `Klik untuk ${isAfirmasi ? 'nonaktifkan' : 'aktifkan'} afirmasi` : 'Belum ada di database'}
                  style={{
                    padding      : '6px 14px',
                    borderRadius : 20,
                    fontSize     : 12,
                    fontWeight   : 600,
                    cursor       : prov ? 'pointer' : 'not-allowed',
                    border       : `2px solid ${isAfirmasi ? C.blue : '#d1d5db'}`,
                    background   : isAfirmasi ? `${C.blue}18` : C.gray_light,
                    color        : isAfirmasi ? C.blue : C.gray,
                    opacity      : isSaving ? 0.5 : 1,
                    transition   : 'all 0.2s',
                    display      : 'flex',
                    alignItems   : 'center',
                    gap          : 5,
                  }}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: isAfirmasi ? C.blue : '#d1d5db',
                    flexShrink: 0,
                  }} />
                  {nama}
                  {isSaving && ' ⏳'}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }) {
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: checked ? C.blue : '#d1d5db',
        cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', transition: 'background 0.2s',
        opacity: disabled ? 0.5 : 1, flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 2,
        left: checked ? 22 : 2,
        width: 20, height: 20, borderRadius: '50%',
        background: C.white,
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, sub }) {
  return (
    <div style={{
      background: C.white, border: '1px solid #e5e7eb',
      borderTop: `4px solid ${color}`, borderRadius: 12,
      padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: C.gray, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 18, background: `${color}18`, borderRadius: 8,
          width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </span>
      </div>
      <p style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DashboardAnalitikPage({ user }) {
  const [provinsiList, setProvinsiList] = useState([]);
  const [stats3T, setStats3T]           = useState({ total: 0, terdepan: 0, terluar: 0, tertinggal: 0 });
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(null); // provinsiId yang sedang disimpan
  const [toast, setToast]               = useState('');
  const [error, setError]               = useState('');
  const [search, setSearch]             = useState('');

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [provRes, wilRes] = await Promise.all([
        fetch('/api/provinsi'),
        supabase.from('wilayah').select('jenis_3t, is3T').eq('is3T', true),
      ]);

      const provData = await provRes.json();
      if (!provRes.ok) throw new Error(provData.message || 'Gagal memuat provinsi');

      setProvinsiList(provData);

      const wil = wilRes.data || [];
      setStats3T({
        total      : wil.length,
        terdepan   : wil.filter((w) => w.jenis_3t === 'Terdepan').length,
        terluar    : wil.filter((w) => w.jenis_3t === 'Terluar').length,
        tertinggal : wil.filter((w) => w.jenis_3t === 'Tertinggal').length,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── toggle afirmasi ────────────────────────────────────────────────────────
  async function handleToggle(provinsiId, newVal) {
    setSaving(provinsiId);
    try {
      const res  = await fetch('/api/admin/provinsi', {
        method  : 'PATCH',
        headers : { 'Content-Type': 'application/json' },
        body    : JSON.stringify({ provinsiId, isAfirmasi: newVal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal update');

      setProvinsiList((prev) =>
        prev.map((p) => p.provinsiId === provinsiId ? { ...p, isAfirmasi: newVal } : p)
      );
      showToast(`✅ ${data.nama} — status afirmasi ${newVal ? 'diaktifkan' : 'dinonaktifkan'}`);
    } catch (err) {
      showToast(`❌ ${err.message}`);
    } finally {
      setSaving(null);
    }
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  // ── derived ────────────────────────────────────────────────────────────────
  const totalAfirmasi  = provinsiList.filter((p) => p.isAfirmasi).length;
  const filteredProv   = provinsiList.filter((p) =>
    p.nama.toLowerCase().includes(search.toLowerCase())
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>Dashboard Analitik Wilayah · BantuBeasiswa Admin</title>
        <meta name="description" content="Analitik distribusi beasiswa dan manajemen provinsi afirmasi" />
      </Head>

      <AdminLayout user={user}>
        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 200,
            background: '#1e293b', color: '#f8fafc',
            padding: '12px 20px', borderRadius: 10,
            fontSize: 13, fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          }}>
            {toast}
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 4, height: 28, borderRadius: 4, background: C.gold }} />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: C.dark }}>
              Dashboard Analitik Wilayah
            </h1>
          </div>
          <p style={{ fontSize: 13, color: C.gray, marginLeft: 14 }}>
            Kelola status prioritas provinsi afirmasi dan pantau distribusi wilayah 3T
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: '#fff1f2', border: '1px solid #fecdd3',
            borderRadius: 8, padding: '10px 14px', color: C.red,
            fontSize: 13, marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        {/* Stat Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16, marginBottom: 28,
        }}>
          <StatCard label="Provinsi Afirmasi Aktif" value={loading ? '…' : totalAfirmasi}
            icon="🏛️" color={C.blue} sub="Toggle aktif di panel bawah" />
          <StatCard label="Total Wilayah 3T" value={loading ? '…' : stats3T.total}
            icon="🗺️" color={C.green} sub="Terdepan + Terluar + Tertinggal" />
          <StatCard label="Terdepan" value={loading ? '…' : stats3T.terdepan}
            icon="🏅" color="#1d4ed8" sub="Wilayah perbatasan terdepan" />
          <StatCard label="Terluar" value={loading ? '…' : stats3T.terluar}
            icon="🌊" color="#b45309" sub="Pulau/wilayah terluar" />
          <StatCard label="Tertinggal" value={loading ? '…' : stats3T.tertinggal}
            icon="🏔️" color="#9d174d" sub="Wilayah tertinggal pembangunan" />
        </div>

        {/* ── Peta Distribusi Afirmasi ─────────────────────────────────────── */}
        <div style={{
          background: C.white, border: '1px solid #e5e7eb',
          borderRadius: 12, overflow: 'hidden', marginBottom: 24,
        }}>
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid #e5e7eb',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>
                🗺️ Peta Distribusi Wilayah Afirmasi
              </h2>
              <p style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>
                Klik tombol provinsi untuk mengubah status prioritas afirmasi
              </p>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: C.blue, display: 'inline-block' }} />
                Prioritas Aktif
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#d1d5db', display: 'inline-block' }} />
                Non-Afirmasi
              </span>
            </div>
          </div>
          <div style={{ padding: 20 }}>
            {loading ? (
              <div style={{ textAlign: 'center', color: C.gray, padding: 40, fontSize: 14 }}>
                Memuat data provinsi…
              </div>
            ) : (
              <AfirmasiMap
                provinsiList={provinsiList}
                onToggle={handleToggle}
                saving={saving}
              />
            )}
          </div>
        </div>

        {/* ── Panel Manajemen Provinsi Afirmasi ─────────────────────────────── */}
        <div style={{
          background: C.white, border: '1px solid #e5e7eb',
          borderRadius: 12, overflow: 'hidden', marginBottom: 24,
        }}>
          {/* Header panel */}
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid #e5e7eb',
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', flexWrap: 'wrap', gap: 12,
          }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>
                ⚙️ Manajemen Status Prioritas Provinsi
              </h2>
              <p style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>
                Aktifkan toggle untuk menjadikan provinsi sebagai prioritas afirmasi
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="text"
                placeholder="🔍 Cari provinsi…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: '7px 12px', borderRadius: 8,
                  border: '1px solid #d1d5db', fontSize: 13,
                  outline: 'none', width: 200,
                }}
              />
              <span style={{
                background: `${C.blue}15`, color: C.blue,
                borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700,
              }}>
                {totalAfirmasi} Aktif
              </span>
            </div>
          </div>

          {/* Tabel provinsi */}
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: C.gray }}>
              Memuat…
            </div>
          ) : filteredProv.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: C.gray }}>
              Tidak ada provinsi yang cocok dengan pencarian.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e2e8f0' }}>
                    {['#', 'Nama Provinsi', 'Referensi Resmi', 'Status Afirmasi', 'Aksi'].map((h) => (
                      <th key={h} style={{
                        padding: '10px 16px', textAlign: 'left',
                        fontSize: 11, fontWeight: 700, color: '#374151',
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                        whiteSpace: 'nowrap',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProv.map((prov, idx) => {
                    const isResmi   = PROVINSI_AFIRMASI_RESMI.some(
                      (n) => n.toLowerCase() === prov.nama.toLowerCase()
                    );
                    const isSaving  = saving === prov.provinsiId;
                    return (
                      <tr
                        key={prov.provinsiId}
                        style={{
                          borderBottom: '1px solid #f3f4f6',
                          background: prov.isAfirmasi ? `${C.blue}06` : C.white,
                          transition: 'background 0.15s',
                        }}
                      >
                        <td style={{ padding: '10px 16px', color: '#9ca3af', width: 36 }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '10px 16px', fontWeight: 600, color: C.dark }}>
                          {prov.nama}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          {isResmi ? (
                            <span style={{
                              background: '#eff6ff', color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              borderRadius: 6, padding: '2px 10px',
                              fontSize: 11, fontWeight: 600,
                            }}>
                              ✓ 16 Provinsi Resmi
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: prov.isAfirmasi ? '#d1fae5' : C.gray_light,
                            color: prov.isAfirmasi ? '#065f46' : C.gray,
                            border: `1px solid ${prov.isAfirmasi ? '#6ee7b7' : '#e5e7eb'}`,
                            borderRadius: 20, padding: '3px 10px',
                            fontSize: 11, fontWeight: 700,
                          }}>
                            <span style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: prov.isAfirmasi ? '#059669' : '#d1d5db',
                            }} />
                            {prov.isAfirmasi ? 'Aktif' : 'Tidak Aktif'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Toggle
                              checked={prov.isAfirmasi}
                              onChange={(val) => handleToggle(prov.provinsiId, val)}
                              disabled={isSaving}
                            />
                            {isSaving && (
                              <span style={{ fontSize: 11, color: C.gray }}>Menyimpan…</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer info */}
          <div style={{
            padding: '12px 20px', borderTop: '1px solid #f3f4f6',
            background: '#fafafa', fontSize: 12, color: C.gray,
          }}>
            💡 Status ini digunakan sebagai filter pencarian beasiswa untuk mahasiswa dari provinsi afirmasi.
            Total provinsi: <strong>{provinsiList.length}</strong> | Aktif afirmasi: <strong>{totalAfirmasi}</strong>
          </div>
        </div>

      </AdminLayout>
    </>
  );
}

export async function getServerSideProps(context) {
  return withAuth(context, 'admin');
}
