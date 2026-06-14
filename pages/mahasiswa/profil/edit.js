import { useMemo, useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import MahasiswaLayout from '@/components/layouts/MahasiswaLayout';
import { withAuth } from '@/lib/auth';
import { getServerSupabase } from '@/lib/supabaseServer';
import { getMahasiswaProfile } from '@/lib/mahasiswaProfile';

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || 'M';
}

function validate(values) {
  const errors = {};

  if (!values.nama.trim()) errors.nama = 'Nama lengkap wajib diisi.';
  if (values.nama.trim() && values.nama.trim().length < 3) {
    errors.nama = 'Nama lengkap minimal 3 karakter.';
  }
  if (!values.email.trim()) errors.email = 'Email wajib diisi.';
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Format email tidak valid.';
  }
  if (values.noHandphone && !/^\+?\d{9,15}$/.test(values.noHandphone)) {
    errors.noHandphone = 'No handphone hanya boleh angka, 9-15 digit.';
  }
  if (!values.provinsiLahirId) errors.provinsiLahirId = 'Provinsi lahir wajib dipilih.';
  if (!values.kotaLahirWilayahId) errors.kotaLahirWilayahId = 'Kabupaten/kota lahir wajib dipilih.';
  if (!values.tanggalLahir) errors.tanggalLahir = 'Tanggal lahir wajib diisi.';
  if (!values.provinsiKtpId) errors.provinsiKtpId = 'Provinsi KTP wajib dipilih.';
  if (!values.kabupatenKtpId) errors.kabupatenKtpId = 'Kabupaten/Kota KTP wajib dipilih.';
  if (!values.alamatKtp.trim()) errors.alamatKtp = 'Detail alamat KTP wajib diisi.';

  if (values.ipk && (isNaN(parseFloat(values.ipk)) || parseFloat(values.ipk) < 0 || parseFloat(values.ipk) > 4)) {
    errors.ipk = 'IPK harus antara 0.00 – 4.00.';
  }

  return errors;
}

function FieldError({ children }) {
  if (!children) return null;
  return <p className="mt-2 text-xs font-semibold text-red-600">{children}</p>;
}

function TextInput({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  required = false,
  type = 'text',
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-sm font-semibold text-gray-800">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`w-full rounded-lg border px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 ${error ? 'border-red-300' : 'border-gray-200'
          }`}
      />
      <FieldError>{error}</FieldError>
    </div>
  );
}

function SelectInput({
  label,
  name,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  disabled = false,
  helper,
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-sm font-semibold text-gray-800">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value ?? option} value={option.value ?? option}>
            {option.label ?? option}
          </option>
        ))}
      </select>
      {helper && <p className="mt-2 text-xs text-gray-500">{helper}</p>}
    </div>
  );
}

export default function EditProfilMahasiswaPage({
  user,
  profile,
  provinsiOptions,
  wilayahOptions,
  isLulus,
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [serverErrors, setServerErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [activeTab, setActiveTab] = useState('pribadi');

  // Document upload state
  const [uploadingDoc, setUploadingDoc] = useState({});
  const [uploadError, setUploadError] = useState({});

  // Banner profil tidak lengkap (diredirect dari halaman pendaftaran)
  const [incompleteFields, setIncompleteFields] = useState('');
  useEffect(() => {
    if (router.query.incomplete === '1' && router.query.fields) {
      setIncompleteFields(decodeURIComponent(router.query.fields));
    }
  }, [router.query]);

  const [values, setValues] = useState({
    tentangSaya: profile.tentangSaya || '',
    nama: profile.nama || user.nama || '',
    nik: profile.nik || '',
    jenisKelamin: profile.jenisKelamin || '',
    provinsiLahirId: profile.provinsiLahirId ? String(profile.provinsiLahirId) : '',
    kotaLahirWilayahId: profile.kotaLahirWilayahId ? String(profile.kotaLahirWilayahId) : '',
    tanggalLahir: profile.tanggalLahir ? String(profile.tanggalLahir).slice(0, 10) : '',
    email: profile.email || user.email || '',
    noHandphone: profile.noHandphone || '',
    provinsiKtpId: profile.provinsiKtpId ? String(profile.provinsiKtpId) : '',
    kabupatenKtpId: profile.kabupatenKtpId ? String(profile.kabupatenKtpId) : '',
    alamatKtp: profile.alamatKtp || '',
    namaUniversitas: profile.namaUniversitas || '',
    jurusan: profile.jurusan || '',
    semesterAktif: profile.semesterAktif ? String(profile.semesterAktif) : '',
    ipk: profile.ipk !== undefined && profile.ipk !== null ? String(profile.ipk) : '',
    namaAyah: profile.namaAyah || '',
    pekerjaanAyah: profile.pekerjaanAyah || '',
    namaIbu: profile.namaIbu || '',
    pekerjaanIbu: profile.pekerjaanIbu || '',
    penghasilanOrangTua: profile.penghasilanOrangTua || '',
    fileTranskrip: profile.fileTranskrip || '',
    fileKk: profile.fileKk || '',
    fileKtp: profile.fileKtp || '',
  });

  const handleFileUpload = async (jenis, file) => {
    if (!file) return;
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedMimes.includes(file.type)) {
      setUploadError(prev => ({ ...prev, [jenis]: 'Format file harus PDF, JPG, atau PNG.' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError(prev => ({ ...prev, [jenis]: 'Ukuran file maksimal 5MB.' }));
      return;
    }

    setUploadingDoc(prev => ({ ...prev, [jenis]: true }));
    setUploadError(prev => ({ ...prev, [jenis]: '' }));

    const fileToBase64 = (f) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const s = reader.result;
          const idx = s.indexOf(',');
          resolve(idx >= 0 ? s.slice(idx + 1) : s);
        };
        reader.onerror = () => reject(reader.error || new Error('Gagal membaca file'));
        reader.readAsDataURL(f);
      });

    try {
      const base64 = await fileToBase64(file);
      const res = await fetch('/api/mahasiswa/upload-dokumen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jenis,
          fileBase64: base64,
          mimeType: file.type,
          fileName: file.name
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal mengupload dokumen.');
      }
      setValues(prev => ({ ...prev, [jenis === 'transkrip' ? 'fileTranskrip' : jenis === 'kk' ? 'fileKk' : 'fileKtp']: data.publicUrl }));
    } catch (err) {
      setUploadError(prev => ({ ...prev, [jenis]: err.message }));
    } finally {
      setUploadingDoc(prev => ({ ...prev, [jenis]: false }));
    }
  };

  const errors = useMemo(() => validate(values), [values]);
  const kotaLahirOptions = useMemo(
    () => wilayahOptions.filter((wilayah) => String(wilayah.provinsiId) === String(values.provinsiLahirId)),
    [wilayahOptions, values.provinsiLahirId]
  );
  const kabupatenKtpOptions = useMemo(
    () => wilayahOptions.filter((wilayah) => String(wilayah.provinsiId) === String(values.provinsiKtpId)),
    [wilayahOptions, values.provinsiKtpId]
  );

  const incomeOptions = [
    '< Rp 1.500.000',
    'Rp 1.500.000 - Rp 3.000.000',
    'Rp 3.000.000 - Rp 5.000.000',
    'Rp 5.000.000 - Rp 10.000.000',
    '> Rp 10.000.000'
  ];
  const mergedIncomeOptions = useMemo(() => {
    const opts = [...incomeOptions];
    if (values.penghasilanOrangTua && !opts.includes(values.penghasilanOrangTua)) {
      opts.push(values.penghasilanOrangTua);
    }
    return opts;
  }, [values.penghasilanOrangTua]);

  function UploadField({ label, jenis, value }) {
    const docInputRef = useRef(null);
    const uploading = uploadingDoc[jenis];
    const error = uploadError[jenis];

    return (
      <div className="p-5 border border-gray-200 rounded-xl bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="text-blue-600 bg-blue-50 p-2.5 rounded-lg text-lg mt-0.5">
            📄
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{label}</p>
            {value ? (
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-emerald-700">✓ Berkas telah diunggah</span> · <a href={value} target="_blank" rel="noopener noreferrer" className="underline font-semibold text-blue-600 hover:text-blue-800">Lihat Berkas</a>
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-1">Belum ada berkas yang diunggah.</p>
            )}
            {error && <p className="text-xs text-red-600 mt-1 font-semibold">{error}</p>}
          </div>
        </div>

        <div>
          <input
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/jpg"
            className="hidden"
            ref={docInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(jenis, file);
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => docInputRef.current?.click()}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              uploading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
            }`}
          >
            {uploading ? 'Mengunggah...' : value ? 'Ganti Berkas' : 'Pilih & Unggah Berkas'}
          </button>
        </div>
      </div>
    );
  }

  const nama = values.nama || 'Mahasiswa';
  const email = values.email || '-';

  function updateValue(event) {
    const { name, value } = event.target;
    setValues((current) => {
      const next = { ...current, [name]: value };
      if (name === 'provinsiLahirId') {
        next.kotaLahirWilayahId = '';
      }
      if (name === 'provinsiKtpId') {
        next.kabupatenKtpId = '';
      }
      return next;
    });
    setSaved(false);
    setSubmitError('');
    setServerErrors({});
  }

  function markTouched(event) {
    setTouched((current) => ({ ...current, [event.target.name]: true }));
  }

  function showError(name) {
    return touched[name] ? (errors[name] || serverErrors[name] || '') : '';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setTouched({
      nama: true,
      email: true,
      noHandphone: true,
      provinsiLahirId: true,
      kotaLahirWilayahId: true,
      tanggalLahir: true,
      provinsiKtpId: true,
      kabupatenKtpId: true,
      alamatKtp: true,
    });
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    setSaved(false);
    setSubmitError('');
    setServerErrors({});
    try {
      const res = await fetch('/api/mahasiswa/profil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: values.nama,
          email: values.email,
          tentangSaya: values.tentangSaya,
          nik: values.nik,
          jenisKelamin: values.jenisKelamin,
          provinsiLahirId: values.provinsiLahirId,
          kotaLahirWilayahId: values.kotaLahirWilayahId,
          tanggalLahir: values.tanggalLahir,
          noHandphone: values.noHandphone,
          provinsiKtpId: values.provinsiKtpId,
          kabupatenKtpId: values.kabupatenKtpId,
          alamatKtp: values.alamatKtp,
          namaUniversitas: values.namaUniversitas,
          jurusan: values.jurusan,
          semesterAktif: values.semesterAktif,
          ipk: values.ipk,
          namaAyah: values.namaAyah,
          pekerjaanAyah: values.pekerjaanAyah,
          namaIbu: values.namaIbu,
          pekerjaanIbu: values.pekerjaanIbu,
          penghasilanOrangTua: values.penghasilanOrangTua,
          fileTranskrip: values.fileTranskrip,
          fileKk: values.fileKk,
          fileKtp: values.fileKtp,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        setServerErrors(json.errors || {});
        setSubmitError(json.message || 'Gagal menyimpan profil.');
        return;
      }

      setSaved(true);
    } catch {
      setSubmitError('Terjadi kesalahan jaringan saat menyimpan profil.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <MahasiswaLayout user={{ ...user, nama, email }}>
      <Head>
        <title>Edit Profil - BantuBeasiswa</title>
        <meta name="description" content="Edit profil mahasiswa BantuBeasiswa." />
      </Head>

      {/* Banner: profil belum lengkap */}
      {incompleteFields && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 flex gap-3 items-start shadow-sm">
          <span className="text-amber-500 mt-0.5 text-lg shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-bold text-amber-800">Profil belum lengkap — Lengkapi data berikut untuk mendaftar beasiswa:</p>
            <p className="text-sm text-amber-700 mt-1">{incompleteFields}</p>
            <p className="text-xs text-amber-600 mt-2">Setelah disimpan, kamu bisa kembali mendaftar beasiswa.</p>
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-5">
          <section className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-white bg-yellow-400 text-lg font-bold text-blue-800 shadow-sm">
                  {getInitials(nama)}
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-bold text-gray-950">{nama}</h1>
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
                className="flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700"
              >
                Data Pribadi
              </Link>
              <Link
                href="/mahasiswa/rekening-pencairan"
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Rekening Pencairan
              </Link>
              <Link
                href="/mahasiswa/laporan-kendala"
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Laporan Kendala
              </Link>
            </nav>
          </section>
        </aside>

        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="border-b border-gray-200">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'pribadi', label: 'Data Pribadi' },
                { id: 'akademik', label: 'Data Akademik' },
                { id: 'keluarga', label: 'Data Keluarga' },
                { id: 'dokumen', label: 'Dokumen' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? 'border-b-2 border-blue-600 bg-blue-50 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-7 space-y-7">
            {activeTab === 'pribadi' && (
              <>
                <section>
                  <label htmlFor="tentangSaya" className="mb-2 block text-sm font-semibold text-gray-800">
                    Tentang Saya <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="tentangSaya"
                    name="tentangSaya"
                    value={values.tentangSaya}
                    onChange={updateValue}
                    rows={7}
                    maxLength={1500}
                    placeholder="Penjelasan singkat mengenai visi pribadi dan minat dalam karir"
                    className="w-full resize-y rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                  <div className="mt-2 flex items-center justify-end text-xs text-gray-500">
                    <span>{values.tentangSaya.length}/1500</span>
                  </div>
                </section>

                <section className="border-t border-gray-100 pt-7">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <TextInput
                        label="Nama Lengkap"
                        name="nama"
                        value={values.nama}
                        onChange={updateValue}
                        onBlur={markTouched}
                        error={showError('nama')}
                        placeholder="Nama lengkap"
                        required
                      />
                    </div>
                    <TextInput
                      label="NIK"
                      name="nik"
                      value={values.nik}
                      onChange={updateValue}
                      onBlur={markTouched}
                      error={showError('nik')}
                      placeholder="Masukkan nomor induk kependudukan"
                    />
                    <SelectInput
                      label="Jenis Kelamin"
                      name="jenisKelamin"
                      value={values.jenisKelamin}
                      onChange={updateValue}
                      options={['Laki-laki', 'Perempuan']}
                      placeholder="Jenis kelamin"
                      required
                    />
                    <div>
                      <SelectInput
                        label="Provinsi Lahir"
                        name="provinsiLahirId"
                        value={values.provinsiLahirId}
                        onChange={updateValue}
                        options={provinsiOptions}
                        placeholder="Pilih provinsi lahir"
                        required
                      />
                      <FieldError>{showError('provinsiLahirId')}</FieldError>
                    </div>
                    <div>
                      <SelectInput
                        label="Kabupaten/Kota Lahir"
                        name="kotaLahirWilayahId"
                        value={values.kotaLahirWilayahId}
                        onChange={updateValue}
                        options={kotaLahirOptions}
                        placeholder="Pilih kabupaten/kota lahir"
                        disabled={!values.provinsiLahirId}
                        helper={!values.provinsiLahirId ? 'Pilih provinsi lahir terlebih dahulu.' : 'Kabupaten/kota lahir difilter berdasarkan provinsi.'}
                        required
                      />
                      <FieldError>{showError('kotaLahirWilayahId')}</FieldError>
                    </div>
                    <div>
                      <TextInput
                        label="Tanggal Lahir"
                        name="tanggalLahir"
                        type="date"
                        value={values.tanggalLahir}
                        onChange={updateValue}
                        onBlur={markTouched}
                        error={showError('tanggalLahir')}
                        required
                      />
                    </div>

                    <TextInput
                      label="Email"
                      name="email"
                      type="email"
                      value={values.email}
                      onChange={updateValue}
                      onBlur={markTouched}
                      error={showError('email')}
                      placeholder="email@contoh.com"
                      required
                    />
                    <TextInput
                      label="No Handphone"
                      name="noHandphone"
                      value={values.noHandphone}
                      onChange={updateValue}
                      onBlur={markTouched}
                      error={showError('noHandphone')}
                      placeholder="+6281210460450"
                      required
                    />
                  </div>
                </section>

                <section className="border-t border-gray-100 pt-7">
                  <h2 className="mb-5 text-base font-bold text-gray-950">Alamat Sesuai KTP</h2>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <SelectInput
                        label="Provinsi"
                        name="provinsiKtpId"
                        value={values.provinsiKtpId}
                        onChange={updateValue}
                        options={provinsiOptions}
                        placeholder="Provinsi"
                        required
                      />
                      <FieldError>{showError('provinsiKtpId')}</FieldError>
                    </div>
                    <div>
                      <SelectInput
                        label="Kabupaten/Kota"
                        name="kabupatenKtpId"
                        value={values.kabupatenKtpId}
                        onChange={updateValue}
                        options={kabupatenKtpOptions}
                        placeholder="Kabupaten/Kota"
                        disabled={!values.provinsiKtpId}
                        helper={!values.provinsiKtpId ? 'Pilih provinsi terlebih dahulu.' : 'Kabupaten/kota difilter berdasarkan provinsi.'}
                        required
                      />
                      <FieldError>{showError('kabupatenKtpId')}</FieldError>
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="alamatKtp" className="mb-2 block text-sm font-semibold text-gray-800">
                        Detail Alamat <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="alamatKtp"
                        name="alamatKtp"
                        value={values.alamatKtp}
                        onChange={updateValue}
                        rows={4}
                        placeholder="Tulis Nama Jalan, Blok, No dll."
                        className="w-full resize-y rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      />
                      <FieldError>{showError('alamatKtp')}</FieldError>
                    </div>
                  </div>
                </section>
              </>
            )}

            {activeTab === 'akademik' && (
              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-5">Pendidikan Tinggi</h3>
                <div className="grid gap-5 md:grid-cols-2">
                  <TextInput
                    label="Nama Universitas / Institusi"
                    name="namaUniversitas"
                    value={values.namaUniversitas}
                    onChange={updateValue}
                    placeholder="Contoh: Universitas Indonesia"
                  />
                  <TextInput
                    label="Program Studi / Jurusan"
                    name="jurusan"
                    value={values.jurusan}
                    onChange={updateValue}
                    placeholder="Contoh: Teknik Informatika"
                  />
                  <SelectInput
                    label="Semester Aktif"
                    name="semesterAktif"
                    value={values.semesterAktif}
                    onChange={updateValue}
                    options={Array.from({ length: 14 }, (_, i) => String(i + 1))}
                    placeholder="Pilih semester"
                  />
                  <TextInput
                    label="IPK Terakhir"
                    name="ipk"
                    value={values.ipk}
                    onChange={updateValue}
                    onBlur={markTouched}
                    error={showError('ipk')}
                    placeholder="Contoh: 3.75"
                  />
                </div>
              </section>
            )}

            {activeTab === 'keluarga' && (
              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-5">Keluarga & Wali</h3>
                <div className="grid gap-5 md:grid-cols-2">
                  <TextInput
                    label="Nama Ayah"
                    name="namaAyah"
                    value={values.namaAyah}
                    onChange={updateValue}
                    placeholder="Nama lengkap ayah"
                  />
                  <TextInput
                    label="Pekerjaan Ayah"
                    name="pekerjaanAyah"
                    value={values.pekerjaanAyah}
                    onChange={updateValue}
                    placeholder="Pekerjaan ayah"
                  />
                  <TextInput
                    label="Nama Ibu"
                    name="namaIbu"
                    value={values.namaIbu}
                    onChange={updateValue}
                    placeholder="Nama lengkap ibu"
                  />
                  <TextInput
                    label="Pekerjaan Ibu"
                    name="pekerjaanIbu"
                    value={values.pekerjaanIbu}
                    onChange={updateValue}
                    placeholder="Pekerjaan ibu"
                  />
                  <div className="md:col-span-2">
                    <SelectInput
                      label="Rata-rata Penghasilan Orang Tua / Bulan"
                      name="penghasilanOrangTua"
                      value={values.penghasilanOrangTua}
                      onChange={updateValue}
                      options={mergedIncomeOptions}
                      placeholder="Pilih rentang penghasilan"
                    />
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'dokumen' && (
              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-5">Berkas Persyaratan</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Unggah dokumen pendukung dalam format PDF, PNG, atau JPG (Maksimal 5MB per berkas).
                </p>
                <div className="space-y-4">
                  <UploadField
                    label="Transkrip Nilai Akademik"
                    jenis="transkrip"
                    value={values.fileTranskrip}
                  />
                  <UploadField
                    label="Kartu Keluarga (KK)"
                    jenis="kk"
                    value={values.fileKk}
                  />
                  <UploadField
                    label="Kartu Tanda Penduduk (KTP)"
                    jenis="ktp"
                    value={values.fileKtp}
                  />
                </div>
              </section>
            )}
          </div>

          {saved && (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              Profil berhasil disimpan !
            </div>
          )}
          {submitError && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              <p>{submitError}</p>
              {Object.keys(serverErrors).length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 font-normal">
                  {Object.entries(serverErrors).map(([field, message]) => (
                    <li key={field}>{message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/mahasiswa/profil" className="text-sm font-semibold text-rose-600 transition hover:text-rose-700">
              Batalkan
            </Link>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
              <Link
                href="/mahasiswa/rekening-pencairan"
                className="rounded-lg bg-blue-950 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-blue-900"
              >
                Edit Informasi Rekening
              </Link>
            </div>
          </div>
        </form>
      </div>
    </MahasiswaLayout>
  );
}

export async function getServerSideProps(context) {
  const auth = withAuth(context, 'mahasiswa');
  if (auth.redirect) return auth;

  const { user } = auth.props;
  const profile = await getMahasiswaProfile(user);
  const supabase = getServerSupabase();

  const [provinsiResult, wilayahResult] = await Promise.all([
    supabase
      .from('provinsi')
      .select('provinsiId, nama, isAfirmasi')
      .order('nama', { ascending: true }),
    supabase
      .from('wilayah')
      .select('wilayahId, provinsiId, nama, tipe, isAfirmasi, is3T')
      .in('tipe', ['kabupaten', 'kota'])
      .order('nama', { ascending: true }),
  ]);

  if (provinsiResult.error) {
    console.error('[profil/edit] provinsi fetch error:', provinsiResult.error);
  }
  if (wilayahResult.error) {
    console.error('[profil/edit] wilayah fetch error:', wilayahResult.error);
  }

  const provinsiOptions = (provinsiResult.data || []).map((provinsi) => ({
    value: String(provinsi.provinsiId),
    label: `${provinsi.nama}${provinsi.isAfirmasi ? ' - Afirmasi' : ''}`,
    nama: provinsi.nama,
    isAfirmasi: Boolean(provinsi.isAfirmasi),
  }));

  const wilayahOptions = (wilayahResult.data || []).map((wilayah) => ({
    value: String(wilayah.wilayahId),
    label: `${wilayah.nama}${wilayah.isAfirmasi || wilayah.is3T ? ' - Afirmasi' : ''}`,
    nama: wilayah.nama,
    tipe: wilayah.tipe,
    provinsiId: wilayah.provinsiId,
    isAfirmasi: Boolean(wilayah.isAfirmasi),
    is3T: Boolean(wilayah.is3T),
  }));

  return {
    props: {
      user,
      profile,
      provinsiOptions,
      wilayahOptions,
    },
  };
}
