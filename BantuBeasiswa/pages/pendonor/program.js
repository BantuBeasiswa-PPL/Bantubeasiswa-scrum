import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import PendonorLayout from '../../components/layouts/PendonorLayout';
import { withAuth } from '../../lib/auth';

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
  ditutup : { bg: '#fee2e2', color: '#b91c1c', label: 'Ditutup'    },
  selesai : { bg: '#e0e7ff', color: '#3730a3', label: 'Selesai'    },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.draft;
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

// ─── Format Rupiah ───────────────────────────────────────────────────────────
function formatRupiah(angka) {
  if (!angka) return '—';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(angka);
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
}

// ─── Empty State ─────────────────────────────────────────────────────────────
function EmptyState({ onCreate }) {
  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-4">📚</div>
      <h3 className="text-xl font-semibold mb-2" style={{ color: C.dark }}>
        Belum ada program beasiswa
      </h3>
      <p className="text-sm mb-6" style={{ color: C.gray }}>
        Mulai buat program beasiswa pertama Anda untuk membantu mahasiswa berprestasi.
      </p>
      <button
        onClick={onCreate}
        className="px-6 py-3 rounded-lg text-sm font-semibold transition-colors"
        style={{ backgroundColor: C.blue, color: C.white }}
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
    judul: '',
    deskripsi: '',
    syarat: '',
    nominal: '',
    kuota: '',
    deadline: '',
    provinsiIds: [],
  });
  const [provinsiList, setProvinsiList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Update form data ketika initialData berubah (modal dibuka dengan data baru)
  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        judul: initialData?.judul || '',
        deskripsi: initialData?.deskripsi || '',
        syarat: initialData?.syarat || '',
        nominal: initialData?.nominal || '',
        kuota: initialData?.kuota || '',
        deadline: formatDatetimeLocal(initialData?.deadline) || '',
        provinsiIds: initialData?.provinsiIds || [],
      });
    } else if (isOpen && !initialData) {
      // Reset form untuk create mode
      setFormData({
        judul: '',
        deskripsi: '',
        syarat: '',
        nominal: '',
        kuota: '',
        deadline: '',
        provinsiIds: [],
      });
    }
  }, [isOpen, initialData]);

  // Fetch provinsi options
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.judul.trim()) {
      setError('Judul beasiswa wajib diisi');
      return;
    }
    if (!formData.deskripsi?.trim()) {
      setError('Deskripsi beasiswa wajib diisi');
      return;
    }
    if (formData.deskripsi.trim().length < 50) {
      setError('Deskripsi minimal 50 karakter');
      return;
    }
    if (!formData.nominal || formData.nominal <= 0) {
      setError('Nominal harus lebih dari 0');
      return;
    }
    if (!formData.kuota || formData.kuota <= 0) {
      setError('Kuota harus lebih dari 0');
      return;
    }
    if (!formData.deadline) {
      setError('Deadline wajib diisi');
      return;
    }
    if (!isEditMode && formData.provinsiIds.length === 0) {
      setError('Minimal satu provinsi target harus dipilih');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isEditMode 
        ? `/api/pendonor/beasiswa/${initialData.beasiswaId}`
        : '/api/pendonor/beasiswa/create';
      
      const method = isEditMode ? 'PUT' : 'POST';
      
      // Convert nominal to number if string
      const bodyData = {
        ...formData,
        nominal: parseInt(formData.nominal) || 0,
        kuota: parseInt(formData.kuota) || 0,
      };
      
      console.log(`[${method}] Mengirim ke ${endpoint}:`, bodyData);
      
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();
      console.log(`[${method}] Response:`, data);
      
      if (!res.ok) {
        throw new Error(data.message || 'Gagal menyimpan beasiswa');
      }

      console.log('✅ Berhasil menyimpan, memanggil onSuccess...');
      onSuccess();
      onClose();
      setFormData({
        judul: '', deskripsi: '', syarat: '', nominal: '', kuota: '', deadline: '', provinsiIds: []
      });
    } catch (err) {
      console.error('❌ Error:', err);
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold" style={{ color: C.dark }}>
            {isEditMode ? 'Edit Program Beasiswa' : 'Buat Program Beasiswa Baru'}
          </h3>
          <button
            onClick={onClose}
            className="text-2xl leading-none"
            style={{ color: C.gray }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Judul */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: C.dark }}>
              Judul Beasiswa *
            </label>
            <input
              type="text"
              value={formData.judul}
              onChange={(e) => setFormData(prev => ({ ...prev, judul: e.target.value }))}
              placeholder="Contoh: Beasiswa Prestasi Akademik 2026"
              className="w-full px-3 py-2 border rounded-lg text-sm"
              style={{
                borderColor: '#e5e7eb',
                color: C.dark,
                backgroundColor: C.white
              }}
              required
            />
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: C.dark }}>
              Deskripsi
            </label>
            <textarea
              value={formData.deskripsi}
              onChange={(e) => setFormData(prev => ({ ...prev, deskripsi: e.target.value }))}
              placeholder="Jelaskan program beasiswa ini secara detail..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg text-sm resize-vertical"
              style={{
                borderColor: '#e5e7eb',
                color: C.dark,
                backgroundColor: C.white
              }}
            />
          </div>

          {/* Syarat */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: C.dark }}>
              Persyaratan
            </label>
            <textarea
              value={formData.syarat}
              onChange={(e) => setFormData(prev => ({ ...prev, syarat: e.target.value }))}
              placeholder="Syarat-syarat yang harus dipenuhi pendaftar..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg text-sm resize-vertical"
              style={{
                borderColor: '#e5e7eb',
                color: C.dark,
                backgroundColor: C.white
              }}
            />
          </div>

          {/* Nominal & Kuota */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: C.dark }}>
                Nominal per Penerima (Rp) *
              </label>
              <input
                type="number"
                value={formData.nominal}
                onChange={(e) => setFormData(prev => ({ ...prev, nominal: e.target.value }))}
                placeholder="5000000"
                min="1"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                style={{
                  borderColor: '#e5e7eb',
                  color: C.dark,
                  backgroundColor: C.white
                }}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: C.dark }}>
                Kuota Penerima *
              </label>
              <input
                type="number"
                value={formData.kuota}
                onChange={(e) => setFormData(prev => ({ ...prev, kuota: e.target.value }))}
                placeholder="50"
                min="1"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                style={{
                  borderColor: '#e5e7eb',
                  color: C.dark,
                  backgroundColor: C.white
                }}
                required
              />
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: C.dark }}>
              Deadline Pendaftaran *
            </label>
            <input
              type="datetime-local"
              value={formData.deadline}
              onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              style={{
                borderColor: '#e5e7eb',
                color: C.dark,
                backgroundColor: C.white
              }}
              required
            />
          </div>

          {/* Provinsi Target */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: C.dark }}>
              Provinsi Target *
            </label>
            <div className="max-h-40 overflow-y-auto border rounded-lg p-3"
              style={{ borderColor: '#e5e7eb' }}>
              {provinsiList.length === 0 ? (
                <p className="text-sm" style={{ color: C.gray }}>Memuat provinsi...</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {provinsiList.map((p) => (
                    <label key={p.provinsiId} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.provinsiIds.includes(p.provinsiId)}
                        onChange={(e) => handleProvinsiChange(p.provinsiId, e.target.checked)}
                        className="rounded"
                        style={{ accentColor: C.blue }}
                      />
                      <span style={{ color: C.dark }}>{p.nama}</span>
                      {p.isAfirmasi && (
                        <span className="text-xs px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: '#eff6ff', color: C.blue, fontWeight: 600 }}>
                          Afirmasi
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold border transition-colors"
              style={{
                borderColor: '#e5e7eb',
                color: C.gray
              }}
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{
                backgroundColor: loading ? '#9ca3af' : C.blue,
                color: C.white,
                cursor: loading ? 'not-allowed' : 'pointer'
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

  // ── Fetch beasiswa list ────────────────────────────────────────────────────
  const fetchBeasiswa = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('📥 Fetching beasiswa list...');
      const res = await fetch('/api/pendonor/beasiswa');
      if (!res.ok) {
        console.error('❌ API error:', res.status, res.statusText);
        throw new Error('Gagal memuat data');
      }
      const response = await res.json();
      console.log('✅ Daftar beasiswa:', response);
      setBeasiswaList(response.data || []);
    } catch (err) {
      console.error('❌ Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeasiswa();
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCreate = () => {
    setShowCreateModal(true);
  };

  const handleEdit = (beasiswa) => {
    setEditingBeasiswa(beasiswa);
    setShowEditModal(true);
  };

  const handleDelete = async (beasiswa) => {
    if (!confirm(`Hapus program "${beasiswa.judul}"?`)) return;

    try {
      const res = await fetch(`/api/pendonor/beasiswa/${beasiswa.beasiswaId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Gagal menghapus program');
      await fetchBeasiswa(); // Refresh list
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

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
  };

  return (
    <>
      <Head>
        <title>Kelola Program · BantuBeasiswa</title>
      </Head>

      <PendonorLayout user={user}>
        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-7 rounded-full" style={{ backgroundColor: C.gold }} />
            <h1 className="text-2xl font-extrabold" style={{ color: C.dark }}>
              Kelola Program Beasiswa
            </h1>
          </div>
          <p className="text-sm ml-4" style={{ color: C.gray }}>
            Buat dan kelola program beasiswa yang Anda tawarkan
          </p>
        </div>

        {/* ── Action Bar ───────────────────────────────────────────────────── */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-sm" style={{ color: C.gray }}>
            {beasiswaList.length} program beasiswa
          </div>
          <button
            onClick={handleCreate}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{ backgroundColor: C.blue, color: C.white }}
          >
            + Buat Program Baru
          </button>
        </div>

        {/* ── Error State ──────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg mb-5 text-sm"
            style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c' }}
          >
            <span>⚠️ {error}</span>
          </div>
        )}

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

        {/* ── Create/Edit Beasiswa Modal ────────────────────────────────────── */}
        <BeasiswaFormModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchBeasiswa}
        />
        
        {/* ── Edit Beasiswa Modal ───────────────────────────────────────────── */}
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
  return withAuth(context, 'pendonor');
}