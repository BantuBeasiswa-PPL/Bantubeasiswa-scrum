export const VALID_JENIS = ['akta_pendirian', 'npwp', 'ktp_penanggung_jawab', 'surat_izin'];

export const JENIS_LABEL = {
  akta_pendirian       : 'Akta Pendirian Organisasi',
  npwp                 : 'NPWP Organisasi',
  ktp_penanggung_jawab : 'KTP Penanggung Jawab',
  surat_izin           : 'Surat Izin / NIB',
};

export function getBucket() {
  return process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'dokumen-pendaftaran';
}

export function metaStoragePath(pendonorId) {
  return `pendonor-verifikasi/${pendonorId}/_meta.json`;
}

export function buildStoragePath(pendonorId, jenis, ext) {
  return `pendonor-verifikasi/${pendonorId}/${jenis}.${ext}`;
}

export function buildDownloadApiUrl(pendonorId, jenis, role = 'pendonor') {
  const encodedJenis = encodeURIComponent(jenis);
  if (role === 'admin') {
    return `/api/admin/pendonor/dokumen-verifikasi/download?pendonorId=${pendonorId}&jenis=${encodedJenis}`;
  }
  return `/api/pendonor/dokumen-verifikasi/download?jenis=${encodedJenis}`;
}

export async function loadDokumenMeta(supabase, pendonorId) {
  const bucket = getBucket();
  const path = metaStoragePath(pendonorId);
  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('not found') || msg.includes('does not exist') || error.statusCode === 404) {
      return {};
    }
    throw error;
  }

  try {
    const text = await data.text();
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function saveDokumenMeta(supabase, pendonorId, meta) {
  const bucket = getBucket();
  const path = metaStoragePath(pendonorId);
  const body = Buffer.from(JSON.stringify(meta));

  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    contentType: 'application/json',
    upsert: true,
  });

  if (error) throw error;
}

export async function storageFileExists(supabase, storagePath) {
  if (!storagePath) return false;

  const bucket = getBucket();
  const slash = storagePath.lastIndexOf('/');
  if (slash < 0) return false;

  const folder = storagePath.slice(0, slash);
  const fileName = storagePath.slice(slash + 1);

  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    search: fileName,
    limit: 20,
  });

  if (error) return false;
  return data?.some((file) => file.name === fileName) ?? false;
}

export async function resolveStoragePath(supabase, pendonorId, jenis, meta = {}) {
  const row = meta[jenis];
  const candidates = [];

  if (row?.storagePath) candidates.push(row.storagePath);

  for (const ext of ['pdf', 'png', 'jpg', 'jpeg']) {
    candidates.push(buildStoragePath(pendonorId, jenis, ext));
  }

  const folder = `pendonor-verifikasi/${pendonorId}`;
  const { data: files } = await supabase.storage.from(getBucket()).list(folder, { limit: 100 });
  if (files?.length) {
    const legacyMatches = files
      .filter((file) => file.name.startsWith(`${jenis}_`) || file.name.startsWith(`${jenis}.`))
      .sort((a, b) => {
        const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
        const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
        return bTime - aTime;
      })
      .map((file) => `${folder}/${file.name}`);

    candidates.push(...legacyMatches);
  }

  const seen = new Set();
  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);
    if (await storageFileExists(supabase, candidate)) {
      return candidate;
    }
  }

  return null;
}

export async function downloadStorageFile(supabase, storagePath) {
  const bucket = getBucket();
  const { data, error } = await supabase.storage.from(bucket).download(storagePath);
  if (error) throw error;
  return data;
}

export async function buildDokumenResponse(supabase, meta, options = {}) {
  const { pendonorId = null, downloadRole = 'pendonor' } = options;
  const entries = Object.entries(meta).filter(([key]) => !key.startsWith('_'));

  const dokumen = await Promise.all(
    entries.map(async ([jenis, row]) => {
      const resolvedPath = pendonorId
        ? await resolveStoragePath(supabase, pendonorId, jenis, meta)
        : row.storagePath ?? null;

      const fileAvailable = resolvedPath
        ? await storageFileExists(supabase, resolvedPath)
        : false;

      const downloadUrl = fileAvailable && pendonorId
        ? buildDownloadApiUrl(pendonorId, jenis, downloadRole)
        : null;

      return {
        jenis,
        label: JENIS_LABEL[jenis] || jenis,
        fileName: row.fileName ?? null,
        statusDokumen: row.statusDokumen ?? 'MENUNGGU',
        rejectionReason: row.rejectionReason ?? null,
        updatedAt: row.updatedAt ?? null,
        storagePath: resolvedPath,
        fileAvailable,
        downloadUrl,
      };
    })
  );

  return dokumen.sort((a, b) => a.jenis.localeCompare(b.jenis));
}

export function countWajibUploaded(meta) {
  const wajib = ['akta_pendirian', 'npwp', 'ktp_penanggung_jawab'];
  return wajib.filter((j) => meta[j]?.storagePath).length;
}
