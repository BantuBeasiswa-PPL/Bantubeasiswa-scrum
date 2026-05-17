import Head from 'next/head';
import Link from 'next/link';
import MahasiswaLayout from '@/components/layouts/MahasiswaLayout';
import { withAuth } from '@/lib/auth';
import { getServerSupabase } from '@/lib/supabaseServer';
import {
  getLatestRekening,
  getMahasiswaProfile,
} from '@/lib/mahasiswaProfile';

const C = {
  blue: '#0056b3',
  gold: '#ffc107',
  dark: '#333333',
};

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || 'M';
}

function EmptyValue({ value }) {
  return value ? (
    <span className="text-gray-800">{value}</span>
  ) : (
    <span className="text-gray-400">Data belum diisi</span>
  );
}

function DataItem({ label, value }) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-800">{label}</p>
      <p className="mt-1 text-sm">
        <EmptyValue value={value} />
      </p>
    </div>
  );
}

function formatTanggal(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

export default function ProfilMahasiswaPage({ user, profile, rekening, wilayahLabels }) {
  const nama = profile.nama || user.nama || 'Mahasiswa';
  const email = profile.email || user.email || '-';
  const tempatLahir = [
    wilayahLabels.kotaLahir,
    wilayahLabels.provinsiLahir,
  ].filter(Boolean).join(', ');
  const alamatKtp = [
    profile.alamatKtp,
    wilayahLabels.kabupatenKtp,
    wilayahLabels.provinsiKtp,
  ].filter(Boolean).join(', ');

  return (
    <MahasiswaLayout user={{ ...user, nama, email }}>
      <Head>
        <title>Profil Saya - BantuBeasiswa</title>
        <meta
          name="description"
          content="Profil mahasiswa BantuBeasiswa."
        />
      </Head>

      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-5">
          <section className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 p-6">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-white text-lg font-bold shadow-sm"
                  style={{ backgroundColor: C.gold, color: C.blue }}
                >
                  {getInitials(nama)}
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-bold text-gray-950">
                    {nama}
                  </h1>
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
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-xs">
                  ID
                </span>
                Data Pribadi
              </Link>
              <Link
                href="/mahasiswa/daftar-ulang-rekening"
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-xs">
                  Rp
                </span>
                Rekening Pencairan
              </Link>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-xs">
                  LK
                </span>
                Laporan Kendala
              </button>
            </nav>
          </section>
        </aside>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="border-b border-gray-200">
            <div className="flex flex-wrap gap-2">
              <button className="border-b-2 border-blue-600 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                Data Pribadi
              </button>
              <button className="px-4 py-3 text-sm font-semibold text-gray-500">
                Data Akademik
              </button>
              <button className="px-4 py-3 text-sm font-semibold text-gray-500">
                Data Keluarga
              </button>
              <button className="px-4 py-3 text-sm font-semibold text-gray-500">
                Dokumen
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-b border-gray-100 pb-6 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-950">Data Pribadi</h2>
              <p className="mt-1 text-sm text-gray-500">
                Pastikan data pribadi benar untuk mempermudah proses pendaftaran.
              </p>
            </div>
            <Link
              href="/mahasiswa/profil/edit"
              className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              style={{ backgroundColor: C.blue }}
            >
              Edit Profil
            </Link>
          </div>

          <div className="mt-7">
            <h3 className="text-lg font-bold text-gray-900">Biodata</h3>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <DataItem label="Tentang Saya" value={profile.tentangSaya} />
              </div>
              <DataItem label="Nama Lengkap" value={nama} />
              <DataItem label="NIK" value={profile.nik} />
              <DataItem label="Jenis Kelamin" value={profile.jenisKelamin} />
              <DataItem label="Tempat Lahir" value={tempatLahir} />
              <DataItem label="Tanggal Lahir" value={formatTanggal(profile.tanggalLahir)} />
              <DataItem label="Email" value={email} />
              <DataItem label="No Handphone" value={profile.noHandphone} />
              <DataItem label="Nama Bank" value={rekening.namaBank} />
              <DataItem label="No Rekening" value={rekening.nomorRekening} />
              <DataItem label="Status Rekening" value={rekening.status} />
              <div className="md:col-span-2">
                <DataItem label="Alamat Sesuai KTP" value={alamatKtp} />
              </div>
            </div>
          </div>
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
  const rekening = await getLatestRekening(profile.userId);
  const supabase = getServerSupabase();

  const provinsiIds = [
    profile.provinsiLahirId,
    profile.provinsiKtpId,
  ].filter(Boolean);
  const wilayahIds = [
    profile.kotaLahirWilayahId,
    profile.kabupatenKtpId,
  ].filter(Boolean);

  const [provinsiResult, wilayahResult] = await Promise.all([
    provinsiIds.length
      ? supabase.from('provinsi').select('provinsiId, nama').in('provinsiId', provinsiIds)
      : Promise.resolve({ data: [] }),
    wilayahIds.length
      ? supabase.from('wilayah').select('wilayahId, nama').in('wilayahId', wilayahIds)
      : Promise.resolve({ data: [] }),
  ]);

  const provinsiMap = new Map((provinsiResult.data || []).map((item) => [String(item.provinsiId), item.nama]));
  const wilayahMap = new Map((wilayahResult.data || []).map((item) => [String(item.wilayahId), item.nama]));
  const wilayahLabels = {
    provinsiLahir: provinsiMap.get(String(profile.provinsiLahirId)) || '',
    kotaLahir: wilayahMap.get(String(profile.kotaLahirWilayahId)) || '',
    provinsiKtp: provinsiMap.get(String(profile.provinsiKtpId)) || '',
    kabupatenKtp: wilayahMap.get(String(profile.kabupatenKtpId)) || '',
  };

  return {
    props: {
      user,
      profile,
      rekening,
      wilayahLabels,
    },
  };
}
