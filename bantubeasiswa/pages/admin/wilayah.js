import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/layouts/AdminLayout';
import { withAuth } from '../../lib/auth';

// ─── Constants ───────────────────────────────────────────────────────────────
const TIPE_OPTIONS = ['Terdepan', 'Terluar', 'Tertinggal'];

const TIPE_STYLE = {
  Terdepan   : { bg: '#eff6ff', color: '#1d4ed8', border: '#93c5fd' },
  Terluar    : { bg: '#fef3c7', color: '#b45309', border: '#fcd34d' },
  Tertinggal : { bg: '#fdf2f8', color: '#9d174d', border: '#f9a8d4' },
};

const C = {
  blue  : '#0056b3',
  gold  : '#ffc107',
  dark  : '#333333',
  white : '#ffffff',
  red   : '#dc2626',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function tipeBadge(tipe) {
  const s = TIPE_STYLE[tipe] || { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' };
  return (
    <span
      style={{
        background   : s.bg,
        color        : s.color,
        border       : `1px solid ${s.border}`,
        borderRadius : 6,
        padding      : '2px 10px',
        fontSize     : 11,
        fontWeight   : 600,
        whiteSpace   : 'nowrap',
      }}
    >
      {tipe}
    </span>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ label, count, icon, accentColor }) {
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
      <p style={{ fontSize: 36, fontWeight: 800, color: accentColor, lineHeight: 1 }}>{count}</p>
    </div>
  );
}

// ─── Modal Add/Edit ──────────────────────────────────────────────────────────
function WilayahModal({ mode, initial, onClose, onSubmit, loading }) {
  const [form, setForm] = useState({
    nama       : initial?.nama       || '',
    tipe       : initial?.tipe       || 'Terdepan',
    mode       : initial?.mode       || '3T',
    isAfirmasi : initial?.isAfirmasi ?? false,
    is3T       : initial?.is3T       ?? true,
  });
  const [err, setErr] = useState('');

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.nama.trim()) { setErr('Nama wilayah wajib diisi.'); return; }
    setErr('');
    onSubmit(form);
  }

  return (
    <div
      style={{
        position        : 'fixed', inset: 0, zIndex: 50,
        background      : 'rgba(0,0,0,0.45)',
        display         : 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.white, borderRadius: 12, padding: 28,
          width: '90%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontWeight: 700, fontSize: 17, color: C.dark, marginBottom: 18 }}>
          {mode === 'add' ? '➕ Tambah Wilayah 3T' : '✏️ Edit Wilayah'}
        </h2>

        {err && (
          <p style={{ background: '#fff1f2', color: C.red, borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 14 }}>
            {err}
          </p>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Nama */}
          <div>
            <label style={labelStyle}>Nama Wilayah / Kabupaten *</label>
            <input
              name="nama"
              value={form.nama}
              onChange={handleChange}
              placeholder="cth. Kab. Yahukimo, Papua"
              style={inputStyle}
              required
            />
          </div>

          {/* Tipe */}
          <div>
            <label style={labelStyle}>Kategori 3T *</label>
            <select name="tipe" value={form.tipe} onChange={handleChange} style={inputStyle}>
              {TIPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Mode */}
          <div>
            <label style={labelStyle}>Mode</label>
            <input
              name="mode"
              value={form.mode}
              onChange={handleChange}
              placeholder="3T"
              style={inputStyle}
            />
          </div>

          {/* Checkboxes */}
          <div style={{ display: 'flex', gap: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" name="is3T" checked={form.is3T} onChange={handleChange} />
              <span>Wilayah 3T</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" name="isAfirmasi" checked={form.isAfirmasi} onChange={handleChange} />
              <span>Afirmasi</span>
            </label>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 4, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={btnSecondaryStyle}>Batal</button>
            <button type="submit" disabled={loading} style={btnPrimaryStyle}>
              {loading ? 'Menyimpan...' : mode === 'add' ? 'Tambah' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Reusable styles ─────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid #d1d5db', fontSize: 13, outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box',
};
const labelStyle = { fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 };
const btnPrimaryStyle = {
  background: C.blue, color: C.white, border: 'none',
  padding: '8px 22px', borderRadius: 8, fontSize: 13, fontWeight: 600,
  cursor: 'pointer', opacity: 1,
};
const btnSecondaryStyle = {
  background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db',
  padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

// ─── CSV Export ──────────────────────────────────────────────────────────────
function exportCSV(rows) {
  const header = ['wilayahId', 'Nama Wilayah', 'Tipe', 'Mode', 'is3T', 'isAfirmasi'];
  const lines  = rows.map((r) =>
    [r.wilayahId, `"${r.nama}"`, r.tipe, r.mode, r.is3T, r.isAfirmasi].join(',')
  );
  const csv  = [header.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href     = url;
  a.download = `wilayah-3t-${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function WilayahPage({ user }) {
  const [list,       setList      ] = useState([]);
  const [loading,    setLoading   ] = useState(true);
  const [saving,     setSaving    ] = useState(false);
  const [error,      setError     ] = useState('');
  const [toast,      setToast     ] = useState('');
  const [modal,      setModal     ] = useState(null); // null | { mode:'add' } | { mode:'edit', row }
  const [deleting,   setDeleting  ] = useState(null); // wilayahId yang sedang dihapus

  // ── fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/admin/wilayah');
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Gagal memuat data.'); return; }
      setList(data);
    } catch {
      setError('Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── toast helper ─────────────────────────────────────────────────────────
  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  // ── add ──────────────────────────────────────────────────────────────────
  async function handleAdd(form) {
    setSaving(true);
    try {
      const res  = await fetch('/api/admin/wilayah', {
        method  : 'POST',
        headers : { 'Content-Type': 'application/json' },
        body    : JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { showToast(`❌ ${data.message}`); return; }
      setList((prev) => [...prev, data].sort((a, b) => a.nama.localeCompare(b.nama)));
      setModal(null);
      showToast('✅ Wilayah berhasil ditambahkan.');
    } catch {
      showToast('❌ Gagal menghubungi server.');
    } finally {
      setSaving(false);
    }
  }

  // ── edit ─────────────────────────────────────────────────────────────────
  async function handleEdit(form) {
    const id = modal.row.wilayahId;
    setSaving(true);
    try {
      const res  = await fetch(`/api/admin/wilayah/${id}`, {
        method  : 'PUT',
        headers : { 'Content-Type': 'application/json' },
        body    : JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { showToast(`❌ ${data.message}`); return; }
      setList((prev) =>
        prev.map((r) => (r.wilayahId === id ? data : r))
          .sort((a, b) => a.nama.localeCompare(b.nama))
      );
      setModal(null);
      showToast('✅ Wilayah berhasil diperbarui.');
    } catch {
      showToast('❌ Gagal menghubungi server.');
    } finally {
      setSaving(false);
    }
  }

  // ── delete ───────────────────────────────────────────────────────────────
  async function handleDelete(id) {
    if (!confirm('Hapus wilayah ini? Tindakan tidak dapat dibatalkan.')) return;
    setDeleting(id);
    try {
      const res  = await fetch(`/api/admin/wilayah/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { showToast(`❌ ${data.message}`); return; }
      setList((prev) => prev.filter((r) => r.wilayahId !== id));
      showToast('🗑️ Wilayah berhasil dihapus.');
    } catch {
      showToast('❌ Gagal menghubungi server.');
    } finally {
      setDeleting(null);
    }
  }

  // ── stat counts ──────────────────────────────────────────────────────────
  const stats = {
    Terdepan   : list.filter((r) => r.tipe === 'Terdepan').length,
    Terluar    : list.filter((r) => r.tipe === 'Terluar').length,
    Tertinggal : list.filter((r) => r.tipe === 'Tertinggal').length,
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>Kelola Data Wilayah 3T · BantuBeasiswa Admin</title>
        <meta name="description" content="Manajemen data kabupaten/kota 3T (Terdepan, Terluar, Tertinggal) di platform BantuBeasiswa." />
      </Head>

      <AdminLayout user={user}>

        {/* ── Toast ─────────────────────────────────────────────────────── */}
        {toast && (
          <div
            style={{
              position     : 'fixed', bottom: 24, right: 24, zIndex: 100,
              background   : '#1e293b', color: '#f8fafc',
              padding      : '12px 20px', borderRadius: 10,
              fontSize     : 13, fontWeight: 600,
              boxShadow    : '0 8px 24px rgba(0,0,0,0.25)',
              animation    : 'none',
            }}
          >
            {toast}
          </div>
        )}

        {/* ── Page Header ───────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 4, height: 28, borderRadius: 4, background: C.gold }} />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: C.dark }}>
              Kelola Data Wilayah 3T
            </h1>
          </div>
          <p style={{ fontSize: 13, color: '#6b7280', marginLeft: 14 }}>
            Manajemen daftar kabupaten/kota kategori Terdepan, Terluar, dan Tertinggal
          </p>
        </div>

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {error && (
          <div
            style={{
              background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8,
              padding: '10px 14px', color: C.red, fontSize: 13, marginBottom: 20,
            }}
          >
            {error}
          </div>
        )}

        {/* ── Stat Cards ───────────────────────────────────────────────── */}
        <div
          style={{
            display             : 'grid',
            gridTemplateColumns : 'repeat(auto-fit, minmax(160px, 1fr))',
            gap                 : 16,
            marginBottom        : 24,
          }}
        >
          <StatCard label="Total Wilayah 3T" count={list.length} icon="🗺️" accentColor={C.blue} />
          <StatCard label="Terdepan"          count={stats.Terdepan}   icon="🏅" accentColor="#1d4ed8" />
          <StatCard label="Terluar"           count={stats.Terluar}    icon="🌊" accentColor="#b45309" />
          <StatCard label="Tertinggal"        count={stats.Tertinggal} icon="🏔️" accentColor="#9d174d" />
        </div>

        {/* ── Toolbar ───────────────────────────────────────────────────── */}
        <div
          style={{
            display        : 'flex',
            justifyContent : 'space-between',
            alignItems     : 'center',
            marginBottom   : 14,
            flexWrap       : 'wrap',
            gap            : 10,
          }}
        >
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            Menampilkan <strong>{list.length}</strong> wilayah
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => exportCSV(list)}
              disabled={list.length === 0}
              style={{ ...btnSecondaryStyle, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              ⬇ Export CSV
            </button>
            <button
              onClick={() => setModal({ mode: 'add' })}
              style={{ ...btnPrimaryStyle, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              + Tambah Wilayah
            </button>
          </div>
        </div>

        {/* ── Table ─────────────────────────────────────────────────────── */}
        <div
          style={{
            background: C.white, border: '1px solid #e5e7eb',
            borderRadius: 12, overflow: 'hidden',
          }}
        >
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
              Memuat data wilayah…
            </div>
          ) : list.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🗺️</div>
              <p style={{ fontSize: 14, fontWeight: 600 }}>Belum ada wilayah 3T terdaftar.</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>
                Jalankan seed SQL atau klik <strong>+ Tambah Wilayah</strong>.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    {['#', 'Nama Wilayah', 'Kategori 3T', 'Mode', 'Afirmasi', 'Aksi'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '10px 14px', textAlign: 'left',
                          fontSize: 11, fontWeight: 700, color: '#6b7280',
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.map((row, idx) => (
                    <tr
                      key={row.wilayahId}
                      style={{
                        borderBottom : idx < list.length - 1 ? '1px solid #f3f4f6' : 'none',
                        background   : idx % 2 === 0 ? C.white : '#fafafa',
                      }}
                    >
                      <td style={{ padding: '10px 14px', color: '#9ca3af', width: 36 }}>{idx + 1}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: C.dark }}>{row.nama}</td>
                      <td style={{ padding: '10px 14px' }}>{tipeBadge(row.tipe)}</td>
                      <td style={{ padding: '10px 14px', color: '#6b7280' }}>{row.mode || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          color: row.isAfirmasi ? '#065f46' : '#6b7280',
                          background: row.isAfirmasi ? '#d1fae5' : '#f3f4f6',
                          padding: '2px 8px', borderRadius: 6,
                        }}>
                          {row.isAfirmasi ? 'Ya' : 'Tidak'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => setModal({ mode: 'edit', row })}
                          style={{
                            background: '#eff6ff', color: C.blue, border: 'none',
                            borderRadius: 6, padding: '5px 10px', fontSize: 13,
                            cursor: 'pointer', marginRight: 6,
                          }}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(row.wilayahId)}
                          disabled={deleting === row.wilayahId}
                          style={{
                            background: '#fff1f2', color: C.red, border: 'none',
                            borderRadius: 6, padding: '5px 10px', fontSize: 13,
                            cursor: deleting === row.wilayahId ? 'not-allowed' : 'pointer',
                            opacity: deleting === row.wilayahId ? 0.5 : 1,
                          }}
                          title="Hapus"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </AdminLayout>

      {/* ── Modal ──────────────────────────────────────────────────────── */}
      {modal && (
        <WilayahModal
          mode={modal.mode}
          initial={modal.row}
          onClose={() => setModal(null)}
          onSubmit={modal.mode === 'add' ? handleAdd : handleEdit}
          loading={saving}
        />
      )}
    </>
  );
}

// ─── SSR Guard ───────────────────────────────────────────────────────────────
export async function getServerSideProps(context) {
  return withAuth(context, 'admin');
}
