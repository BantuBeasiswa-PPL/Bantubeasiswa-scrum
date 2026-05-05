/**
 * BeasiswaForm Component
 * 
 * Reusable form component for creating and editing scholarship programs (Beasiswa).
 * Supports two modes: create (empty form) and edit (pre-filled form).
 * 
 * Props:
 * - initialData: {object|null} - null for create mode, object for edit mode
 * - onSubmit: {function} - async callback(formData) called on valid submission
 * - onCancel: {function} - callback() called when user clicks "Batal"
 * 
 * @component
 */
import { useState, useEffect } from 'react';

// ─── Color Constants ─────────────────────────────────────────────────────────
const C = {
  primary: '#0056b3',
  gold: '#ffc107',
  dark: '#333333',
  light: '#f8f9fa',
  white: '#ffffff',
  gray: '#6b7280',
  error: '#dc2626',
  border: '#e5e7eb',
};

// ─── Format Rupiah ──────────────────────────────────────────────────────────
function formatRupiah(num) {
  if (!num) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

// ─── Parse Rupiah to Integer ───────────────────────────────────────────────
function parseRupiah(str) {
  if (!str) return 0;
  return parseInt(str.replace(/[^0-9]/g, ''), 10) || 0;
}

// ─── Get Tomorrow's Date (for deadline min) ─────────────────────────────────
function getTomorrowISO() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
}

// ─── Form Validation ────────────────────────────────────────────────────────
function validateForm(formData) {
  const errors = {};

  // Judul validation
  if (!formData.judul?.trim()) {
    errors.judul = 'Judul Beasiswa wajib diisi';
  } else if (formData.judul.length > 150) {
    errors.judul = 'Judul maksimal 150 karakter';
  }

  // Deskripsi validation
  if (!formData.deskripsi?.trim()) {
    errors.deskripsi = 'Deskripsi Program wajib diisi';
  } else if (formData.deskripsi.trim().length < 50) {
    errors.deskripsi = 'Deskripsi minimal 50 karakter';
  }

  // Syarat validation
  if (!formData.syarat?.trim()) {
    errors.syarat = 'Persyaratan Pendaftaran wajib diisi';
  }

  // Nominal validation
  if (!formData.nominal || formData.nominal <= 0) {
    errors.nominal = 'Nominal harus lebih dari 0';
  }

  // Kuota validation
  if (!formData.kuota || formData.kuota < 1) {
    errors.kuota = 'Kuota minimal 1 penerima';
  }

  // Deadline validation
  if (!formData.deadline) {
    errors.deadline = 'Deadline wajib diisi';
  } else {
    const deadlineDate = new Date(formData.deadline);
    const now = new Date();
    if (deadlineDate <= now) {
      errors.deadline = 'Deadline harus di masa mendatang';
    }
  }

  return errors;
}

// ─── Main BeasiswaForm Component ────────────────────────────────────────────
export default function BeasiswaForm({ initialData = null, onSubmit, onCancel }) {
  const isEditMode = !!initialData;
  
  // State management
  const [formData, setFormData] = useState({
    judul: initialData?.judul || '',
    deskripsi: initialData?.deskripsi || '',
    syarat: initialData?.syarat || '',
    nominal: initialData?.nominal || '',
    kuota: initialData?.kuota || '',
    deadline: initialData?.deadline || '',
    status: initialData?.status || 'draft', // 'draft' atau 'publish'
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({}); // Track which fields user has touched

  // Real-time validation as user types
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Mark field as touched
    if (!touched[field]) {
      setTouched(prev => ({ ...prev, [field]: true }));
    }

    // Real-time validation for specific fields
    const newErrors = { ...errors };
    
    if (field === 'judul') {
      if (value.length > 150) {
        newErrors.judul = 'Judul maksimal 150 karakter';
      } else if (!value.trim()) {
        newErrors.judul = 'Judul Beasiswa wajib diisi';
      } else {
        delete newErrors.judul;
      }
    }

    if (field === 'deskripsi') {
      if (value.trim().length < 50 && value.trim().length > 0) {
        newErrors.deskripsi = `Minimal 50 karakter (${value.trim().length}/50)`;
      } else if (!value.trim()) {
        newErrors.deskripsi = 'Deskripsi Program wajib diisi';
      } else {
        delete newErrors.deskripsi;
      }
    }

    if (field === 'nominal') {
      const numValue = parseRupiah(value);
      if (numValue <= 0) {
        newErrors.nominal = 'Nominal harus lebih dari 0';
      } else {
        delete newErrors.nominal;
      }
    }

    if (field === 'deadline') {
      const deadlineDate = new Date(value);
      const now = new Date();
      if (value && deadlineDate <= now) {
        newErrors.deadline = 'Deadline harus di masa mendatang';
      } else {
        delete newErrors.deadline;
      }
    }

    setErrors(newErrors);
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Full validation
    const formErrors = validateForm(formData);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setLoading(true);
    try {
      // Call parent callback with form data
      await onSubmit({
        ...formData,
        nominal: parseRupiah(formData.nominal), // Ensure nominal is integer
      });
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({ submit: error.message || 'Terjadi kesalahan saat menyimpan' });
    } finally {
      setLoading(false);
    }
  };

  // Format nominal display
  const nominalDisplay = formData.nominal ? formatRupiah(parseRupiah(formData.nominal)) : 'Rp 0';

  // Character count for judul
  const judulCount = formData.judul.length;
  const judulPercentage = Math.round((judulCount / 150) * 100);

  // Character count for deskripsi
  const deskripsiCount = formData.deskripsi.trim().length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" style={{ maxWidth: '900px' }}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2" style={{ color: C.dark }}>
          {isEditMode ? 'Edit Program Beasiswa' : 'Tambah Program Beasiswa Baru'}
        </h2>
        <p style={{ color: C.gray }}>
          {isEditMode ? 'Ubah detail program beasiswa Anda' : 'Isi formulir di bawah untuk membuat program beasiswa baru'}
        </p>
      </div>

      {/* ── Submit Error Alert ─────────────────────────────────────────────── */}
      {errors.submit && (
        <div
          className="p-4 rounded-lg border text-sm"
          style={{
            backgroundColor: '#fee2e2',
            borderColor: C.error,
            color: C.error,
          }}
        >
          {errors.submit}
        </div>
      )}

      {/* ── Judul Beasiswa ─────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: C.dark }}>
          Judul Beasiswa <span style={{ color: C.error }}>*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={formData.judul}
            onChange={(e) => handleChange('judul', e.target.value)}
            onBlur={() => handleBlur('judul')}
            placeholder="Contoh: Beasiswa Prestasi Akademik 2026"
            maxLength="150"
            className="w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition"
            style={{
              borderColor: errors.judul ? C.error : touched.judul && !errors.judul ? '#10b981' : C.border,
              boxShadow: errors.judul ? `0 0 0 3px rgba(220, 38, 38, 0.1)` : 'none',
              color: C.dark,
            }}
          />
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-xs" style={{ color: C.gray }}>
            {judulCount}/150
          </div>
        </div>
        {/* Progress bar */}
        <div
          className="mt-2 h-1 rounded-full"
          style={{
            backgroundColor: '#e5e7eb',
            overflow: 'hidden',
          }}
        >
          <div
            className="h-full transition-all duration-200"
            style={{
              width: `${judulPercentage}%`,
              backgroundColor: errors.judul ? C.error : judulPercentage > 90 ? '#f59e0b' : C.primary,
            }}
          />
        </div>
        {errors.judul && touched.judul && (
          <p className="mt-1 text-xs" style={{ color: C.error }}>
            ⚠️ {errors.judul}
          </p>
        )}
      </div>

      {/* ── Deskripsi Program ──────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: C.dark }}>
          Deskripsi Program <span style={{ color: C.error }}>*</span>
        </label>
        <textarea
          value={formData.deskripsi}
          onChange={(e) => handleChange('deskripsi', e.target.value)}
          onBlur={() => handleBlur('deskripsi')}
          placeholder="Jelaskan tujuan beasiswa, benefit yang diberikan, dan profil penerima ideal..."
          rows={4}
          className="w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition resize-none"
          style={{
            borderColor: errors.deskripsi ? C.error : touched.deskripsi && !errors.deskripsi ? '#10b981' : C.border,
            boxShadow: errors.deskripsi ? `0 0 0 3px rgba(220, 38, 38, 0.1)` : 'none',
            color: C.dark,
          }}
        />
        <div className="mt-1 flex justify-between">
          <span className="text-xs" style={{ color: C.gray }}>
            {deskripsiCount}/50 karakter (minimum)
          </span>
          {deskripsiCount < 50 && deskripsiCount > 0 && (
            <span className="text-xs" style={{ color: '#f59e0b' }}>
              Kurang {50 - deskripsiCount} karakter
            </span>
          )}
        </div>
        {errors.deskripsi && touched.deskripsi && (
          <p className="mt-1 text-xs" style={{ color: C.error }}>
            ⚠️ {errors.deskripsi}
          </p>
        )}
      </div>

      {/* ── Persyaratan Pendaftaran ────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: C.dark }}>
          Persyaratan Pendaftaran <span style={{ color: C.error }}>*</span>
        </label>
        <textarea
          value={formData.syarat}
          onChange={(e) => handleChange('syarat', e.target.value)}
          onBlur={() => handleBlur('syarat')}
          placeholder="Satu syarat per baris. Contoh:&#10;- IPK minimal 3.0&#10;- Aktif di organisasi kampus&#10;- Surat rekomendasi dari dosen"
          rows={4}
          className="w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition resize-none"
          style={{
            borderColor: errors.syarat ? C.error : touched.syarat && !errors.syarat ? '#10b981' : C.border,
            boxShadow: errors.syarat ? `0 0 0 3px rgba(220, 38, 38, 0.1)` : 'none',
            color: C.dark,
          }}
        />
        {errors.syarat && touched.syarat && (
          <p className="mt-1 text-xs" style={{ color: C.error }}>
            ⚠️ {errors.syarat}
          </p>
        )}
      </div>

      {/* ── Nominal & Kuota (Two Columns) ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-6">
        {/* Nominal */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: C.dark }}>
            Nominal per Mahasiswa <span style={{ color: C.error }}>*</span>
          </label>
          <div className="relative">
            <span
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-sm font-medium"
              style={{ color: C.gray }}
            >
              Rp
            </span>
            <input
              type="text"
              value={nominalDisplay.replace('Rp ', '')}
              onChange={(e) => {
                const numValue = parseRupiah(e.target.value);
                setFormData(prev => ({ ...prev, nominal: numValue }));
                handleChange('nominal', numValue);
              }}
              onBlur={() => handleBlur('nominal')}
              placeholder="5000000"
              className="w-full pl-12 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition"
              style={{
                borderColor: errors.nominal ? C.error : touched.nominal && !errors.nominal ? '#10b981' : C.border,
                boxShadow: errors.nominal ? `0 0 0 3px rgba(220, 38, 38, 0.1)` : 'none',
                color: C.dark,
              }}
            />
          </div>
          {errors.nominal && touched.nominal && (
            <p className="mt-1 text-xs" style={{ color: C.error }}>
              ⚠️ {errors.nominal}
            </p>
          )}
        </div>

        {/* Kuota */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: C.dark }}>
            Total Kuota Penerima <span style={{ color: C.error }}>*</span>
          </label>
          <input
            type="number"
            value={formData.kuota}
            onChange={(e) => handleChange('kuota', e.target.value)}
            onBlur={() => handleBlur('kuota')}
            placeholder="50"
            min="1"
            className="w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition"
            style={{
              borderColor: errors.kuota ? C.error : touched.kuota && !errors.kuota ? '#10b981' : C.border,
              boxShadow: errors.kuota ? `0 0 0 3px rgba(220, 38, 38, 0.1)` : 'none',
              color: C.dark,
            }}
          />
          {errors.kuota && touched.kuota && (
            <p className="mt-1 text-xs" style={{ color: C.error }}>
              ⚠️ {errors.kuota}
            </p>
          )}
        </div>
      </div>

      {/* ── Deadline & Status (Two Columns) ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-6">
        {/* Deadline */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: C.dark }}>
            Batas Waktu Pendaftaran <span style={{ color: C.error }}>*</span>
          </label>
          <input
            type="datetime-local"
            value={formData.deadline}
            onChange={(e) => handleChange('deadline', e.target.value)}
            onBlur={() => handleBlur('deadline')}
            min={getTomorrowISO()}
            className="w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition"
            style={{
              borderColor: errors.deadline ? C.error : touched.deadline && !errors.deadline ? '#10b981' : C.border,
              boxShadow: errors.deadline ? `0 0 0 3px rgba(220, 38, 38, 0.1)` : 'none',
              color: C.dark,
            }}
          />
          {errors.deadline && touched.deadline && (
            <p className="mt-1 text-xs" style={{ color: C.error }}>
              ⚠️ {errors.deadline}
            </p>
          )}
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: C.dark }}>
            Status Awal <span style={{ color: C.error }}>*</span>
          </label>
          <div className="flex gap-4 items-center h-[42px]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="draft"
                checked={formData.status === 'draft'}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-4 h-4 cursor-pointer"
                style={{ accentColor: C.primary }}
              />
              <span className="text-sm" style={{ color: C.dark }}>Draft</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="publish"
                checked={formData.status === 'publish'}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-4 h-4 cursor-pointer"
                style={{ accentColor: C.primary }}
              />
              <span className="text-sm" style={{ color: C.dark }}>Publish</span>
            </label>
          </div>
        </div>
      </div>

      {/* ── Form Actions ──────────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-6 border-t" style={{ borderColor: C.border }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-2.5 rounded-lg font-medium text-sm transition-all"
          style={{
            backgroundColor: '#e5e7eb',
            color: C.dark,
            opacity: loading ? 0.5 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ml-auto"
          style={{
            backgroundColor: C.primary,
            color: C.white,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading && (
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25" />
              <path
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          {loading ? 'Menyimpan...' : isEditMode ? 'Simpan Perubahan' : 'Simpan Program'}
        </button>
      </div>
    </form>
  );
}
