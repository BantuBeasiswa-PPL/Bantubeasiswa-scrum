import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import PendonorLayout from '../../components/layouts/PendonorLayout';
import { withPendonorAuth } from '../../lib/auth';

// ─── Color tokens ─────────────────────────────────────────────────────────────
const C = {
  blue : '#0056b3',
  gold : '#ffc107',
  dark : '#333333',
  light: '#f8f9fa',
  white: '#ffffff',
  gray : '#6b7280',
  green: '#059669',
  red  : '#dc2626',
};

// ─── Status Badge ────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  draft   : { bg: '#f3f4f6', color: '#374151', label: 'Draft'     },
  pending : { bg: '#fffbeb', color: '#b45309', label: 'Menunggu Persetujuan' },
  aktif   : { bg: '#d1fae5', color: '#065f46', label: 'Aktif'     },
  ditutup : { bg: '#fee2e2', color: '#b91c1c', label: 'Ditutup'   },
  selesai : { bg: '#e0e7ff', color: '#3730a3', label: 'Selesai'   },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.draft;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 12px',
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 600,
        backgroundColor: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color }) {
  return (
    <div style={{
      background: C.white,
      border: '1px solid #e5e7eb',
      borderTop: `4px solid ${color}`,
      borderRadius: 12,
      padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: C.gray, fontWeight: 600 }}>{label}</span>
        <span style={{
          fontSize: 18, background: `${color}18`, borderRadius: 8,
          width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{icon}</span>
      </div>
      <p style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1, margin: 0 }}>{value}</p>
    </div>
  );
}

// ─── Format Rupiah ───────────────────────────────────────────────────────────
function formatRupiah(angka) {
  if (!angka && angka !== 0) return '—';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(angka);
}

// ─── Format Rupiah Input ─────────────────────────────────────────────────────
function formatRupiahInput(value) {
  const num = String(value).replace(/[^\d]/g, '');
  if (!num) return '';
  return new Intl.NumberFormat('id-ID').format(parseInt(num, 10));
}

function parseRupiahInput(formatted) {
  return parseInt(String(formatted).replace(/[^\d]/g, '') || '0', 10);
}

// ─── Format Tanggal ──────────────────────────────────────────────────────────
function formatTanggal(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ─── Format DateTime untuk input datetime-local ──────────────────────────────
function formatDatetimeLocal(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

<<<<<<< HEAD
// ─── Helper: get applicant count ─────────────────────────────────────────────
function getApplicantCount(beasiswa) {
  if (beasiswa.pendaftaran && Array.isArray(beasiswa.pendaftaran) && beasiswa.pendaftaran.length > 0) {
    return beasiswa.pendaftaran[0]?.count ?? 0;
  }
  return 0;
=======

// ─── Beasiswa Card ───────────────────────────────────────────────────────────
function BeasiswaCard({ beasiswa, onEdit, onDelete, onSubmitApproval }) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className="rounded-xl border p-5 transition-all duration-200 hover:shadow-md"
      style={{ backgroundColor: C.white, borderColor: '#e5e7eb' }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate" style={{ color: C.dark }}>
            {beasiswa.judul}
          </h3>
          <p className="text-sm mt-1" style={{ color: C.gray }}>
            Dibuat {formatTanggal(beasiswa.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <StatusBadge status={beasiswa.status} />
          {showActions && beasiswa.status === 'draft' && (
            <div className="flex gap-1">
              <button
                onClick={() => onEdit(beasiswa)}
                className="p-1.5 rounded text-sm transition-colors"
                style={{ color: C.blue }}
                title="Edit"
              >
                ✏️
              </button>
              <button
                onClick={() => onDelete(beasiswa)}
                className="p-1.5 rounded text-sm transition-colors"
                style={{ color: C.red }}
                title="Hapus"
              >
                🗑️
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="text-sm mb-4 line-clamp-2" style={{ color: C.gray }}>
        {beasiswa.deskripsi || 'Tidak ada deskripsi'}
      </p>

      {beasiswa.alasanPenolakan && beasiswa.status === 'draft' && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          <strong>⚠️ Ditolak Admin:</strong> {beasiswa.alasanPenolakan}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span style={{ color: C.gray }}>Nominal:</span>
          <div className="font-semibold" style={{ color: C.dark }}>
            {formatRupiah(beasiswa.nominal)}
          </div>
        </div>
        <div>
          <span style={{ color: C.gray }}>Kuota:</span>
          <div className="font-semibold" style={{ color: C.dark }}>
            {beasiswa.kuota || '—'} penerima
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center gap-2">
        <div className="text-sm mr-2">
          <span style={{ color: C.gray }}>Deadline:</span>
          <div className="font-semibold" style={{ color: C.dark }}>
            {formatTanggal(beasiswa.deadline)}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {beasiswa.status === 'draft' && (
            <button
              onClick={() => onSubmitApproval(beasiswa)}
              className="px-3.5 py-2 rounded-lg text-sm font-bold text-white transition-all hover:shadow-md active:scale-95 shrink-0"
              style={{ backgroundColor: '#ff9800' }}
            >
              🚀 Ajukan
            </button>
          )}
          <Link
            href={`/beasiswa/${beasiswa.beasiswaId}`}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0"
            style={{ backgroundColor: C.blue, color: C.white }}
          >
            Lihat Detail →
          </Link>
        </div>
      </div>
    </div>
  );
>>>>>>> 52eedbe5d5518f1951926949703ae20406197132
}

// ─── Empty State ─────────────────────────────────────────────────────────────
function EmptyState({ onCreate }) {
  return (
    <div style={{ textAlign: 'center', padding: '64px 20px' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>📚</div>
      <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: C.dark }}>
        Belum ada program beasiswa
      </h3>
      <p style={{ fontSize: 14, marginBottom: 24, color: C.gray }}>
        Mulai buat program beasiswa pertama Anda untuk membantu mahasiswa berprestasi.
      </p>
      <button
        onClick={onCreate}
        style={{
          padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
          backgroundColor: C.blue, color: C.white, border: 'none', cursor: 'pointer',
        }}
      >
        + Buat Program Beasiswa
      </button>
    </div>
  );
}

// ─── Create/Edit Beasiswa Modal ──────────────────────────────────────────────
function BeasiswaFormModal({ isOpen, onClose, onSuccess, initialData = null }) {
  const isEditMode = !!initialData;
  const [formData, setFormData] = useState({
    judul: '', deskripsi: '', syarat: '',
    nominal: '', nominalDisplay: '',
    kuota: '', deadline: '', provinsiIds: [],
  });
  const [provinsiList, setProvinsiList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        judul: initialData?.judul || '',
        deskripsi: initialData?.deskripsi || '',
        syarat: initialData?.syarat || '',
        nominal: initialData?.nominal || '',
        nominalDisplay: initialData?.nominal ? formatRupiahInput(initialData.nominal) : '',
        kuota: initialData?.kuota || '',
        deadline: formatDatetimeLocal(initialData?.deadline) || '',
        provinsiIds: initialData?.provinsiIds || [],
      });
    } else if (isOpen && !initialData) {
      setFormData({
        judul: '', deskripsi: '', syarat: '',
        nominal: '', nominalDisplay: '',
        kuota: '', deadline: '', provinsiIds: [],
      });
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchProvinsi = async () => {
      try {
        const res = await fetch('/api/provinsi');
        if (res.ok) {
          const data = await res.json();
          setProvinsiList(data);
        }
      } catch (err) {
        console.error('Gagal fetch provinsi:', err);
      }
    };
    fetchProvinsi();
  }, [isOpen]);

  const handleNominalChange = (e) => {
    const raw = e.target.value;
    const num = parseRupiahInput(raw);
    setFormData(prev => ({
      ...prev,
      nominal: num,
      nominalDisplay: num ? formatRupiahInput(num) : '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.judul.trim()) { setError('Judul beasiswa wajib diisi'); return; }
    if (!formData.deskripsi?.trim()) { setError('Deskripsi beasiswa wajib diisi'); return; }
    if (formData.deskripsi.trim().length < 50) { setError('Deskripsi minimal 50 karakter'); return; }
    if (!formData.nominal || formData.nominal <= 0) { setError('Nominal harus lebih dari 0'); return; }
    if (!formData.kuota || formData.kuota <= 0) { setError('Kuota harus lebih dari 0'); return; }
    if (!formData.deadline) { setError('Deadline wajib diisi'); return; }
    if (!isEditMode && formData.provinsiIds.length === 0) {
      setError('Minimal satu provinsi target harus dipilih'); return;
    }

    setLoading(true);
    try {
      const endpoint = isEditMode
        ? `/api/pendonor/beasiswa/${initialData.beasiswaId}`
        : '/api/pendonor/beasiswa/create';
      const method = isEditMode ? 'PUT' : 'POST';

      const bodyData = {
        ...formData,
        nominal: parseInt(formData.nominal) || 0,
        kuota: parseInt(formData.kuota) || 0,
      };
      delete bodyData.nominalDisplay;

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menyimpan beasiswa');

      onSuccess();
      onClose();
      setFormData({ judul: '', deskripsi: '', syarat: '', nominal: '', nominalDisplay: '', kuota: '', deadline: '', provinsiIds: [] });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProvinsiChange = (provinsiId, checked) => {
    setFormData(prev => ({
      ...prev,
      provinsiIds: checked
        ? [...prev.provinsiIds, provinsiId]
        : prev.provinsiIds.filter(id => id !== provinsiId)
    }));
  };

  if (!isOpen) return null;

  const inputStyle = {
    width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb',
    borderRadius: 8, fontSize: 14, color: C.dark, backgroundColor: C.white,
    boxSizing: 'border-box', fontFamily: 'inherit',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50,
    }}>
      <div style={{
        background: C.white, borderRadius: 12, padding: 24,
        maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: C.dark, margin: 0 }}>
            {isEditMode ? 'Edit Program Beasiswa' : 'Buat Program Beasiswa Baru'}
          </h3>
          <button onClick={onClose} style={{ fontSize: 24, color: C.gray, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Judul */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4, color: C.dark }}>
              Judul Beasiswa *
            </label>
            <input
              type="text" value={formData.judul}
              onChange={(e) => setFormData(prev => ({ ...prev, judul: e.target.value }))}
              placeholder="Contoh: Beasiswa Prestasi Akademik 2026"
              style={inputStyle} required
            />
          </div>

          {/* Deskripsi */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4, color: C.dark }}>
              Deskripsi *
            </label>
            <textarea
              value={formData.deskripsi}
              onChange={(e) => setFormData(prev => ({ ...prev, deskripsi: e.target.value }))}
              placeholder="Jelaskan program beasiswa ini secara detail (minimal 50 karakter)..."
              rows={3} style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* Syarat */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4, color: C.dark }}>
              Persyaratan
            </label>
            <textarea
              value={formData.syarat}
              onChange={(e) => setFormData(prev => ({ ...prev, syarat: e.target.value }))}
              placeholder="Syarat-syarat yang harus dipenuhi pendaftar..."
              rows={3} style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* Nominal & Kuota */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4, color: C.dark }}>
                Nominal per Penerima (Rp) *
              </label>
              <input
                type="text" value={formData.nominalDisplay}
                onChange={handleNominalChange}
                placeholder="5.000.000"
                style={inputStyle} required
              />
              {formData.nominal > 0 && (
                <p style={{ fontSize: 11, color: C.gray, marginTop: 4 }}>
                  = {formatRupiah(formData.nominal)}
                </p>
              )}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4, color: C.dark }}>
                Kuota Penerima *
              </label>
              <input
                type="number" value={formData.kuota}
                onChange={(e) => setFormData(prev => ({ ...prev, kuota: e.target.value }))}
                placeholder="50" min="1"
                style={inputStyle} required
              />
            </div>
          </div>

          {/* Deadline */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4, color: C.dark }}>
              Deadline Pendaftaran *
            </label>
            <input
              type="datetime-local" value={formData.deadline}
              onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
              style={inputStyle} required
            />
          </div>

          {/* Provinsi Target */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8, color: C.dark }}>
              Provinsi Target *
            </label>
            <div style={{
              maxHeight: 160, overflowY: 'auto', border: '1px solid #e5e7eb',
              borderRadius: 8, padding: 12,
            }}>
              {provinsiList.length === 0 ? (
                <p style={{ fontSize: 14, color: C.gray }}>Memuat provinsi...</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {provinsiList.map((p) => (
                    <label key={p.provinsiId} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                      <input
                        type="checkbox"
                        checked={formData.provinsiIds.includes(p.provinsiId)}
                        onChange={(e) => handleProvinsiChange(p.provinsiId, e.target.checked)}
                        style={{ accentColor: C.blue }}
                      />
                      <span style={{ color: C.dark }}>{p.nama}</span>
                      {p.isAfirmasi && (
                        <span style={{
                          fontSize: 11, padding: '2px 6px', borderRadius: 4,
                          backgroundColor: '#eff6ff', color: C.blue, fontWeight: 600,
                        }}>Afirmasi</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              fontSize: 14, color: '#dc2626', background: '#fef2f2',
              border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16 }}>
            <button
              type="button" onClick={onClose} disabled={loading}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                border: '1px solid #e5e7eb', color: C.gray, backgroundColor: C.white, cursor: 'pointer',
              }}
            >
              Batal
            </button>
            <button
              type="submit" disabled={loading}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                backgroundColor: loading ? '#9ca3af' : C.blue, color: C.white,
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Menyimpan...' : isEditMode ? 'Simpan Perubahan' : 'Buat Program'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function KelolaProgramPage({ user }) {
  const [beasiswaList, setBeasiswaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBeasiswa, setEditingBeasiswa] = useState(null);
  const [publishingId, setPublishingId] = useState(null);

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = {
    total: beasiswaList.length,
    aktif: beasiswaList.filter(b => b.status === 'aktif').length,
    draft: beasiswaList.filter(b => b.status === 'draft').length,
    totalPendaftar: beasiswaList.reduce((sum, b) => sum + getApplicantCount(b), 0),
  };

  // ── Fetch beasiswa list ────────────────────────────────────────────────────
  const fetchBeasiswa = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/pendonor/beasiswa');
      if (!res.ok) throw new Error('Gagal memuat data');
      const response = await res.json();
      setBeasiswaList(response.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBeasiswa(); }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCreate = () => setShowCreateModal(true);

  const handleEdit = (beasiswa) => {
    setEditingBeasiswa(beasiswa);
    setShowEditModal(true);
  };

  const handlePublish = async (beasiswa) => {
    if (beasiswa.status !== 'draft') {
      alert('Hanya program dengan status "Draft" yang dapat dipublish.');
      return;
    }
    if (!confirm(`Publish program "${beasiswa.judul}"? Status akan berubah dari Draft menjadi Aktif.`)) return;

    setPublishingId(beasiswa.beasiswaId);
    try {
      const res = await fetch('/api/pendonor/beasiswa/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beasiswaId: beasiswa.beasiswaId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal mempublish program');

      // Optimistic update
      setBeasiswaList(prev =>
        prev.map(b => b.beasiswaId === beasiswa.beasiswaId ? { ...b, status: 'aktif' } : b)
      );
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setPublishingId(null);
    }
  };

  const handleDelete = async (beasiswa) => {
    // Delete protection
    if (beasiswa.status === 'aktif') {
      alert('Program yang sedang aktif tidak dapat dihapus. Tutup program terlebih dahulu.');
      return;
    }
    const applicants = getApplicantCount(beasiswa);
    if (applicants > 0) {
      alert(`Program ini sudah memiliki ${applicants} pendaftar dan tidak dapat dihapus.`);
      return;
    }

    if (!confirm(`Hapus program "${beasiswa.judul}"? Tindakan ini tidak dapat dibatalkan.`)) return;

    try {
      const res = await fetch(`/api/pendonor/beasiswa/${beasiswa.beasiswaId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus program');
      await fetchBeasiswa();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

<<<<<<< HEAD
  // ── Table cell shared styles ─────────────────────────────────────────────
  const thStyle = {
    padding: '14px 16px', textAlign: 'left', fontSize: 13,
    fontWeight: 600, color: C.dark, whiteSpace: 'nowrap',
  };
  const tdStyle = {
    padding: '14px 16px', fontSize: 14, color: C.dark,
    borderBottom: '1px solid #f3f4f6',
=======
  const handleSubmitApproval = async (beasiswa) => {
    if (!confirm(`Ajukan program beasiswa "${beasiswa.judul}" ke admin untuk disetujui?`)) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/pendonor/beasiswa/${beasiswa.beasiswaId}`, {
        method: 'PATCH',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal mengajukan persetujuan');
      alert('Berhasil diajukan! Program sedang menunggu review admin.');
      await fetchBeasiswa(); // Refresh list
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
>>>>>>> 52eedbe5d5518f1951926949703ae20406197132
  };

  return (
    <>
      <Head>
        <title>Kelola Program · BantuBeasiswa</title>
      </Head>

      <PendonorLayout user={user}>
        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{ width: 4, height: 28, borderRadius: 4, backgroundColor: C.gold }} />
            <h1 style={{ fontSize: 24, fontWeight: 800, color: C.dark, margin: 0 }}>
              Kelola Program Beasiswa
            </h1>
          </div>
          <p style={{ fontSize: 14, color: C.gray, marginLeft: 16 }}>
            Buat dan kelola program beasiswa yang Anda tawarkan
          </p>
        </div>

        {/* ── Stats Cards ──────────────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16, marginBottom: 24,
        }}>
          <StatCard label="Total Program" value={stats.total} icon="📋" color={C.blue} />
          <StatCard label="Aktif" value={stats.aktif} icon="🟢" color={C.green} />
          <StatCard label="Draft" value={stats.draft} icon="📝" color={C.gray} />
          <StatCard label="Total Pendaftar" value={stats.totalPendaftar} icon="👥" color="#8b5cf6" />
        </div>

        {/* ── Action Bar ───────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
        }}>
          <div style={{ fontSize: 14, color: C.gray }}>
            {beasiswaList.length} program beasiswa
          </div>
          <button
            onClick={handleCreate}
            style={{
              padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
              backgroundColor: C.blue, color: C.white, border: 'none', cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.opacity = '0.9'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            + Buat Program Baru
          </button>
        </div>

        {/* ── Error State ──────────────────────────────────────────────────── */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
            borderRadius: 8, marginBottom: 20, fontSize: 14,
            backgroundColor: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c',
          }}>
            ⚠️ {error}
          </div>
        )}

<<<<<<< HEAD
        {/* ── Table ────────────────────────────────────────────────────────── */}
        <div style={{
          background: C.white, borderRadius: 12,
          border: '1px solid #e5e7eb', overflow: 'hidden',
        }}>
          {loading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: C.gray, fontSize: 16 }}>
              ⏳ Memuat daftar program...
            </div>
          ) : beasiswaList.length === 0 ? (
            <EmptyState onCreate={handleCreate} />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={thStyle}>Judul Beasiswa</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Kuota</th>
                    <th style={thStyle}>Batas Waktu</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Pendaftar</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {beasiswaList.map((b, idx) => {
                    const applicants = getApplicantCount(b);
                    const isPublishing = publishingId === b.beasiswaId;
                    return (
                      <tr
                        key={b.beasiswaId}
                        style={{
                          background: idx % 2 === 0 ? C.white : '#fafbfc',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f0f7ff'}
                        onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? C.white : '#fafbfc'}
                      >
                        {/* Judul */}
                        <td style={{ ...tdStyle, maxWidth: 280 }}>
                          <div style={{ fontWeight: 600, color: C.dark, marginBottom: 2 }}>
                            {b.judul}
                          </div>
                          <div style={{ fontSize: 12, color: C.gray }}>
                            {formatRupiah(b.nominal)} per penerima
                          </div>
                        </td>
=======
        {/* ── Beasiswa Grid ────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border p-5 animate-pulse"
                style={{ backgroundColor: C.white, borderColor: '#e5e7eb' }}>
                <div className="h-5 w-3/4 rounded bg-gray-200 mb-3" />
                <div className="h-3 w-1/2 rounded bg-gray-100 mb-4" />
                <div className="space-y-2 mb-4">
                  <div className="h-3 w-full rounded bg-gray-100" />
                  <div className="h-3 w-4/5 rounded bg-gray-100" />
                </div>
                <div className="h-8 w-24 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : beasiswaList.length === 0 ? (
          <EmptyState onCreate={handleCreate} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {beasiswaList.map((b) => (
              <BeasiswaCard
                key={b.beasiswaId}
                beasiswa={b}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSubmitApproval={handleSubmitApproval}
              />
            ))}
          </div>
        )}
>>>>>>> 52eedbe5d5518f1951926949703ae20406197132

                        {/* Status */}
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <StatusBadge status={b.status} />
                        </td>

                        {/* Kuota */}
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span style={{ fontWeight: 600 }}>{applicants}</span>
                          <span style={{ color: C.gray }}> / {b.kuota || '—'}</span>
                        </td>

                        {/* Batas Waktu */}
                        <td style={tdStyle}>
                          {formatTanggal(b.deadline)}
                        </td>

                        {/* Pendaftar */}
                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>
                          {applicants}
                        </td>

                        {/* Aksi */}
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => handleEdit(b)}
                              title="Edit program"
                              style={{
                                padding: '6px 10px', background: '#eff6ff', color: C.blue,
                                border: '1px solid #bfdbfe', borderRadius: 6, cursor: 'pointer',
                                fontSize: 12, fontWeight: 600, transition: 'opacity 0.2s',
                              }}
                            >
                              ✏️ Edit
                            </button>

                            {b.status === 'draft' && (
                              <button
                                onClick={() => handlePublish(b)}
                                disabled={isPublishing}
                                title="Publish program"
                                style={{
                                  padding: '6px 10px',
                                  background: isPublishing ? '#d1d5db' : C.green,
                                  color: C.white,
                                  border: 'none', borderRadius: 6,
                                  cursor: isPublishing ? 'not-allowed' : 'pointer',
                                  fontSize: 12, fontWeight: 600, transition: 'opacity 0.2s',
                                }}
                              >
                                {isPublishing ? '...' : '🚀 Publish'}
                              </button>
                            )}

                            <button
                              onClick={() => handleDelete(b)}
                              title="Hapus program"
                              style={{
                                padding: '6px 10px', background: '#fef2f2', color: C.red,
                                border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer',
                                fontSize: 12, fontWeight: 600, transition: 'opacity 0.2s',
                              }}
                            >
                              🗑️ Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Create Beasiswa Modal ────────────────────────────────────────── */}
        <BeasiswaFormModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchBeasiswa}
        />

        {/* ── Edit Beasiswa Modal ─────────────────────────────────────────── */}
        <BeasiswaFormModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingBeasiswa(null);
          }}
          onSuccess={fetchBeasiswa}
          initialData={editingBeasiswa}
        />
      </PendonorLayout>
    </>
  );
}

// ─── SSR Auth Guard ───────────────────────────────────────────────────────────
export async function getServerSideProps(context) {
  return withPendonorAuth(context);
}