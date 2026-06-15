import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import MahasiswaLayout from '../../components/layouts/MahasiswaLayout';
import { withAuth } from '../../lib/auth';
import { getServerSupabase } from '../../lib/supabaseServer';
import { supabase } from '../../lib/db';
import { showSuccess, showError, showConfirm } from '../../lib/swal';

const C = {
  blue  : '#0056b3',
  gold  : '#ffc107',
  dark  : '#333333',
  light : '#f8f9fa',
  white : '#ffffff',
  gray  : '#6b7280',
};

// Helper: hitung selisih hari deadline
function hitungHariTersisa(deadline) {
  if (!deadline) return null;
  const selisihMs = new Date(deadline) - new Date();
  return Math.ceil(selisihMs / (1000 * 60 * 60 * 24));
}

// Badge deadline
function DeadlineBadge({ deadline }) {
  const hari = hitungHariTersisa(deadline);
  if (hari === null) return null;

  if (hari < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
        Berakhir
      </span>
    );
  }
  if (hari <= 7) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
        Closing Soon · {hari}h lagi
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
      {hari} hari lagi
    </span>
  );
}

// Badge wilayah
function WilayahBadge({ wilayah }) {
  const isAfirmasi = wilayah.isAfirmasi;
  const is3T = wilayah.is3T;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border"
      style={{
        backgroundColor: isAfirmasi || is3T ? '#eff6ff' : '#f9fafb',
        borderColor    : isAfirmasi || is3T ? '#bfdbfe' : '#e5e7eb',
        color          : isAfirmasi || is3T ? C.blue    : C.gray,
      }}
    >
      {wilayah.nama}
    </span>
  );
}

// Card Beasiswa Favorit (dilengkapi tombol hapus instan)
function BeasiswaFavoritCard({ beasiswa, userId, onRemove }) {
  const [hovered, setHovered] = useState(false);

  const wilayahList = (beasiswa.beasiswa_wilayah ?? [])
    .map((bw) => bw.wilayah)
    .filter(Boolean);

  const namaOrganisasi = beasiswa.pendonor?.statusOrganisasi ?? '—';

  const deadlineFormatted = beasiswa.deadline
    ? new Date(beasiswa.deadline).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : '—';

  return (
    <div
      className="rounded-xl border flex flex-col transition-all duration-250 relative overflow-hidden"
      style={{
        backgroundColor: C.white,
        borderColor    : hovered ? C.blue : '#e5e7eb',
        boxShadow      : hovered ? '0 4px 20px rgba(0,86,179,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
        transform      : hovered ? 'translateY(-2px)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="h-1.5 rounded-t-xl" style={{ backgroundColor: C.blue }} />

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="text-base font-bold leading-snug line-clamp-2" style={{ color: C.dark }}>
            {beasiswa.judul}
          </h2>
          <div className="shrink-0">
            <DeadlineBadge deadline={beasiswa.deadline} />
          </div>
        </div>

        <p className="text-sm mb-3" style={{ color: C.gray }}>
          {namaOrganisasi}
        </p>

        {beasiswa.deskripsi && (
          <p className="text-sm leading-relaxed line-clamp-2 mb-3" style={{ color: '#4b5563' }}>
            {beasiswa.deskripsi}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
          <div className="rounded-lg px-3 py-2" style={{ backgroundColor: '#f0f7ff' }}>
            <p className="text-xs mb-0.5" style={{ color: C.gray }}>Jalur</p>
            <p className="font-bold" style={{ color: C.blue }}>
              {beasiswa.jalur || 'Reguler'}
            </p>
          </div>
          <div className="rounded-lg px-3 py-2" style={{ backgroundColor: '#f0f7ff' }}>
            <p className="text-xs mb-0.5" style={{ color: C.gray }}>Deadline</p>
            <p className="font-bold text-xs" style={{ color: C.dark }}>
              {deadlineFormatted}
            </p>
          </div>
        </div>

        {wilayahList.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {wilayahList.slice(0, 3).map((w) => (
              <WilayahBadge key={w.wilayahId || w.id} wilayah={w} />
            ))}
            {wilayahList.length > 3 && (
              <span className="text-xs px-2 py-0.5 rounded border" style={{ color: C.gray, borderColor: '#e5e7eb' }}>
                +{wilayahList.length - 3} lainnya
              </span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-auto pt-3 border-t flex gap-2" style={{ borderColor: '#f3f4f6' }}>
          <Link
            href={`/beasiswa/${beasiswa.beasiswaId}`}
            className="flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all duration-200"
            style={{
              backgroundColor: hovered ? C.blue : '#eff6ff',
              color          : hovered ? C.white : C.blue,
            }}
          >
            Lihat Detail →
          </Link>
          <button
            onClick={() => onRemove(beasiswa.beasiswaId)}
            className="px-3 py-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-650 transition-colors"
            title="Hapus dari Favorit"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BeasiswaFavoritPage({ user, initialBeasiswas }) {
  const [beasiswas, setBeasiswas] = useState(initialBeasiswas);
  const [removingId, setRemovingId] = useState(null);

  const handleRemove = async (beasiswaId) => {
    const result = await showConfirm(
      'Hapus dari Favorit?',
      'Apakah Anda yakin ingin menghapus beasiswa ini dari daftar favorit?',
      'Ya, Hapus',
      'Batal',
      true
    );
    if (!result.isConfirmed) {
      return;
    }

    setRemovingId(beasiswaId);
    try {
      const userId = user.userId || user.accountId;
      
      // Hapus dari Supabase - coba snake_case & camelCase secara dinamis
      const { error: snakeError } = await supabase
        .from('favorit')
        .delete()
        .eq('user_id', userId)
        .eq('beasiswa_id', beasiswaId);

      if (snakeError) {
        const { error: camelError } = await supabase
          .from('favorit')
          .delete()
          .eq('userId', userId)
          .eq('beasiswaId', beasiswaId);
        
        if (camelError) throw camelError;
      }

      // Hapus dari state lokal
      setBeasiswas(beasiswas.filter(b => b.beasiswaId !== beasiswaId));
      await showSuccess('Berhasil!', 'Beasiswa telah dihapus dari daftar favorit Anda.');
    } catch (err) {
      console.error('Gagal menghapus dari favorit:', err);
      await showError('Gagal!', 'Gagal menghapus beasiswa dari favorit.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <>
      <Head>
        <title>Beasiswa Favorit Saya · BantuBeasiswa</title>
        <meta name="description" content="Koleksi beasiswa pilihan Anda yang disimpan sebagai favorit." />
      </Head>

      <MahasiswaLayout user={user}>
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-7 rounded-full" style={{ backgroundColor: C.gold }} />
            <h1 className="text-2xl font-extrabold" style={{ color: C.dark }}>
              Beasiswa Favorit
            </h1>
          </div>
          <p className="text-sm ml-4" style={{ color: C.gray }}>
            Pantau dan kelola seluruh beasiswa pilihan Anda agar mudah mendaftar nanti
          </p>
        </div>

        {/* Favorites Grid / Empty State */}
        {beasiswas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="text-5xl mb-4 animate-bounce">⭐</div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Belum ada beasiswa tersimpan</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm">
              Jelajahi berbagai peluang beasiswa aktif dan simpan beasiswa favorit Anda untuk diakses kembali dengan mudah.
            </p>
            <Link
              href="/mahasiswa/cari"
              className="px-6 py-2.5 rounded-lg text-sm font-bold text-white transition-all shadow-md hover:shadow-lg"
              style={{ backgroundColor: C.blue }}
            >
              Jelajahi Katalog →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {beasiswas.map((b) => (
              <div
                key={b.beasiswaId}
                className={`transition-all duration-300 ${removingId === b.beasiswaId ? 'opacity-50 scale-95' : 'opacity-100'}`}
              >
                <BeasiswaFavoritCard
                  beasiswa={b}
                  userId={user.userId || user.accountId}
                  onRemove={handleRemove}
                />
              </div>
            ))}
          </div>
        )}
      </MahasiswaLayout>
    </>
  );
}

export async function getServerSideProps(context) {
  const auth = withAuth(context, 'mahasiswa');
  if (auth.redirect) return auth;

  const { user } = auth.props;
  const supabaseServer = getServerSupabase();
  const userId = user.userId || user.accountId;

  let favorites = [];
  
  // Coba query dengan user_id & beasiswa_id (snake_case)
  let { data, error } = await supabaseServer
    .from('favorit')
    .select(`
      id,
      beasiswa (
        beasiswaId,
        judul,
        deskripsi,
        deadline,
        status,
        jalur,
        pendonor (
          pendonorId,
          statusOrganisasi
        ),
        beasiswa_wilayah (
          wilayah (
            wilayahId,
            nama,
            tipe,
            isAfirmasi,
            is3T,
            jenis_3t,
            provinsiId,
            provinsi (
              provinsiId,
              nama,
              isAfirmasi
            )
          )
        )
      )
    `)
    .eq('user_id', userId);

  // Jika gagal (kemungkinan karena kolom tidak ada), coba userId & beasiswaId (camelCase)
  if (error) {
    const { data: camelData, error: camelError } = await supabaseServer
      .from('favorit')
      .select(`
        favoritId,
        beasiswa (
          beasiswaId,
          judul,
          deskripsi,
          deadline,
          status,
          jalur,
          pendonor (
            pendonorId,
            statusOrganisasi
          ),
          beasiswa_wilayah (
            wilayah (
              wilayahId,
              nama,
              tipe,
              isAfirmasi,
              is3T,
              jenis_3t,
              provinsiId,
              provinsi (
                provinsiId,
                nama,
                isAfirmasi
              )
            )
          )
        )
      `)
      .eq('userId', userId);
      
    if (!camelError && camelData) {
      favorites = camelData;
    } else {
      console.error("Error fetching favorites (both camel and snake failed):", error || camelError);
    }
  } else if (data) {
    favorites = data;
  }

  // Normalisasi data beasiswa agar seragam
  const bookmarkedBeasiswas = favorites
    .map(f => {
      let b = f.beasiswa;
      if (Array.isArray(b)) b = b[0];
      if (!b) return null;

      // Normalisasi pendonor
      let pendonorObj = b.pendonor;
      if (Array.isArray(pendonorObj)) pendonorObj = pendonorObj[0];
      
      const namaOrganisasi = pendonorObj 
        ? (pendonorObj.statusOrganisasi || pendonorObj.nama_organisasi || '—')
        : '—';

      return {
        beasiswaId: b.beasiswaId || b.id,
        judul: b.judul,
        deskripsi: b.deskripsi,
        deadline: b.deadline,
        status: b.status,
        jalur: b.jalur,
        pendonor: {
          statusOrganisasi: namaOrganisasi,
        },
        beasiswa_wilayah: b.beasiswa_wilayah || [],
      };
    })
    .filter(Boolean);

  return {
    props: {
      user,
      initialBeasiswas: bookmarkedBeasiswas,
    },
  };
}
