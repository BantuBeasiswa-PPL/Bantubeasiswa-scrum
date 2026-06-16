import { useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import MahasiswaLayout from '@/components/layouts/MahasiswaLayout';
import { withAuth } from '@/lib/auth';
import { supabase, getStorageBucket } from '@/lib/db';
import {
  getLatestLulusPendaftaran,
  getLatestRekening,
  getMahasiswaProfile,
} from '@/lib/mahasiswaProfile';

const BANK_OPTIONS = [
  'Bank BCA',
  'Bank BRI',
  'Bank BNI',
  'Bank Mandiri',
  'Bank Syariah Indonesia (BSI)',
  'Bank CIMB Niaga',
  'Bank Danamon',
  'Bank Permata',
  'Bank BTN',
  'Bank OCBC NISP',
  'Bank Maybank Indonesia',
  'Bank Mega',
  'Bank Panin',
  'Bank Bukopin',
  'Bank BTPN',
  'Bank Jago',
  'Bank Neo Commerce',
  'Bank Muamalat',
  'Bank DKI',
  'Bank Jabar Banten (BJB)',
  'Bank Jatim',
  'Bank Jateng',
  'Bank Sumut',
  'Bank Nagari',
  'Bank Aceh Syariah',
  'Bank Sulselbar',
  'Bank Kalsel',
  'Bank Kalbar',
  'Bank Kaltimtara',
  'Bank Papua',
  'Bank NTT',
  'Bank Maluku Malut',
  'Bank lainnya',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg'];
const REKENING_QUERY_SCHEMAS = [
  { name: 'snake', id: 'id', user: 'user_id' },
  { name: 'legacy', id: 'rekeningId', user: 'userId' },
];

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || 'M';
}

function getRelation(value) {
  return Array.isArray(value) ? value[0] : value;
}

function validateFile(file) {
  if (!file) return 'Foto buku tabungan wajib diunggah.';
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Format file harus PNG, JPG, atau JPEG.';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'Ukuran file maksimal 5MB.';
  }
  return '';
}

function validateValues(values) {
  const errors = {};

  if (!values.bankName) {
    errors.bankName = 'Bank Name wajib dipilih.';
  }

  const holderName = values.accountHolderName.trim();
  if (!holderName) {
    errors.accountHolderName = 'Account Holder Name wajib diisi.';
  } else if (holderName.length < 3) {
    errors.accountHolderName = 'Nama pemilik rekening minimal 3 karakter.';
  }

  if (!values.accountNumber) {
    errors.accountNumber = 'Bank Account Number wajib diisi.';
  } else if (!/^\d+$/.test(values.accountNumber)) {
    errors.accountNumber = 'Nomor rekening hanya boleh berisi angka.';
  } else if (values.accountNumber.length < 10) {
    errors.accountNumber = 'Nomor rekening minimal 10 digit.';
  } else if (values.accountNumber.length > 16) {
    errors.accountNumber = 'Nomor rekening maksimal 16 digit.';
  }

  const proofError = validateFile(values.proofFile);
  if (proofError) errors.proofFile = proofError;

  if (!values.certified) {
    errors.certified = 'Centang pernyataan kebenaran data sebelum submit.';
  }

  return errors;
}

function isSupabaseSchemaError(error) {
  if (!error) return false;
  const message = `${error.message || ''} ${error.details || ''}`.toLowerCase();
  return (
    error.code === 'PGRST204' ||
    error.code === '42703' ||
    message.includes('schema cache') ||
    message.includes('column') ||
    message.includes('does not exist')
  );
}

function getSafeFileExtension(file) {
  const fromName = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (fromName === 'png') return 'png';
  if (fromName === 'jpg' || fromName === 'jpeg') return 'jpg';
  return file.type === 'image/png' ? 'png' : 'jpg';
}

function getStatusPendaftaranHref(pendaftaranId) {
  return pendaftaranId
    ? `/mahasiswa/status-pendaftaran?id=${pendaftaranId}`
    : '/mahasiswa/status-pendaftaran';
}

async function findExistingRekening(userId) {
  for (const schema of REKENING_QUERY_SCHEMAS) {
    const { data, error } = await supabase
      .from('rekening')
      .select(`${schema.id}, ${schema.user}`)
      .eq(schema.user, userId)
      .limit(1)
      .maybeSingle();

    if (!error) {
      return data ? { id: data[schema.id], schema: schema.name } : null;
    }
    if (!isSupabaseSchemaError(error)) {
      throw new Error(`Gagal mengecek data rekening: ${error.message}`);
    }
  }

  return null;
}

async function uploadBukuTabungan(file, userId) {
  const ext = getSafeFileExtension(file);
  const filePath = `rekening/${userId}_${Date.now()}.${ext}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(DOKUMEN_BUCKET)
    .upload(filePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    throw new Error(`Gagal mengunggah foto buku tabungan: ${uploadError.message}`);
  }

  const uploadedPath = uploadData?.path || filePath;
  const { data: urlData } = supabase.storage.from(DOKUMEN_BUCKET).getPublicUrl(uploadedPath);
  const publicUrl = urlData?.publicUrl;

  if (!publicUrl) {
    throw new Error('Gagal membuat URL publik foto buku tabungan.');
  }

  return { path: uploadedPath, publicUrl };
}

async function removeUploadedBuku(path) {
  if (!path) return;
  await supabase.storage.from(DOKUMEN_BUCKET).remove([path]);
}

async function saveRekening(payload) {
  const res = await fetch('/api/mahasiswa/rekening', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = json.detail ? ` (${json.detail})` : '';
    const error = new Error((json.message || 'Gagal menyimpan data rekening.') + detail);
    error.status = res.status;
    error.requiresConfirmation = Boolean(json.requiresConfirmation);
    throw error;
  }

  return json;
}

function FieldError({ children }) {
  if (!children) return null;
  return <p className="mt-2 text-sm font-medium text-red-600">{children}</p>;
}

function ReadOnlyInfo({ label, value }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-700">
        {label}
      </label>
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
        {value || '-'}
      </div>
    </div>
  );
}

export default function DaftarUlangRekeningPage({
  user,
  profile,
  lulusPendaftaran,
  batchYear,
  existingRekening,
  allLulusList = [],
}) {
  const fileInputRef = useRef(null);
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [toast, setToast] = useState('');
  const [touched, setTouched] = useState({});
  const [values, setValues] = useState({
    bankName: existingRekening?.namaBank || '',
    accountHolderName: existingRekening?.namaPemilik || profile.nama || user.nama || '',
    accountNumber: existingRekening?.nomorRekening || '',
    proofFile: null,
    certified: false,
  });

  const beasiswa = getRelation(lulusPendaftaran?.beasiswa);
  const pendonor = getRelation(beasiswa?.pendonor);
  const nama = profile.nama || user.nama || 'Mahasiswa';
  const email = profile.email || user.email || '-';
  const scholarshipTitle = beasiswa?.judul || 'Beasiswa Pendidikan';
  const scholarshipType =
    beasiswa?.tipe ||
    beasiswa?.jenis ||
    pendonor?.statusOrganisasi ||
    pendonor?.nama_organisasi ||
    'Beasiswa';

  const errors = useMemo(() => validateValues(values), [values]);
  const isFormValid = Object.keys(errors).length === 0;

  function markTouched(name) {
    setTouched((current) => ({ ...current, [name]: true }));
  }

  function updateValue(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setSubmitted(false);
    setToast('');
  }

  function handleAccountNumberChange(event) {
    const cleaned = event.target.value.replace(/\D/g, '').slice(0, 16);
    updateValue('accountNumber', cleaned);
  }

  function handleFile(file) {
    updateValue('proofFile', file || null);
    markTouched('proofFile');
  }

  function handleFileInput(event) {
    handleFile(event.target.files?.[0] || null);
  }

  function handleDrop(event) {
    event.preventDefault();
    if (submitting || submitted) return;
    setDragActive(false);
    handleFile(event.dataTransfer.files?.[0] || null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setTouched({
      bankName: true,
      accountHolderName: true,
      accountNumber: true,
      proofFile: true,
      certified: true,
    });
    if (!isFormValid) return;

    setSubmitting(true);
    setSubmitStep('Memeriksa data rekening...');
    setSubmitError('');
    setToast('');

    let uploadedPath = null;
    let completed = false;

    try {
      const activeUserId = profile.userId || existingRekening?.userId || user.userId;
      if (!activeUserId) {
        throw new Error('Profil mahasiswa belum memuat user ID. Silakan login ulang.');
      }

      const existingFromDb = await findExistingRekening(activeUserId);
      let confirmUpdate = Boolean(existingFromDb || existingRekening?.id || existingRekening?.nomorRekening);

      if (confirmUpdate) {
        const approved = window.confirm('Update data rekening yang sudah ada?');
        if (!approved) {
          setSubmitStep('');
          setSubmitting(false);
          return;
        }
      }

      setSubmitStep('Mengunggah foto buku tabungan...');
      const uploadResult = await uploadBukuTabungan(values.proofFile, activeUserId);
      uploadedPath = uploadResult.path;

      const payload = {
        namaBank: values.bankName,
        namaPemilik: values.accountHolderName,
        nomorRekening: values.accountNumber,
        fotoBukuUrl: uploadResult.publicUrl,
        confirmUpdate,
      };

      setSubmitStep('Menyimpan data rekening...');
      try {
        await saveRekening(payload);
      } catch (error) {
        if (error.status === 409 && error.requiresConfirmation) {
          const approved = window.confirm('Update data rekening yang sudah ada?');
          if (!approved) {
            await removeUploadedBuku(uploadedPath);
            uploadedPath = null;
            setSubmitStep('');
            setSubmitting(false);
            return;
          }
          confirmUpdate = true;
          await saveRekening({ ...payload, confirmUpdate });
        } else {
          await removeUploadedBuku(uploadedPath);
          uploadedPath = null;
          throw error;
        }
      }

      const statusHref = getStatusPendaftaranHref(lulusPendaftaran?.pendaftaranId);
      setSubmitted(true);
      setToast('Data rekening berhasil disimpan. Mengalihkan ke halaman status pendaftaran...');
      setSubmitStep('Berhasil. Mengalihkan...');
      completed = true;
      setTimeout(() => router.push(statusHref), 2000);
    } catch (error) {
      if (uploadedPath) {
        await removeUploadedBuku(uploadedPath);
      }
      setSubmitError(error?.message || 'Terjadi kesalahan jaringan. Coba lagi.');
    } finally {
      if (!completed) {
        setSubmitStep('');
      }
      setSubmitting(false);
    }
  }

  function getError(name) {
    return touched[name] ? errors[name] : '';
  }

  return (
    <MahasiswaLayout user={{ ...user, nama, email }}>
      <Head>
        <title>Daftar Ulang Rekening - BantuBeasiswa</title>
        <meta
          name="description"
          content="Form daftar ulang rekening bank mahasiswa lulus seleksi."
        />
      </Head>

      {toast && (
        <div
          role="status"
          className="fixed right-4 top-4 z-50 max-w-sm rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 shadow-lg"
        >
          {toast}
        </div>
      )}

      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-2xl bg-blue-700 text-white shadow-sm">
          <div className="grid gap-5 p-6 md:grid-cols-[1fr_auto] md:p-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-100">
                Daftar ulang penerima beasiswa
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-normal">
                Selamat, {nama.split(' ')[0] || nama}!
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50">
                Lengkapi data rekening bank agar proses pencairan dana dapat
                masuk ke tahap verifikasi akhir.
              </p>
            </div>
            <div className="grid gap-3 rounded-xl border border-white/20 bg-white/10 p-4 text-sm md:min-w-72">
              <div>
                <p className="text-blue-100">Tipe Beasiswa</p>
                <p className="mt-1 font-bold">{scholarshipType}</p>
              </div>
              <div>
                <p className="text-blue-100">Batch</p>
                <p className="mt-1 font-bold">Batch {batchYear}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8"
            noValidate
          >
            <div className="border-b border-gray-100 pb-6">
              <p className="text-sm font-semibold text-blue-700">
                Formulir Daftar Ulang
              </p>
              <h2 className="mt-1 text-2xl font-bold text-gray-950">
                Formulir Daftar Ulang (Rekening)
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Nama dan email diambil otomatis dari profil mahasiswa Supabase.
              </p>
            </div>

            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <ReadOnlyInfo label="Nama Mahasiswa" value={nama} />
              <ReadOnlyInfo label="Email" value={email} />

              <div className="md:col-span-2">
                <label htmlFor="bankName" className="mb-2 block text-sm font-semibold text-gray-800">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <select
                  id="bankName"
                  value={values.bankName}
                  onChange={(event) => updateValue('bankName', event.target.value)}
                  onBlur={() => markTouched('bankName')}
                  disabled={submitting || submitted}
                  className={`w-full rounded-lg border bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100 ${
                    getError('bankName') ? 'border-red-300' : 'border-gray-200'
                  }`}
                >
                  <option value="">Pilih bank</option>
                  {BANK_OPTIONS.map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
                <FieldError>{getError('bankName')}</FieldError>
              </div>

              <div>
                <label htmlFor="accountHolderName" className="mb-2 block text-sm font-semibold text-gray-800">
                  Account Holder Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="accountHolderName"
                  type="text"
                  value={values.accountHolderName}
                  onChange={(event) => updateValue('accountHolderName', event.target.value)}
                  onBlur={() => markTouched('accountHolderName')}
                  disabled={submitting || submitted}
                  placeholder="Nama sesuai buku tabungan"
                  className={`w-full rounded-lg border px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100 ${
                    getError('accountHolderName') ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
                <FieldError>{getError('accountHolderName')}</FieldError>
              </div>

              <div>
                <label htmlFor="accountNumber" className="mb-2 block text-sm font-semibold text-gray-800">
                  Bank Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="accountNumber"
                  type="text"
                  inputMode="numeric"
                  value={values.accountNumber}
                  onChange={handleAccountNumberChange}
                  onBlur={() => markTouched('accountNumber')}
                  disabled={submitting || submitted}
                  placeholder="Masukkan nomor rekening"
                  className={`w-full rounded-lg border px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100 ${
                    getError('accountNumber') ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
                <FieldError>{getError('accountNumber')}</FieldError>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-gray-800">
                  Proof of Bank Ownership (Passbook Photo) <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (!submitting && !submitted) setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  disabled={submitting || submitted}
                  className={`flex min-h-44 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition disabled:cursor-not-allowed disabled:opacity-70 ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50'
                      : getError('proofFile')
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/50'
                  }`}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-blue-700 shadow-sm">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0 4 4m-4-4-4 4M20 16.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.5" />
                    </svg>
                  </span>
                  <span className="mt-4 text-sm font-bold text-gray-800">
                    {values.proofFile ? values.proofFile.name : 'Drag & drop file di sini'}
                  </span>
                  <span className="mt-1 text-sm text-gray-500">
                    PNG/JPG maksimal 5MB
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={handleFileInput}
                  disabled={submitting || submitted}
                />
                <FieldError>{getError('proofFile')}</FieldError>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <input
                    type="checkbox"
                    checked={values.certified}
                    onChange={(event) => {
                      updateValue('certified', event.target.checked);
                      markTouched('certified');
                    }}
                    disabled={submitting || submitted}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm leading-6 text-gray-700">
                    I certify that the information above is true and correct
                  </span>
                </label>
                <FieldError>{getError('certified')}</FieldError>
              </div>
            </div>

            {submitted && (
              <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                Data rekening berhasil disimpan. Mengalihkan ke halaman status pendaftaran...
              </div>
            )}
            {submitError && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {submitError}
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/mahasiswa/profil"
                className="text-sm font-semibold text-gray-500 transition hover:text-gray-800"
              >
                Kembali ke Profil
              </Link>
              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                {submitting && submitStep && (
                  <p className="text-xs font-medium text-gray-500">{submitStep}</p>
                )}
                <button
                  type="submit"
                  disabled={!isFormValid || submitting || submitted}
                  className={`inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-bold text-white transition ${
                    isFormValid && !submitting && !submitted
                      ? 'bg-blue-700 hover:bg-blue-800'
                      : 'cursor-not-allowed bg-gray-300'
                  }`}
                >
                  {submitting && (
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  )}
                  {submitting ? 'Memproses...' : 'Confirm & Submit'}
                </button>
              </div>
            </div>
          </form>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                  {getInitials(nama)}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-bold text-gray-950">{nama}</p>
                  <p className="truncate text-sm text-gray-500">{email}</p>
                </div>
              </div>

              <div className="mt-6 rounded-xl bg-amber-50 p-4">
                <p className="text-sm font-bold text-amber-900">Final Step</p>
                <p className="mt-2 text-sm leading-6 text-amber-800">
                  Ini langkah terakhir sebelum data rekening diverifikasi untuk
                  pencairan dana beasiswa.
                </p>
              </div>

              <div className="mt-5 space-y-3 text-sm border-b border-gray-100 pb-5">
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">Kelengkapan Form</span>
                  <span className="font-semibold text-gray-800">
                    {Object.keys(errors).length === 0 ? 'Lengkap' : 'Belum lengkap'}
                  </span>
                </div>
              </div>

              <div className="mt-5">
                <h3 className="text-xs uppercase font-extrabold tracking-wider text-gray-400 mb-3">Daftar Beasiswa Lulus</h3>
                <div className="space-y-3">
                  {allLulusList.map((pendaftaran) => {
                    const b = pendaftaran.beasiswa || {};
                    const bYear = new Date(
                      pendaftaran.createdAt || pendaftaran.created_at || new Date().toISOString()
                    ).getFullYear();
                    const isCurrent = pendaftaran.pendaftaranId === lulusPendaftaran?.pendaftaranId;

                    return (
                      <div
                        key={pendaftaran.pendaftaranId}
                        className={`p-3 rounded-xl border text-xs leading-normal ${
                          isCurrent
                            ? 'border-blue-200 bg-blue-50/40 ring-1 ring-blue-100/50'
                            : 'border-emerald-100 bg-emerald-50/20'
                        }`}
                      >
                        <p className="font-bold text-gray-900 leading-tight">
                          {b.judul || 'Beasiswa'}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {b.pendonor?.statusOrganisasi || b.pendonor?.nama_organisasi || 'Pendonor'}
                        </p>

                        <div className="mt-2 flex items-center justify-between text-[11px] text-gray-600 border-t border-gray-100 pt-2">
                          <span>Batch {bYear}</span>
                          <span className="font-semibold text-gray-700">
                            {b.nominal
                              ? new Intl.NumberFormat('id-ID', {
                                  style: 'currency',
                                  currency: 'IDR',
                                  minimumFractionDigits: 0,
                                }).format(b.nominal)
                              : '—'}
                          </span>
                        </div>

                        <div className="mt-2.5 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                            LULUS
                          </span>
                          {isCurrent ? (
                            <span className="text-[10px] font-bold text-blue-600">Form Aktif</span>
                          ) : (
                            <Link
                              href={`/mahasiswa/status-pendaftaran?id=${pendaftaran.pendaftaranId}`}
                              className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition"
                            >
                              Detail →
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </MahasiswaLayout>
  );
}

export async function getServerSideProps(context) {
  const auth = withAuth(context, 'mahasiswa');
  if (auth.redirect) return auth;

  const { user } = auth.props;
  const profile = await getMahasiswaProfile(user);
  const existingRekening = await getLatestRekening(profile.userId);

  const { getAllLulusPendaftaran, getLatestLulusPendaftaran } = await import('@/lib/mahasiswaProfile');
  const lulusPendaftaran = await getLatestLulusPendaftaran(profile.userId);
  const allLulusList = await getAllLulusPendaftaran(profile.userId);

  const batchYear = new Date(
    lulusPendaftaran?.createdAt ||
      lulusPendaftaran?.created_at ||
      new Date().toISOString()
  ).getFullYear();

  return {
    props: {
      user,
      profile,
      lulusPendaftaran: lulusPendaftaran ? JSON.parse(JSON.stringify(lulusPendaftaran)) : null,
      allLulusList: JSON.parse(JSON.stringify(allLulusList)),
      batchYear,
      existingRekening: existingRekening ?? null,
    },
  };
}
