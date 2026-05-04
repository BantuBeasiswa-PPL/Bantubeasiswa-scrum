import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/layouts/AdminLayout';
import { withAuth } from '../../lib/auth';
import { supabase } from '../../lib/db';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// ─── Color tokens ─────────────────────────────────────────────────────────────
const C = {
  blue      : '#0056b3',
  blue_light: '#3b82f6',
  green     : '#059669',
  gold      : '#ffc107',
  dark      : '#333333',
  white     : '#ffffff',
  red       : '#dc2626',
  gray_light: '#f3f4f6',
};

// ─── Stat Card Component ──────────────────────────────────────────────────────
function StatCard({ label, count, icon, accentColor, subtext }) {
  return (
    <div
      style={{
        background    : C.white,
        border        : '1px solid #e5e7eb',
        borderTop     : `4px solid ${accentColor}`,
        borderRadius  : 12,
        padding       : '18px 20px',
        display       : 'flex',
        flexDirection : 'column',
        gap           : 6,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{label}</span>
        <span
          style={{
            fontSize        : 20,
            background      : `${accentColor}18`,
            borderRadius    : 8,
            width           : 38,
            height          : 38,
            display         : 'flex',
            alignItems      : 'center',
            justifyContent  : 'center',
          }}
        >
          {icon}
        </span>
      </div>
      <p style={{ fontSize: 36, fontWeight: 800, color: accentColor, lineHeight: 1 }}>
        {typeof count === 'number' ? count.toLocaleString('id-ID') : count}
      </p>
      {subtext && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{subtext}</p>}
    </div>
  );
}

// ─── Skeleton Loading ──────────────────────────────────────────────────────────
function SkeletonStatCard() {
  return (
    <div
      style={{
        background: C.white,
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: '18px 20px',
        animation: 'pulse 2s infinite',
      }}
    >
      <div style={{ height: 16, background: '#e5e7eb', borderRadius: 4, marginBottom: 12 }} />
      <div style={{ height: 32, background: '#e5e7eb', borderRadius: 4, width: '60%' }} />
    </div>
  );
}

// ─── Reusable styles ─────────────────────────────────────────────────────────
const btnPrimaryStyle = {
  background: C.blue,
  color: C.white,
  border: 'none',
  padding: '8px 22px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const btnSecondaryStyle = {
  background: C.gray_light,
  color: '#374151',
  border: '1px solid #d1d5db',
  padding: '8px 18px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

// ─── CSV Export Function ──────────────────────────────────────────────────────
function exportToCSV(data, filename) {
  if (!data || data.length === 0) {
    alert('Tidak ada data untuk diexport');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          let value = row[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────
export default function DashboardAnalitikPage({ user }) {
  const [stats, setStats] = useState({
    totalBeasiswaAktif: 0,
    totalPendaftar: 0,
    fulfillmentRate: 0,
    totalKontribusi: 0,
    totalPendonor: 0,
    totalWilayah3T: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [topProvinces, setTopProvinces] = useState([]);
  const [regionalMetrics, setRegionalMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ─── Fetch all data ───────────────────────────────────────────────────────
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Total beasiswa aktif
      const beasiswaRes = await supabase
        .from('beasiswa')
        .select('*', { count: 'exact' })
        .eq('status', 'aktif');

      // 2. Total pendaftar
      const pendaftarRes = await supabase
        .from('pendaftaran')
        .select('*', { count: 'exact' });

      // 3. Total kontribusi donor (confirmed)
      const kontribusiRes = await supabase
        .from('penyaluran_dana')
        .select('jumlah_dana')
        .eq('status', 'confirmed');

      const totalKontribusi = kontribusiRes.data?.reduce(
        (sum, row) => sum + (row.jumlah_dana || 0),
        0
      ) || 0;

      // 3.5 Total pendonor
      const pendonorRes = await supabase
        .from('account')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'pendonor');

      // 4. Fetch wilayah untuk distribusi
      const wilayahRes = await supabase.from('wilayah').select('*');

      // 5. Fetch beasiswa_wilayah untuk mapping
      const beasiswaWilayahRes = await supabase
        .from('beasiswa_wilayah')
        .select('wilayah_id, beasiswa(id)');

      // Build distribution chart
      const distribution = {
        Terdepan: 0,
        Terluar: 0,
        Tertinggal: 0,
      };

      wilayahRes.data?.forEach((w) => {
        if (w.tipe === 'Terdepan') distribution.Terdepan += 1;
        else if (w.tipe === 'Terluar') distribution.Terluar += 1;
        else if (w.tipe === 'Tertinggal') distribution.Tertinggal += 1;
      });

      // 6. Fetch detailed metrics per region
      const regionMetrics = wilayahRes.data?.map((w) => {
        const beasiswaCount = beasiswaWilayahRes.data?.filter(
          (bw) => bw.wilayah_id === w.wilayahId
        ).length || 0;

        return {
          id: w.wilayahId,
          nama: w.nama,
          tipe: w.tipe,
          provinsi: w.provinsi,
          is3T: w.is3T,
          isAfirmasi: w.isAfirmasi,
          totalBeasiswa: beasiswaCount,
          totalPendaftar: Math.floor(Math.random() * 500), // Dummy for now
          alokasiFunds: Math.floor(Math.random() * 500000000),
          successRate: Math.floor(Math.random() * 100),
        };
      }) || [];

      // 7. Get top 3 growth provinces (using dummy data for now)
      const topGrowth = regionMetrics
        .sort((a, b) => b.totalPendaftar - a.totalPendaftar)
        .slice(0, 3);

      // Calculate 3T fulfillment rate
      const total3TProvinces = wilayahRes.data?.filter((w) => w.is3T).length || 0;
      const fulfilled3TProvinces = regionMetrics.filter((m) => m.is3T).length;
      const fulfillmentRate =
        total3TProvinces > 0
          ? Math.round((fulfilled3TProvinces / total3TProvinces) * 100)
          : 0;

      setStats({
        totalBeasiswaAktif: beasiswaRes.count || 0,
        totalPendaftar: pendaftarRes.count || 0,
        fulfillmentRate: fulfillmentRate,
        totalKontribusi: totalKontribusi,
        totalPendonor: pendonorRes.count || 0,
        totalWilayah3T: total3TProvinces,
      });

      setChartData([
        { kategori: 'Terdepan', jumlah: distribution.Terdepan },
        { kategori: 'Terluar', jumlah: distribution.Terluar },
        { kategori: 'Tertinggal', jumlah: distribution.Tertinggal },
      ]);

      setTopProvinces(topGrowth);
      setRegionalMetrics(regionMetrics);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Gagal memuat data analytics. Silakan refresh halaman.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ─── Toggle Afirmasi Status ───────────────────────────────────────────────
  const handleToggleAfirmasi = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('wilayah')
        .update({ isAfirmasi: !currentStatus })
        .eq('wilayahId', id);

      if (error) throw error;

      // Update local state
      setRegionalMetrics((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, isAfirmasi: !currentStatus } : item
        )
      );
    } catch (err) {
      console.error(err);
      alert('Gagal memperbarui status afirmasi');
    }
  };

  // ─── Format currency ──────────────────────────────────────────────────────
  function formatRupiah(value) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>Dashboard Analitik & Statistik · BantuBeasiswa Admin</title>
        <meta
          name="description"
          content="Dashboard gabungan statistik dan analitik platform BantuBeasiswa untuk administrator."
        />
      </Head>

      <AdminLayout user={user}>
        {/* ── Page Header ───────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div
              style={{ width: 4, height: 28, borderRadius: 4, background: C.gold }}
            />
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: C.dark,
              }}
            >
              Dashboard Analitik & Statistik
            </h1>
          </div>
          <p style={{ fontSize: 13, color: '#6b7280', marginLeft: 14 }}>
            Ringkasan performa platform dan analisis distribusi beasiswa secara keseluruhan
          </p>
        </div>

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {error && (
          <div
            style={{
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              borderRadius: 8,
              padding: '10px 14px',
              color: C.red,
              fontSize: 13,
              marginBottom: 20,
            }}
          >
            {error}
          </div>
        )}

        {/* ── Stat Cards ────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}
        >
          {loading ? (
            <>
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
            </>
          ) : (
            <>
              <StatCard
                label="Total Beasiswa Aktif"
                count={stats.totalBeasiswaAktif}
                icon="🎓"
                accentColor={C.blue}
                subtext="Program beasiswa sedang berjalan"
              />
              <StatCard
                label="Total Pendaftar"
                count={stats.totalPendaftar}
                icon="👥"
                accentColor="#7c3aed"
                subtext="Semua pendaftaran beasiswa"
              />
              <StatCard
                label="Mitra Pendonor"
                count={stats.totalPendonor}
                icon="🏢"
                accentColor="#059669"
                subtext="Pendonor terdaftar di platform"
              />
              <StatCard
                label="Wilayah 3T Terdaftar"
                count={stats.totalWilayah3T}
                icon="🗺️"
                accentColor="#d97706"
                subtext="Wilayah terdepan, terluar, tertinggal"
              />
              <StatCard
                label="3T Priority Fulfillment"
                count={`${stats.fulfillmentRate}%`}
                icon="🎯"
                accentColor={C.green}
                subtext="Tingkat pemenuhan wilayah 3T"
              />
              <StatCard
                label="Total Kontribusi Donor"
                count={formatRupiah(stats.totalKontribusi)}
                icon="💰"
                accentColor={C.gold}
                subtext="Dana yang disalurkan"
              />
            </>
          )}
        </div>

        {/* ── Additional Placeholders from Statistik Dashboard ────────────── */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
            {/* Recent Activity placeholder */}
            <div
              style={{
                background: C.white,
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>Aktivitas Terbaru</h2>
                <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 9999, background: '#e8f0fb', color: C.blue, fontWeight: 500 }}>
                  Coming soon
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#6b7280' }}>Tabel aktivitas pendaftaran akan ditampilkan di sini</p>
                <p style={{ fontSize: 12, marginTop: 4, color: '#9ca3af' }}>Fitur ini sedang dalam pengembangan</p>
              </div>
            </div>

            {/* Quick Stats / Distribusi placeholder */}
            <div
              style={{
                background: C.white,
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>Distribusi Status</h2>
                <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 9999, background: '#e8f0fb', color: C.blue, fontWeight: 500 }}>
                  Coming soon
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🥧</div>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#6b7280' }}>Chart distribusi status pendaftaran</p>
                <p style={{ fontSize: 12, marginTop: 4, color: '#9ca3af' }}>(Recharts — segera hadir)</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Bar Chart Section ─────────────────────────────────────────── */}
        {!loading && chartData.length > 0 && (
          <div
            style={{
              background: C.white,
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: '20px',
              marginBottom: 24,
            }}
          >
            <h2
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: C.dark,
                marginBottom: 16,
              }}
            >
              📊 Distribusi Pendaftar per Kategori Wilayah
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="kategori" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    background: C.white,
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                  }}
                />
                <Legend />
                <Bar
                  dataKey="jumlah"
                  fill={C.blue_light}
                  radius={[8, 8, 0, 0]}
                  name="Jumlah Wilayah"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Top Growth Provinces ──────────────────────────────────────── */}
        {!loading && topProvinces.length > 0 && (
          <div
            style={{
              background: C.white,
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: '20px',
              marginBottom: 24,
            }}
          >
            <h2
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: C.dark,
                marginBottom: 16,
              }}
            >
              📈 Top 3 Provinsi dengan Pertumbuhan Terbesar
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
              }}
            >
              {topProvinces.map((prov, idx) => (
                <div
                  key={prov.id}
                  style={{
                    background: C.gray_light,
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: '14px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: C.blue,
                      }}
                    >
                      #{idx + 1}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: C.dark,
                      }}
                    >
                      {prov.nama}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#6b7280',
                      marginBottom: 4,
                    }}
                  >
                    Pendaftar: <strong>{prov.totalPendaftar}</strong>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#6b7280',
                    }}
                  >
                    Kategori: <strong>{prov.tipe}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Setup Database Provinsi Afirmasi ───────────────────────────── */}
        {!loading && (
          <div
            style={{
              background: C.white,
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: '20px',
              marginBottom: 24,
            }}
          >
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: C.dark }}>
                Setup Database Provinsi Afirmasi
              </h2>
              <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                Kelola status prioritas 16 entitas provinsi kategori afirmasi. Status ini digunakan sebagai filter pencarian mahasiswa.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 20,
              }}
            >
              {/* Peta Placeholder */}
              <div
                style={{
                  background: C.gray_light,
                  borderRadius: 8,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px dashed #d1d5db',
                  minHeight: 300,
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>
                  Peta Distribusi Wilayah Afirmasi
                </h3>
                <p
                  style={{
                    fontSize: 12,
                    color: '#6b7280',
                    textAlign: 'center',
                    marginTop: 8,
                  }}
                >
                  Visualisasi peta wilayah afirmasi sedang dalam tahap integrasi dengan pustaka pemetaan.
                </p>
                <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: C.blue,
                      }}
                    />
                    <span style={{ fontSize: 12, color: C.dark }}>Prioritas Utama</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: '#d1d5db',
                      }}
                    />
                    <span style={{ fontSize: 12, color: C.dark }}>Non-Afirmasi</span>
                  </div>
                </div>
              </div>

              {/* Daftar Provinsi Afirmasi */}
              <div>
                <div
                  style={{
                    overflowY: 'auto',
                    maxHeight: 400,
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                  }}
                >
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: 13,
                    }}
                  >
                    <thead
                      style={{
                        position: 'sticky',
                        top: 0,
                        background: '#f9fafb',
                        zIndex: 1,
                        borderBottom: '1px solid #e5e7eb',
                      }}
                    >
                      <tr>
                        <th
                          style={{
                            padding: '12px 14px',
                            textAlign: 'left',
                            fontWeight: 600,
                            color: '#6b7280',
                          }}
                        >
                          Nama Wilayah
                        </th>
                        <th
                          style={{
                            padding: '12px 14px',
                            textAlign: 'left',
                            fontWeight: 600,
                            color: '#6b7280',
                          }}
                        >
                          Kategori
                        </th>
                        <th
                          style={{
                            padding: '12px 14px',
                            textAlign: 'center',
                            fontWeight: 600,
                            color: '#6b7280',
                          }}
                        >
                          Status Afirmasi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {regionalMetrics.map((row) => (
                        <tr
                          key={`afirmasi-${row.id}`}
                          style={{ borderBottom: '1px solid #f3f4f6' }}
                        >
                          <td
                            style={{
                              padding: '12px 14px',
                              fontWeight: 500,
                              color: C.dark,
                            }}
                          >
                            {row.nama}
                          </td>
                          <td
                            style={{
                              padding: '12px 14px',
                              color: '#6b7280',
                            }}
                          >
                            {row.tipe || 'Provinsi'}
                          </td>
                          <td
                            style={{
                              padding: '12px 14px',
                              textAlign: 'center',
                            }}
                          >
                            <button
                              onClick={() => handleToggleAfirmasi(row.id, row.isAfirmasi)}
                              style={{
                                background: row.isAfirmasi ? C.blue : '#e5e7eb',
                                border: 'none',
                                borderRadius: 20,
                                width: 44,
                                height: 24,
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                              }}
                              title={
                                row.isAfirmasi
                                  ? 'Nonaktifkan status afirmasi'
                                  : 'Aktifkan status afirmasi'
                              }
                            >
                              <div
                                style={{
                                  position: 'absolute',
                                  top: 2,
                                  left: row.isAfirmasi ? 22 : 2,
                                  width: 20,
                                  height: 20,
                                  background: '#fff',
                                  borderRadius: '50%',
                                  transition: 'all 0.2s',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                }}
                              />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Detailed Regional Metrics Table ───────────────────────────── */}
        {!loading && (
          <div
            style={{
              background: C.white,
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              overflow: 'hidden',
              marginBottom: 24,
            }}
          >
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <h2
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: C.dark,
                  }}
                >
                  📋 Detail Metrik Regional
                </h2>
                <button
                  onClick={() =>
                    exportToCSV(regionalMetrics, 'regional-metrics')
                  }
                  style={btnSecondaryStyle}
                >
                  ⬇ Export CSV
                </button>
              </div>
            </div>

            {regionalMetrics.length === 0 ? (
              <div
                style={{
                  padding: 40,
                  textAlign: 'center',
                  color: '#9ca3af',
                }}
              >
                <p style={{ fontSize: 14, fontWeight: 600 }}>
                  Belum ada data regional.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: '#f9fafb',
                        borderBottom: '1px solid #e5e7eb',
                      }}
                    >
                      {[
                        'Nama Wilayah',
                        'Kategori',
                        'Total Pendaftar',
                        'Alokasi Dana',
                        'Success Rate',
                        'Status',
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: '10px 14px',
                            textAlign: 'left',
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {regionalMetrics.map((row, idx) => (
                      <tr
                        key={row.id}
                        style={{
                          borderBottom:
                            idx < regionalMetrics.length - 1
                              ? '1px solid #f3f4f6'
                              : 'none',
                          background: idx % 2 === 0 ? C.white : '#fafafa',
                        }}
                      >
                        <td
                          style={{
                            padding: '10px 14px',
                            fontWeight: 600,
                            color: C.dark,
                          }}
                        >
                          {row.nama}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span
                            style={{
                              background:
                                row.tipe === 'Terdepan'
                                  ? '#eff6ff'
                                  : row.tipe === 'Terluar'
                                  ? '#fef3c7'
                                  : '#fdf2f8',
                              color:
                                row.tipe === 'Terdepan'
                                  ? '#1d4ed8'
                                  : row.tipe === 'Terluar'
                                  ? '#b45309'
                                  : '#9d174d',
                              border:
                                row.tipe === 'Terdepan'
                                  ? '1px solid #93c5fd'
                                  : row.tipe === 'Terluar'
                                  ? '1px solid #fcd34d'
                                  : '1px solid #f9a8d4',
                              borderRadius: 6,
                              padding: '2px 10px',
                              fontSize: 11,
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {row.tipe}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: C.dark }}>
                          {row.totalPendaftar}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#6b7280' }}>
                          {formatRupiah(row.alokasiFunds)}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                width: 60,
                                height: 6,
                                background: '#e5e7eb',
                                borderRadius: 3,
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  height: '100%',
                                  width: `${row.successRate}%`,
                                  background: C.green,
                                }}
                              />
                            </div>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: C.dark,
                              }}
                            >
                              {row.successRate}%
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span
                            style={{
                              background: row.is3T
                                ? 'rgba(34,197,94,0.1)'
                                : 'rgba(107,114,128,0.1)',
                              color: row.is3T ? '#059669' : '#6b7280',
                              borderRadius: 6,
                              padding: '2px 8px',
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {row.is3T ? '✓ Aktif' : 'Standar'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </AdminLayout>
    </>
  );
}

export function getServerSideProps(context) {
  const result = withAuth(context, 'admin');
  if (result.redirect) return result;
  return result;
}
