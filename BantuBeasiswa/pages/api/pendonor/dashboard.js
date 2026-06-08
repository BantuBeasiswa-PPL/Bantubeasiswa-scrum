import { getServerSupabase } from '../../../lib/supabaseServer';
import { verifyToken } from '../../../lib/auth';

/**
 * GET /api/pendonor/dashboard
 * Mengambil semua data dashboard untuk pendonor yang sedang login.
 * Setiap pendonor hanya melihat data miliknya sendiri.
 *
 * Response:
 * {
 *   stats: { totalDana, totalPendaftar, programAktif, kuotaTersisa },
 *   programs: [{ beasiswaId, judul, tahap, pendaftar, kuotaIsi, kuotaTotal }],
 *   pendingActions: [{ id, type, icon, text }]
 * }
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== 'pendonor') {
      return res.status(401).json({ message: 'Tidak terautentikasi.' });
    }

    const supabase = getServerSupabase();

    // ── Resolve pendonorId ──────────────────────────────────────────────────
    let pendonorId = decoded.userId ?? null;
    if (!pendonorId) {
      const { data: pendonor } = await supabase
        .from('pendonor')
        .select('pendonorId')
        .eq('accountId', decoded.accountId)
        .single();
      pendonorId = pendonor?.pendonorId ?? null;
    }
    if (!pendonorId) {
      return res.status(404).json({ message: 'Profil pendonor tidak ditemukan.' });
    }

    // ── 1. Ambil semua beasiswa pendonor ini ───────────────────────────────
    const { data: beasiswaList, error: beasiswaError } = await supabase
      .from('beasiswa')
      .select('beasiswaId, judul, status, kuota, nominal, deadline')
      .eq('pendonorId', pendonorId)
      .order('beasiswaId', { ascending: false });

    if (beasiswaError) {
      console.error('[dashboard] beasiswa error:', beasiswaError);
      return res.status(500).json({ message: 'Gagal mengambil data beasiswa.' });
    }

    const beasiswaIds = (beasiswaList ?? []).map(b => b.beasiswaId);

    // ── 2. Ambil semua pendaftaran untuk beasiswa ini ──────────────────────
    let pendaftaranList = [];
    if (beasiswaIds.length > 0) {
      const { data, error } = await supabase
        .from('pendaftaran')
        .select('pendaftaranId, beasiswaId, status')
        .in('beasiswaId', beasiswaIds);

      if (!error) pendaftaranList = data ?? [];
    }

    // ── 3. Ambil dana tersalurkan ──────────────────────────────────────────
    const { data: penyaluranList } = await supabase
      .from('penyaluran_dana')
      .select('jumlahDana')
      .eq('pendonorId', pendonorId)
      .eq('status', 'tersalurkan');

    const totalDana = (penyaluranList ?? []).reduce(
      (sum, p) => sum + (p.jumlahDana ?? 0), 0
    );

    // ── 4. Hitung stats ────────────────────────────────────────────────────
    const programAktif   = (beasiswaList ?? []).filter(b => b.status === 'aktif').length;
    const totalPendaftar = pendaftaranList.length;

    // Kuota tersisa = sum(kuota) - count(LULUS per beasiswa)
    const lulusPerBeasiswa = {};
    pendaftaranList.forEach(p => {
      if (p.status === 'LULUS') {
        lulusPerBeasiswa[p.beasiswaId] = (lulusPerBeasiswa[p.beasiswaId] ?? 0) + 1;
      }
    });
    const kuotaTersisa = (beasiswaList ?? []).reduce((sum, b) => {
      const kuota    = b.kuota ?? 0;
      const terpakai = lulusPerBeasiswa[b.beasiswaId] ?? 0;
      return sum + Math.max(0, kuota - terpakai);
    }, 0);

    // ── 5. Build program list (ambil 5 terbaru) ───────────────────────────
    // Group pendaftaran by beasiswaId
    const pendaftaranByBeasiswa = {};
    pendaftaranList.forEach(p => {
      if (!pendaftaranByBeasiswa[p.beasiswaId]) {
        pendaftaranByBeasiswa[p.beasiswaId] = [];
      }
      pendaftaranByBeasiswa[p.beasiswaId].push(p.status);
    });

    const programs = (beasiswaList ?? []).slice(0, 5).map(b => {
      const statuses = pendaftaranByBeasiswa[b.beasiswaId] ?? [];
      const pendaftar = statuses.length;
      const kuotaTotal = b.kuota ?? 0;
      const kuotaIsi   = lulusPerBeasiswa[b.beasiswaId] ?? 0;

      // Tentukan "tahap" dari status pendaftaran yang paling advanced
      let tahap = 'TERDAFTAR';
      if (statuses.includes('LULUS'))     tahap = 'LULUS';
      else if (statuses.includes('EXAM')) tahap = 'EXAM';
      else if (statuses.includes('REVIEW')) tahap = 'REVIEW';
      else if (statuses.includes('DITOLAK') || statuses.includes('TOLAK')) tahap = 'DITOLAK';
      else if (statuses.includes('DITERIMA')) tahap = 'DITERIMA';

      return {
        beasiswaId: b.beasiswaId,
        judul     : b.judul,
        tahap,
        pendaftar,
        kuotaIsi,
        kuotaTotal,
        deadline  : b.deadline,
        status    : b.status,
      };
    });

    // ── 6. Build pending actions ───────────────────────────────────────────
    const pendingActions = [];
    let actionId = 1;

    // Pendaftar menunggu review dokumen
    const reviewCount = pendaftaranList.filter(p => p.status === 'REVIEW').length;
    if (reviewCount > 0) {
      // Cari nama beasiswa dengan REVIEW terbanyak
      const reviewByProgram = {};
      pendaftaranList
        .filter(p => p.status === 'REVIEW')
        .forEach(p => {
          reviewByProgram[p.beasiswaId] = (reviewByProgram[p.beasiswaId] ?? 0) + 1;
        });
      const topBeasiswaId = Object.entries(reviewByProgram)
        .sort((a, b) => b[1] - a[1])[0]?.[0];
      const topJudul = beasiswaList.find(b => String(b.beasiswaId) === String(topBeasiswaId))?.judul ?? '';
      pendingActions.push({
        id  : actionId++,
        type: 'warning',
        icon: '📄',
        text: `${reviewCount} pendaftar menunggu verifikasi berkas${topJudul ? ` di ${topJudul}` : ''}.`,
      });
    }

    // Pendaftar dalam tahap EXAM
    const examCount = pendaftaranList.filter(p => p.status === 'EXAM').length;
    if (examCount > 0) {
      pendingActions.push({
        id  : actionId++,
        type: 'info',
        icon: '🔍',
        text: `${examCount} pendaftar sedang dalam tahap ujian/seleksi.`,
      });
    }

    // Pendaftar yang LULUS (perlu proses penyaluran)
    // Realtime check based on penyaluran_dana pending records
    const { data: pendingTransfers } = await supabase
      .from('penyaluran_dana')
      .select('penyaluranId')
      .eq('pendonorId', pendonorId)
      .eq('status', 'pending');

    const pendingCount = pendingTransfers?.length || 0;
    if (pendingCount > 0) {
      pendingActions.push({
        id  : actionId++,
        type: 'success',
        icon: '✅',
        text: `${pendingCount} pendaftar dinyatakan lulus — segera proses penyaluran dana.`,
      });
    }

    // Deadline beasiswa yang akan datang dalam 30 hari
    const now = new Date();
    const soon = new Date();
    soon.setDate(now.getDate() + 30);
    (beasiswaList ?? [])
      .filter(b => b.deadline && b.status === 'aktif')
      .forEach(b => {
        const dl = new Date(b.deadline);
        if (dl >= now && dl <= soon) {
          const diffDays = Math.ceil((dl - now) / (1000 * 60 * 60 * 24));
          pendingActions.push({
            id  : actionId++,
            type: 'warning',
            icon: '⏰',
            text: `Deadline "${b.judul}": ${dl.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} (${diffDays} hari lagi).`,
          });
        }
      });

    // Jika tidak ada actions sama sekali
    if (pendingActions.length === 0) {
      pendingActions.push({
        id  : actionId++,
        type: 'success',
        icon: '✅',
        text: 'Tidak ada tindakan yang tertunda saat ini. Semua program berjalan lancar!',
      });
    }

    return res.status(200).json({
      stats: { totalDana, totalPendaftar, programAktif, kuotaTersisa },
      programs,
      pendingActions,
    });
  } catch (err) {
    console.error('[api/pendonor/dashboard] Error:', err);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
}
