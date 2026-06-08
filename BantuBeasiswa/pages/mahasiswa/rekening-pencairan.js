import { useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import MahasiswaLayout from '@/components/layouts/MahasiswaLayout';
import { withAuth } from '@/lib/auth';
import { supabase } from '@/lib/db';
import {
  getLatestRekening,
  getMahasiswaProfile,
} from '@/lib/mahasiswaProfile';

const BANK_OPTIONS = [
  'Bank BCA', 'Bank BRI', 'Bank BNI', 'Bank Mandiri',
  'Bank Syariah Indonesia (BSI)', 'Bank CIMB Niaga', 'Bank Danamon',
  'Bank Permata', 'Bank BTN', 'Bank OCBC NISP', 'Bank Maybank Indonesia',
  'Bank Mega', 'Bank Panin', 'Bank Bukopin', 'Bank BTPN', 'Bank Jago',
  'Bank Neo Commerce', 'Bank Muamalat', 'Bank DKI', 'Bank Jabar Banten (BJB)',
  'Bank Jatim', 'Bank Jateng', 'Bank Sumut', 'Bank Nagari', 'Bank Aceh Syariah',
  'Bank Sulselbar', 'Bank Kalsel', 'Bank Kalbar', 'Bank Kaltimtara',
  'Bank Papua', 'Bank NTT', 'Bank Maluku Malut', 'Bank lainnya',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg'];
const DOKUMEN_BUCKET = 'dokumen';

function getInitials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2)
    .map((w) => w[0]).join('').toUpperCase() || 'M';
}

function FieldError({ children }) {
  if (!children) return null;
  return <p className="mt-2 text-sm font-medium text-red-600">{children}</p>;
}

function ReadOnlyRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm font-semibold text-gray-800 text-right">{value || '—'}</span>
    </div>
  );
}

function validateForm(values) {
  const errors = {};
  if (!values.bankName) errors.bankName = 'Bank wajib dipilih.';
  if (!values.namaPemilik || values.namaPemilik.trim().length < 3)
    errors.namaPemilik = 'Nama pemilik minimal 3 karakter.';
  if (!values.nomorRekening || !/^\d{10,16}$/.test(values.nomorRekening.trim()))
    errors.nomorRekening = 'Nomor rekening harus 10–16 digit angka.';
  if (values.proofFile) {
    if (!ACCEPTED_TYPES.includes(values.proofFile.type))
      errors.proofFile = 'Format file harus PNG atau JPG.';
    if (values.proofFile.size > MAX_FILE_SIZE)
      errors.proofFile = 'Ukuran file maksimal 5MB.';
  }
  return errors;
}

function getSafeFileExtension(file) {
  const fromName = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (fromName === 'png') return 'png';
  if (fromName === 'jpg' || fromName === 'jpeg') return 'jpg';
  return file.type === 'image/png' ? 'png' : 'jpg';
}

export default function RekeningPencairanPage({ user, profile, existingRekening }) {
  const fileInputRef = useRef(null);
  const nama = profile.nama || user.nama || 'Mahasiswa';
  const email = profile.email || user.email || '-';

  // Mode: jika sudah ada rekening → tampilkan read-only dulu, bisa switch ke edit
  const hasExisting = Boolean(existingRekening?.nomorRekening);
  const [editMode, setEditMode] = useState(!hasExisting);

  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [saved, setSaved] = useState(false);

  const [values, setValues] = useState({
    bankName: existingRekening?.namaBank || '',
    namaPemilik: existingRekening?.namaPemilik || profile.nama || user.nama || '',
    nomorRekening: existingRekening?.nomorRekening || '',
    proofFile: null,
  });

  const errors = useMemo(() => validateForm(values), [values]);
  const isFormValid = Object.keys(errors).length === 0;

  function update(name, value) {
    setValues((prev) => ({ ...prev, [name]: value }));
    setSaved(false);
    setSubmitError('');
  }

  function getError(name) {
    return touched[name] ? errors[name] : '';
  }

  function markTouched(name) {
    setTouched((prev) => ({ ...prev, [name]: true }));
  }

  function handleFileInput(e) {
    const file = e.target.files?.[0] || null;
    update('proofFile', file);
    markTouched('proofFile');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched({ bankName: true, namaPemilik: true, nomorRekening: true, proofFile: true });
    if (!isFormValid) return;
    if (hasExisting && !window.confirm('Update data rekening yang sudah ada?')) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const activeUserId = profile.userId || existingRekening?.userId || user.userId;
      if (!activeUserId) {
        throw new Error('Profil mahasiswa belum memuat user ID. Silakan login ulang.');
      }

      let fotoBukuUrl = existingRekening?.fotoBukuUrl || null;
      if (values.proofFile) {
        const ext = getSafeFileExtension(values.proofFile);
        const filePath = `rekening/${activeUserId}_${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(DOKUMEN_BUCKET)
          .upload(filePath, values.proofFile, { contentType: values.proofFile.type, upsert: false });
        if (uploadError) {
          throw new Error(`Gagal mengunggah foto buku tabungan: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from(DOKUMEN_BUCKET)
          .getPublicUrl(uploadData?.path || filePath);
        if (!urlData?.publicUrl) {
          throw new Error('Gagal membuat URL publik foto buku tabungan.');
        }
        fotoBukuUrl = urlData.publicUrl;
      }

      const res = await fetch('/api/mahasiswa/rekening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namaBank: values.bankName,
          namaPemilik: values.namaPemilik,
          nomorRekening: values.nomorRekening,
          fotoBukuUrl,
          confirmUpdate: hasExisting,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.message || 'Gagal menyimpan rekening.');
        return;
      }
      setSaved(true);
      setEditMode(false);
    } catch {
      setSubmitError('Terjadi kesalahan jaringan. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MahasiswaLayout user={{ ...user, nama, email }}>
      <Head>
        <title>Rekening Pencairan - BantuBeasiswa</title>
        <meta name="description" content="Kelola data rekening bank untuk pencairan beasiswa." />
      </Head>

      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[360px_1fr]">
        {/* Sidebar */}
        <aside className="space-y-5">
          <section className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-white bg-yellow-400 text-lg font-bold text-blue-800 shadow-sm">
                  {getInitials(nama)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xl font-bold text-gray-950">{nama}</p>
                  <p className="mt-1 truncate text-sm text-gray-600">{email}</p>
                  <span className="mt-3 inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-gray-600">
                    Mahasiswa
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <nav className="space-y-2">
              <Link
                href="/mahasiswa/profil"
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Data Pribadi
              </Link>
              <Link
                href="/mahasiswa/rekening-pencairan"
                className="flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700"
              >
                Rekening Pencairan
              </Link>
              <Link
                href="/mahasiswa/laporan-kendala"
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Laporan Kendala
              </Link>
            </nav>
          </section>

          {/* Info box */}
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-bold text-amber-900">ℹ️ Info</p>
            <p className="mt-2 text-xs leading-relaxed text-amber-800">
              Data rekening ini disimpan sebagai cadangan. Saat Anda dinyatakan lulus seleksi, Anda akan diminta melengkapi formulir daftar ulang rekening secara resmi.
            </p>
          </section>
        </aside>

        {/* Main Content */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="border-b border-gray-100 pb-6">
            <p className="text-sm font-semibold text-blue-700">Rekening Pencairan</p>
            <h2 className="mt-1 text-2xl font-bold text-gray-950">Data Rekening Bank</h2>
            <p className="mt-2 text-sm text-gray-500">
              Simpan data rekening bank Anda. Data ini akan digunakan sebagai referensi awal pencairan beasiswa.
            </p>
          </div>

          {/* Saved success banner */}
          {saved && (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              ✅ Data rekening berhasil disimpan!
            </div>
          )}

          {/* READ-ONLY VIEW */}
          {!editMode && hasExisting && (
            <div className="mt-6">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      Rekening Tersimpan
                    </span>
                  </div>
                  <button
                    id="btn-edit-rekening"
                    onClick={() => setEditMode(true)}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition"
                  >
                    Edit →
                  </button>
                </div>

                <ReadOnlyRow label="Bank" value={existingRekening.namaBank} />
                <ReadOnlyRow label="Nama Pemilik" value={existingRekening.namaPemilik} />
                <ReadOnlyRow
                  label="Nomor Rekening"
                  value={existingRekening.nomorRekening
                    ? existingRekening.nomorRekening.replace(/(\d{4})(?=\d)/g, '$1 ')
                    : null}
                />
                <ReadOnlyRow label="Status" value={existingRekening.status} />

                {existingRekening.fotoBukuUrl && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Foto Buku Tabungan</p>
                    <a
                      href={existingRekening.fotoBukuUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Lihat Foto
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* EDIT/CREATE FORM */}
          {editMode && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
              {/* Bank */}
              <div>
                <label htmlFor="bankName" className="mb-2 block text-sm font-semibold text-gray-800">
                  Bank <span className="text-red-500">*</span>
                </label>
                <select
                  id="bankName"
                  value={values.bankName}
                  onChange={(e) => update('bankName', e.target.value)}
                  onBlur={() => markTouched('bankName')}
                  className={`w-full rounded-lg border bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 ${
                    getError('bankName') ? 'border-red-300' : 'border-gray-200'
                  }`}
                >
                  <option value="">Pilih bank</option>
                  {BANK_OPTIONS.map((bank) => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
                <FieldError>{getError('bankName')}</FieldError>
              </div>

              {/* Nama Pemilik */}
              <div>
                <label htmlFor="namaPemilik" className="mb-2 block text-sm font-semibold text-gray-800">
                  Nama Pemilik Rekening <span className="text-red-500">*</span>
                </label>
                <input
                  id="namaPemilik"
                  type="text"
                  value={values.namaPemilik}
                  onChange={(e) => update('namaPemilik', e.target.value)}
                  onBlur={() => markTouched('namaPemilik')}
                  placeholder="Nama sesuai buku tabungan"
                  className={`w-full rounded-lg border px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 ${
                    getError('namaPemilik') ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
                <FieldError>{getError('namaPemilik')}</FieldError>
              </div>

              {/* Nomor Rekening */}
              <div>
                <label htmlFor="nomorRekening" className="mb-2 block text-sm font-semibold text-gray-800">
                  Nomor Rekening <span className="text-red-500">*</span>
                </label>
                <input
                  id="nomorRekening"
                  type="text"
                  inputMode="numeric"
                  value={values.nomorRekening}
                  onChange={(e) => update('nomorRekening', e.target.value.replace(/\D/g, '').slice(0, 16))}
                  onBlur={() => markTouched('nomorRekening')}
                  placeholder="10–16 digit angka"
                  className={`w-full rounded-lg border px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 font-mono ${
                    getError('nomorRekening') ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
                <FieldError>{getError('nomorRekening')}</FieldError>
              </div>

              {/* Foto buku tabungan (opsional) */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-800">
                  Foto Buku Tabungan{' '}
                  <span className="text-gray-400 font-normal">(opsional, PNG/JPG maks 5MB)</span>
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full min-h-28 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-6 text-center transition hover:border-blue-300 hover:bg-blue-50/50"
                >
                  <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16V4m0 0 4 4m-4-4-4 4M20 16.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.5" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-700">
                    {values.proofFile ? values.proofFile.name : 'Klik untuk upload foto'}
                  </span>
                  {existingRekening?.fotoBukuUrl && !values.proofFile && (
                    <span className="mt-1 text-xs text-emerald-600">Foto lama tersimpan — upload baru untuk mengganti</span>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={handleFileInput}
                />
                <FieldError>{getError('proofFile')}</FieldError>
              </div>

              {submitError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {submitError}
                </div>
              )}

              <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-5">
                {hasExisting && (
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition"
                  >
                    Batal
                  </button>
                )}
                <Link
                  href="/mahasiswa/profil"
                  className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition"
                >
                  ← Kembali ke Profil
                </Link>
                <button
                  id="btn-simpan-rekening"
                  type="submit"
                  disabled={!isFormValid || submitting}
                  className={`rounded-lg px-6 py-3 text-sm font-bold text-white transition ${
                    isFormValid && !submitting
                      ? 'bg-blue-700 hover:bg-blue-800'
                      : 'cursor-not-allowed bg-gray-300'
                  }`}
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Rekening'}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </MahasiswaLayout>
  );
}

export async function getServerSideProps(context) {
  const auth = withAuth(context, 'mahasiswa');
  if (auth.redirect) return auth;

  const { user } = auth.props;
  const profile = await getMahasiswaProfile(user);
  const rawRekening = await getLatestRekening(profile.userId);

  // Jika mahasiswa sudah LULUS, arahkan ke daftar-ulang-rekening
  const { getServerSupabase } = await import('@/lib/supabaseServer');
  const supabaseServer = getServerSupabase();
  if (profile.userId) {
    const { data: lulusPendaftaran } = await supabaseServer
      .from('pendaftaran')
      .select('pendaftaranId')
      .eq('userId', profile.userId)
      .eq('status', 'LULUS')
      .limit(1)
      .maybeSingle();

    if (lulusPendaftaran) {
      return {
        redirect: {
          destination: '/mahasiswa/daftar-ulang-rekening',
          permanent: false,
        },
      };
    }
  }

  return {
    props: {
      user,
      profile,
      existingRekening: rawRekening ?? null,
    },
  };
}
