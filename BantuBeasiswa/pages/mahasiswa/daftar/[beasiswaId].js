import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import MahasiswaLayout from '../../../components/layouts/MahasiswaLayout';
import { supabase } from '../../../lib/db';
import { uploadDokumen } from '../../../lib/uploadDokumen';
import { withAuth } from '../../../lib/auth';

/* ── Step definitions ─────────────────────────────────────────── */
const STEPS = ['Personal', 'Academic', 'Documents', 'Review'];

/* ─────────────────────────────────────────────────────────────────
   INLINE SVG ICONS (no extra deps)
   ───────────────────────────────────────────────────────────────── */
function IconCheck({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconUpload() {
  return (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
function IconFile() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}
function IconInfo() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function IconChevronRight() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
function IconChevronLeft() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function IconSend() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STEP PROGRESS BAR
   ═══════════════════════════════════════════════════════════════ */
function StepBar({ current }) {
  return (
    <div className="flex items-center justify-between mb-8 px-2" role="list" aria-label="Form steps">
      {STEPS.map((label, idx) => {
        const isDone = idx < current;
        const isActive = idx === current;
        const isPending = idx > current;

        return (
          <div key={label} className="flex items-center flex-1" role="listitem">
            {/* ── Connector line (before first excluded) ── */}
            {idx > 0 && (
              <div
                className={[
                  'flex-1 h-0.5 mx-1 transition-colors duration-300',
                  isDone ? 'bg-[#0056b3]' : 'bg-gray-200',
                ].join(' ')}
              />
            )}

            {/* ── Step circle + label ── */}
            <button
              type="button"
              disabled
              aria-current={isActive ? 'step' : undefined}
              className="flex flex-col items-center gap-1 min-w-[60px] group"
            >
              <div
                className={[
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold',
                  'transition-all duration-300 shadow-sm',
                  isDone
                    ? 'bg-[#0056b3] text-white ring-2 ring-[#0056b3]/30'
                    : isActive
                      ? 'bg-[#0056b3] text-white ring-4 ring-[#0056b3]/20 scale-110'
                      : 'bg-white text-gray-400 border-2 border-gray-200',
                ].join(' ')}
              >
                {isDone ? <IconCheck size={16} /> : <span>{idx + 1}</span>}
              </div>
              <span
                className={[
                  'text-xs leading-tight text-center transition-colors duration-200',
                  isActive ? 'text-[#0056b3] font-semibold' : '',
                  isDone ? 'text-[#0056b3]/70 font-medium' : '',
                  isPending ? 'text-gray-400' : '',
                ].join(' ')}
              >
                {label}
              </span>
            </button>

            {/* ── Connector line (after last excluded) ── */}
            {idx < STEPS.length - 1 && (
              <div
                className={[
                  'flex-1 h-0.5 mx-1 transition-colors duration-300',
                  idx < current ? 'bg-[#0056b3]' : 'bg-gray-200',
                ].join(' ')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   REUSABLE FIELD COMPONENTS
   ═══════════════════════════════════════════════════════════════ */
function Field({ label, required, error, children, hint }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
      {error && <p className="text-xs text-red-500 flex items-center gap-1">⚠ {error}</p>}
    </div>
  );
}

function TextInput({ id, value, onChange, placeholder, type = 'text', disabled }) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={[
        'w-full px-3 py-2.5 rounded-lg border text-sm text-gray-800',
        'focus:outline-none focus:ring-2 focus:ring-[#0056b3]/30 focus:border-[#0056b3]',
        'transition-colors duration-150 placeholder-gray-400',
        disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white border-gray-200 hover:border-gray-300',
      ].join(' ')}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════
   STEP 1 – PERSONAL
   ═══════════════════════════════════════════════════════════════ */
function StepPersonal({ data, onChange, errors }) {
  const field = (key) => ({
    value: data[key],
    onChange: (e) => onChange(key, e.target.value),
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Informasi Personal</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Data ini akan diverifikasi dengan dokumen identitas Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nama Lengkap" required error={errors.nama_lengkap}>
          <TextInput
            id="nama_lengkap"
            placeholder="Sesuai KTP"
            {...field('nama_lengkap')}
          />
        </Field>

        <Field label="NIM (Nomor Induk Mahasiswa)" required error={errors.nim}>
          <TextInput
            id="nim"
            placeholder="Contoh: 2021012345"
            {...field('nim')}
          />
        </Field>
      </div>

      <Field label="Alamat Email" required error={errors.email}
        hint="Gunakan email institusi jika tersedia">
        <TextInput
          id="email"
          type="email"
          placeholder="nama@email.com"
          {...field('email')}
        />
      </Field>

      <Field label="Alamat Tempat Tinggal" required error={errors.alamat}
        hint="Alamat lengkap sesuai domisili saat ini">
        <textarea
          id="alamat"
          value={data.alamat}
          onChange={(e) => onChange('alamat', e.target.value)}
          placeholder="Jl. Contoh No. 1, Kota, Provinsi"
          rows={3}
          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800
            focus:outline-none focus:ring-2 focus:ring-[#0056b3]/30 focus:border-[#0056b3]
            transition-colors duration-150 placeholder-gray-400 resize-none hover:border-gray-300"
        />
      </Field>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STEP 2 – ACADEMIC
   ═══════════════════════════════════════════════════════════════ */
function StepAcademic({ data, onChange, errors }) {
  const field = (key) => ({
    value: data[key],
    onChange: (e) => onChange(key, e.target.value),
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Informasi Akademik</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Pastikan data ini sesuai dengan transkrip akademik terbaru Anda.
        </p>
      </div>

      <Field label="Nama Universitas / Institusi" required error={errors.nama_universitas}>
        <TextInput
          id="nama_universitas"
          placeholder="Contoh: Universitas Indonesia"
          {...field('nama_universitas')}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Semester Aktif" required error={errors.semester_aktif}>
          <select
            id="semester_aktif"
            value={data.semester_aktif}
            onChange={(e) => onChange('semester_aktif', e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800
              focus:outline-none focus:ring-2 focus:ring-[#0056b3]/30 focus:border-[#0056b3]
              transition-colors bg-white hover:border-gray-300 cursor-pointer"
          >
            <option value="">-- Pilih Semester --</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
              <option key={s} value={String(s)}>Semester {s}</option>
            ))}
          </select>
        </Field>

        <Field label="IPK (Indeks Prestasi Kumulatif)" required error={errors.ipk}
          hint="Skala 0.00 – 4.00">
          <TextInput
            id="ipk"
            type="number"
            placeholder="Contoh: 3.75"
            {...field('ipk')}
          />
        </Field>
      </div>

      {/* IPK visual indicator */}
      {data.ipk && !isNaN(parseFloat(data.ipk)) && (
        <div className="bg-[#f0f5ff] rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>IPK Anda</span>
              <span className="font-semibold text-[#0056b3]">{parseFloat(data.ipk).toFixed(2)} / 4.00</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#0056b3] to-[#0099ff] rounded-full transition-all duration-500"
                style={{ width: `${Math.min((parseFloat(data.ipk) / 4.0) * 100, 100)}%` }}
              />
            </div>
          </div>
          <span className={[
            'text-xs font-bold px-2 py-1 rounded-full',
            parseFloat(data.ipk) >= 3.5 ? 'bg-green-100 text-green-700'
              : parseFloat(data.ipk) >= 3.0 ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-600',
          ].join(' ')}>
            {parseFloat(data.ipk) >= 3.5 ? 'Sangat Baik'
              : parseFloat(data.ipk) >= 3.0 ? 'Baik'
                : 'Kurang'}
          </span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FILE UPLOAD SLOT
   ═══════════════════════════════════════════════════════════════ */
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

function formatMB(bytes) {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

function validateFile(file) {
  if (!file) return '';
  if (!ALLOWED_MIME.includes(file.type)) return 'Tipe file tidak didukung. Gunakan PDF, JPG, JPEG, atau PNG.';
  if (file.size > MAX_FILE_BYTES) return 'File terlalu besar, maks 5MB';
  return '';
}

function FileUploadSlot({ label, required, file, onFile, onClear, error, accept = '.pdf,.jpg,.jpeg,.png' }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const isImage = !!file && typeof file.type === 'string' && file.type.startsWith('image/');
  const isPdf = !!file && file.type === 'application/pdf';

  useEffect(() => {
    if (!file || !isImage) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFile(dropped);
  }, [onFile]);

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);
  const handleClick = () => inputRef.current?.click();
  const handleChange = (e) => { if (e.target.files[0]) onFile(e.target.files[0]); };

  const fileSize = file ? formatMB(file.size) : null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {required
          ? <span className="text-xs text-red-500 font-medium">* Wajib</span>
          : <span className="text-xs text-gray-400 px-1.5 py-0.5 bg-gray-100 rounded">Opsional</span>
        }
      </div>

      {file ? (
        /* ── File selected state ── */
        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-green-700 shrink-0">
            {isImage && previewUrl ? (
              <img
                src={previewUrl}
                alt={`Preview ${label}`}
                className="w-12 h-12 rounded-md object-cover border border-green-200 bg-white"
              />
            ) : (
              <IconFile />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">
              {isPdf ? 'PDF' : isImage ? 'Gambar' : 'File'} • {file.name}
            </p>
            <p className="text-xs text-gray-500">{fileSize}</p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
            title="Hapus file"
          >
            <IconTrash />
          </button>
        </div>
      ) : (
        /* ── Drop zone ── */
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleClick()}
          className={[
            'flex flex-col items-center justify-center gap-2 px-4 py-8 rounded-xl',
            'border-2 border-dashed cursor-pointer transition-all duration-200',
            dragging
              ? 'border-[#0056b3] bg-[#f0f5ff] scale-[1.01]'
              : error
                ? 'border-red-300 bg-red-50 hover:border-red-400'
                : 'border-gray-200 bg-gray-50 hover:border-[#0056b3] hover:bg-[#f8faff]',
          ].join(' ')}
        >
          <div className={dragging ? 'text-[#0056b3] scale-110 transition-transform' : 'text-gray-400'}>
            <IconUpload />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">
              {dragging ? 'Lepaskan untuk upload' : 'Klik atau seret file ke sini'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">PDF, JPG, PNG — Maks. 5 MB</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleChange}
          />
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">⚠ {error}</p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STEP 3 – DOCUMENTS
   ═══════════════════════════════════════════════════════════════ */
function StepDocuments({ data, onChange, errors }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Upload Dokumen</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Dokumen yang diupload akan diverifikasi oleh tim BantuBeasiswa.
        </p>
      </div>

      {/* Tips banner */}
      <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        <span className="text-amber-500 mt-0.5 shrink-0"><IconInfo /></span>
        <p className="text-xs text-amber-800 leading-relaxed">
          Pastikan dokumen <strong>jelas dan terbaca</strong>. File harus dalam format PDF, JPG, atau PNG
          dengan ukuran maksimal <strong>5 MB</strong> per file.
        </p>
      </div>

      <div className="space-y-4">
        <FileUploadSlot
          label="KTP (Kartu Tanda Penduduk)"
          required
          file={data.ktp}
          onFile={(f) => onChange('ktp', f)}
          onClear={() => onChange('ktp', null)}
          error={errors.ktp}
        />
        <FileUploadSlot
          label="Transkrip Nilai"
          required
          file={data.transkrip}
          onFile={(f) => onChange('transkrip', f)}
          onClear={() => onChange('transkrip', null)}
          error={errors.transkrip}
        />
        <FileUploadSlot
          label="Motivation Letter"
          required={false}
          file={data.motivation_letter}
          onFile={(f) => onChange('motivation_letter', f)}
          onClear={() => onChange('motivation_letter', null)}
          error={errors.motivation_letter}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STEP 4 – REVIEW
   ═══════════════════════════════════════════════════════════════ */
function ReviewRow({ label, value }) {
  return (
    <div className="flex gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 w-44 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-800 break-words">{value || '—'}</span>
    </div>
  );
}

function ReviewSection({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 bg-[#f8f9fa] border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="px-4">{children}</div>
    </div>
  );
}

function StepReview({ personal, academic, dokumen }) {
  const ipkFloat = parseFloat(academic.ipk);

  const docList = [
    { label: 'KTP', file: dokumen.ktp, required: true },
    { label: 'Transkrip Nilai', file: dokumen.transkrip, required: true },
    { label: 'Motivation Letter', file: dokumen.motivation_letter, required: false },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Review Pendaftaran</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Periksa kembali data Anda sebelum mengirimkan pendaftaran.
        </p>
      </div>

      <ReviewSection title="📋 Informasi Personal">
        <ReviewRow label="Nama Lengkap" value={personal.nama_lengkap} />
        <ReviewRow label="NIM" value={personal.nim} />
        <ReviewRow label="Email" value={personal.email} />
        <ReviewRow label="Alamat" value={personal.alamat} />
      </ReviewSection>

      <ReviewSection title="🎓 Informasi Akademik">
        <ReviewRow label="Universitas" value={academic.nama_universitas} />
        <ReviewRow label="Semester Aktif" value={academic.semester_aktif ? `Semester ${academic.semester_aktif}` : ''} />
        <ReviewRow label="IPK"
          value={!isNaN(ipkFloat) && academic.ipk
            ? `${ipkFloat.toFixed(2)} / 4.00`
            : academic.ipk} />
      </ReviewSection>

      <ReviewSection title="📄 Dokumen yang Diupload">
        <div className="py-2 space-y-2">
          {docList.map(({ label, file, required }) => (
            <div key={label} className="flex items-center gap-3 py-1.5">
              <div className={[
                'w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0',
                file ? 'bg-green-100 text-green-600' : required ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-400',
              ].join(' ')}>
                {file ? <IconCheck size={12} /> : '—'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700">{label}</p>
                {file
                  ? <p className="text-xs text-gray-400 truncate">{file.name}</p>
                  : <p className="text-xs text-gray-400">{required ? 'Belum diupload' : 'Tidak dilampirkan'}</p>
                }
              </div>
              {!required && !file && (
                <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full shrink-0">Opsional</span>
              )}
            </div>
          ))}
        </div>
      </ReviewSection>

      {/* Confirmation notice */}
      <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
        <span className="text-blue-500 mt-0.5 shrink-0"><IconInfo /></span>
        <p className="text-xs text-blue-800 leading-relaxed">
          Dengan mengklik <strong>Submit Pendaftaran</strong>, Anda menyatakan bahwa semua
          data yang diisi <strong>benar dan dapat dipertanggungjawabkan</strong>.
          Pendaftaran yang sudah dikirim tidak dapat diubah.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SIDEBAR
   ═══════════════════════════════════════════════════════════════ */
function Sidebar({ beasiswaId }) {
  const tips = [
    'Gunakan nama sesuai KTP, bukan nama panggilan.',
    'IPK diambil dari transkrip semester terakhir.',
    'File harus jelas & tidak blur. Ukuran maks 5 MB.',
    'Pastikan email aktif untuk notifikasi status.',
  ];

  return (
    <aside className="space-y-4">
      {/* Submission Guide */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-[#0056b3]">
          <span className="text-white"><IconInfo /></span>
          <h3 className="text-sm font-semibold text-white">Panduan Pengisian</h3>
        </div>
        <ul className="px-4 py-3 space-y-2.5">
          {tips.map((tip, i) => (
            <li key={i} className="flex gap-2.5 text-xs text-gray-600 leading-relaxed">
              <span className="w-5 h-5 rounded-full bg-[#0056b3]/10 text-[#0056b3] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                {i + 1}
              </span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Application Deadline */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[#ffc107]"><IconCalendar /></span>
          <h3 className="text-sm font-semibold text-gray-700">Batas Pendaftaran</h3>
        </div>
        <p className="text-2xl font-bold text-[#0056b3]">31 Des 2025</p>
        <p className="text-xs text-gray-400 mt-0.5">Pukul 23:59 WIB</p>
        <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#ffc107] to-[#ff9f00] rounded-full w-[65%]" />
        </div>
        <p className="text-xs text-gray-400 mt-1.5">65% dari kuota terisi</p>
      </div>

      {/* Current Status */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Status Pendaftaran</h3>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-sm font-medium text-amber-600">Belum Dikirim</span>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          ID Beasiswa: <span className="font-mono font-medium text-gray-600">{beasiswaId || '—'}</span>
        </p>
      </div>

      {/* Need help */}
      <div className="rounded-xl border border-dashed border-gray-200 px-4 py-3">
        <p className="text-xs text-gray-500 text-center">
          Butuh bantuan?{' '}
          <a href="/mahasiswa/bantuan" className="text-[#0056b3] font-medium hover:underline">
            Kunjungi halaman bantuan →
          </a>
        </p>
      </div>
    </aside>
  );
}

/* ═══════════════════════════════════════════════════════════════
   VALIDATION
   ═══════════════════════════════════════════════════════════════ */
function validateStep(step, personal, academic, dokumen) {
  const errors = {};
  if (step === 0) {
    if (!personal.nama_lengkap.trim()) errors.nama_lengkap = 'Nama lengkap wajib diisi';
    if (!personal.nim.trim()) errors.nim = 'NIM wajib diisi';
    if (!personal.email.trim()) errors.email = 'Email wajib diisi';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personal.email))
      errors.email = 'Format email tidak valid';
    if (!personal.alamat.trim()) errors.alamat = 'Alamat wajib diisi';
  }
  if (step === 1) {
    if (!academic.nama_universitas.trim()) errors.nama_universitas = 'Nama universitas wajib diisi';
    if (!academic.semester_aktif) errors.semester_aktif = 'Semester aktif wajib dipilih';
    if (!academic.ipk) errors.ipk = 'IPK wajib diisi';
    else {
      const v = parseFloat(academic.ipk);
      if (isNaN(v) || v < 0 || v > 4) errors.ipk = 'IPK harus antara 0.00 – 4.00';
    }
  }
  if (step === 2) {
    if (!dokumen.ktp) errors.ktp = 'File KTP wajib diupload';
    else {
      const msg = validateFile(dokumen.ktp);
      if (msg) errors.ktp = msg;
    }
    if (!dokumen.transkrip) errors.transkrip = 'File transkrip wajib diupload';
    else {
      const msg = validateFile(dokumen.transkrip);
      if (msg) errors.transkrip = msg;
    }
    if (dokumen.motivation_letter) {
      const msg = validateFile(dokumen.motivation_letter);
      if (msg) errors.motivation_letter = msg;
    }
  }
  return errors;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function DaftarBeasiswa({ user }) {
  const router = useRouter();
  const { beasiswaId } = router.query;

  /* ── Step state ── */
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});

  /* ── Submit state ── */
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [pendaftaranId, setPendaftaranId] = useState(null); // dipakai untuk PBI-13 (upload dokumen)
  const [isUploadPhase, setIsUploadPhase] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  /**
   * status per dokumen:
   * - pending | uploading | success | error
   * - url: public url (kalau sudah sukses)
   * - error: pesan error (kalau gagal)
   */
  const [docStatus, setDocStatus] = useState({
    ktp: { status: 'pending', url: '', error: '' },
    transkrip: { status: 'pending', url: '', error: '' },
    motivation_letter: { status: 'pending', url: '', error: '' },
  });


  /* ── Form state ── */
  const [personal, setPersonal] = useState({
    nama_lengkap: user?.nama || '',  // pre-fill dari profil
    nim: '',
    email: user?.email || '',
    alamat: '',
  });

  const [academic, setAcademic] = useState({
    nama_universitas: '',
    semester_aktif: '',
    ipk: '',
  });

  const [dokumen, setDokumen] = useState({
    ktp: null,
    transkrip: null,
    motivation_letter: null,
  });

  /* ── Handlers ── */
  const handlePersonalChange = (k, v) => setPersonal(p => ({ ...p, [k]: v }));
  const handleAcademicChange = (k, v) => setAcademic(a => ({ ...a, [k]: v }));
  const handleDocumenChange = (k, v) => {
    if (!v) {
      setDokumen(d => ({ ...d, [k]: null }));
      setErrors(prev => {
        const next = { ...prev };
        delete next[k];
        return next;
      });
      return;
    }

    const msg = validateFile(v);
    if (msg) {
      setErrors(prev => ({ ...prev, [k]: msg }));
      // jangan simpan file invalid ke state
      setDokumen(d => ({ ...d, [k]: null }));
      return;
    }

    setErrors(prev => {
      const next = { ...prev };
      delete next[k];
      return next;
    });
    setDokumen(d => ({ ...d, [k]: v }));
  };

  const goNext = () => {
    const errs = validateStep(step, personal, academic, dokumen);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setStep(s => Math.min(s + 1, 3));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goPrev = () => {
    setErrors({});
    setStep(s => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* Tidak perlu /api/user/me karena userId sudah ada di prop user dari JWT */

  /* ── Submit: cek duplikat + cek kuota + insert pendaftaran ── */
  const handleSubmit = async () => {
    if (!beasiswaId) return;

    setSubmitError('');
    setErrors({});
    setIsSuccess(false);

    const finalErrs = validateStep(2, personal, academic, dokumen);
    if (Object.keys(finalErrs).length) {
      setErrors(finalErrs);
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!user?.userId) {
      setSubmitError('Kamu belum login atau sesi kamu sudah habis. Silakan login ulang.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Panggil API /api/pendaftaran/create (server-side: auth, cek duplikat, kuota, insert)
      const res  = await fetch('/api/pendaftaran/create', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ beasiswaId }),
      });
      const json = await res.json();

      if (res.status === 409) {
        // Sudah pernah daftar
        setSubmitError(json.message);
        setPendaftaranId(json.pendaftaranId);
        setIsSubmitting(false);
        return;
      }

      if (!res.ok) {
        setSubmitError(json.message || 'Terjadi kesalahan saat submit pendaftaran');
        setIsSubmitting(false);
        return;
      }

      const newId = json.pendaftaranId ?? null;
      setPendaftaranId(newId);

      // Upload dokumen (sequential)
      await uploadRemainingDocs(newId);
    } catch (e) {
      setSubmitError(e?.message || 'Terjadi kesalahan saat submit pendaftaran');
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildDocEntries = () => ([
    { jenis: 'ktp', file: dokumen.ktp, required: true, label: 'KTP' },
    { jenis: 'transkrip', file: dokumen.transkrip, required: true, label: 'Transkrip Nilai' },
    { jenis: 'motivation_letter', file: dokumen.motivation_letter, required: false, label: 'Motivation Letter' },
  ].filter(e => e.file));

  const uploadSingleDoc = async (pendId, { jenis, file }) => {
    // a) upload ke storage + ambil public url
    const { publicUrl } = await uploadDokumen(supabase, file, pendId, jenis);

    // b) insert row dokumen
    const { error: dokErr } = await supabase
      .from('dokumen')
      .insert({
        pendaftaranId: pendId,
        jenis,
        fileUrl: publicUrl,
        statusDokumen: 'MENUNGGU',
      });
    if (dokErr) {
      throw new Error(`Gagal menyimpan metadata dokumen ${jenis}: ${dokErr.message}`);
    }

    return publicUrl;
  };

  const uploadRemainingDocs = async (pendId) => {
    if (!pendId) throw new Error('Pendaftaran ID tidak tersedia');

    const entries = buildDocEntries();
    const remaining = entries.filter(e => docStatus?.[e.jenis]?.status !== 'success');

    if (remaining.length === 0) {
      setIsSuccess(true);
      setUploadMessage('');
      setIsUploadPhase(false);
      return;
    }

    setIsUploadPhase(true);
    setUploadMessage('');

    // sequential loop = paling aman untuk progress + retry (menghindari rate limit / error cascade)
    for (let i = 0; i < remaining.length; i++) {
      const entry = remaining[i];
      const currentIndex = i + 1;
      const total = remaining.length;

      setUploadMessage(`Mengupload dokumen ${currentIndex} dari ${total}...`);
      setDocStatus(s => ({
        ...s,
        [entry.jenis]: { status: 'uploading', url: s?.[entry.jenis]?.url || '', error: '' },
      }));

      try {
        const url = await uploadSingleDoc(pendId, entry);
        setDocStatus(s => ({
          ...s,
          [entry.jenis]: { status: 'success', url, error: '' },
        }));
      } catch (err) {
        const msg = err?.message || `Upload ${entry.jenis} gagal`;
        setDocStatus(s => ({
          ...s,
          [entry.jenis]: { status: 'error', url: s?.[entry.jenis]?.url || '', error: msg },
        }));
        setUploadMessage('');
        setSubmitError(msg);
        setIsUploadPhase(false);
        return; // stop di file yang gagal; user bisa retry tanpa ulang dari awal
      }
    }

    setUploadMessage('');
    setIsUploadPhase(false);
    setIsSuccess(true);
  };

  const handleRetryFailed = async () => {
    setSubmitError('');
    if (!pendaftaranId) {
      setSubmitError('Pendaftaran ID tidak tersedia untuk retry.');
      return;
    }
    await uploadRemainingDocs(pendaftaranId);
  };

  /* ── Step content resolver ── */
  const stepContent = [
    <StepPersonal key="p" data={personal} onChange={handlePersonalChange} errors={errors} />,
    <StepAcademic key="a" data={academic} onChange={handleAcademicChange} errors={errors} />,
    <StepDocuments key="d" data={dokumen} onChange={handleDocumenChange} errors={errors} />,
    <StepReview key="r" personal={personal} academic={academic} dokumen={dokumen} />,
  ];

  const canProceedDocuments =
    !!dokumen.ktp &&
    !!dokumen.transkrip &&
    !validateFile(dokumen.ktp) &&
    !validateFile(dokumen.transkrip);

  if (isSuccess && pendaftaranId) {
    // Redirect langsung ke tracker status
    router.replace(`/mahasiswa/status-pendaftaran?id=${pendaftaranId}`);
    return null;
  }

  return (
    <MahasiswaLayout user={user}>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#0056b3] mb-2 transition-colors"
            >
              <IconChevronLeft /> Kembali
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Formulir Pendaftaran Beasiswa</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              ID Beasiswa:{' '}
              <span className="font-mono text-[#0056b3] font-semibold">{beasiswaId || '...'}</span>
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium bg-[#0056b3]/10 text-[#0056b3] px-3 py-1.5 rounded-full">
            Langkah {step + 1} dari {STEPS.length}
          </span>
        </div>

        {/* ── 2-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* ── Main form card ── */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Progress bar */}
            <div className="px-6 pt-6 pb-2">
              <StepBar current={step} />
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-100 mx-6" />

            {/* Step content */}
            <div className="px-6 py-6">
              {stepContent[step]}
            </div>

            {/* ── Navigation buttons ── */}
            <div className="px-6 pb-6 flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={goPrev}
                disabled={step === 0 || isSubmitting || isUploadPhase}
                className={[
                  'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  step === 0 || isSubmitting || isUploadPhase
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300',
                ].join(' ')}
              >
                <IconChevronLeft /> Sebelumnya
              </button>

              <div className="flex items-center gap-2">
                {/* Step dots */}
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={[
                      'rounded-full transition-all duration-300',
                      i === step
                        ? 'w-6 h-2 bg-[#0056b3]'
                        : i < step
                          ? 'w-2 h-2 bg-[#0056b3]/40'
                          : 'w-2 h-2 bg-gray-200',
                    ].join(' ')}
                  />
                ))}
              </div>

              {step < 3 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={isSubmitting || isUploadPhase || (step === 2 && !canProceedDocuments)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium
                    bg-[#0056b3] text-white hover:bg-[#004494] active:scale-95 transition-all duration-150 shadow-sm
                    disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Selanjutnya <IconChevronRight />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || isUploadPhase}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold
                    bg-gradient-to-r from-[#0056b3] to-[#0099ff] text-white
                    hover:from-[#004494] hover:to-[#007acc] active:scale-95
                    transition-all duration-150 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <IconSend /> {isUploadPhase ? 'Mengupload...' : isSubmitting ? 'Mengirim...' : 'Submit Pendaftaran'}
                </button>
              )}
            </div>

            {/* ── Submit error + pendaftaranId preview ── */}
            {(submitError || pendaftaranId) && (
              <div className="px-6 pb-6">
                {uploadMessage && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 mb-3">
                    {uploadMessage}
                  </div>
                )}
                {submitError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {submitError}
                    {(docStatus.ktp.status === 'error' || docStatus.transkrip.status === 'error' || docStatus.motivation_letter.status === 'error') && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={handleRetryFailed}
                          disabled={isSubmitting || isUploadPhase}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
                            bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          Retry Upload yang Gagal
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {pendaftaranId && !submitError && (
                  <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    Pendaftaran tersimpan. ID: <span className="font-mono font-semibold">{pendaftaranId}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="lg:col-span-1">
            <Sidebar beasiswaId={beasiswaId} />
          </div>
        </div>
      </div>
    </MahasiswaLayout>
  );
}

// ─── SSR Auth Guard ───────────────────────────────────────────────────────────
export async function getServerSideProps(context) {
  return withAuth(context, 'mahasiswa');
}
