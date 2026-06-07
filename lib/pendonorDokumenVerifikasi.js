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

export async function getSignedUrl(supabase, storagePath, expiresIn = 3600) {
  if (!storagePath) return null;
  const bucket = getBucket();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, expiresIn);
  if (error) {
    console.error('[pendonorDokumenVerifikasi] signed URL:', error);
    return null;
  }
  return data?.signedUrl ?? null;
}

export async function buildDokumenResponse(supabase, meta, { includeSignedUrl = true } = {}) {
  const entries = Object.entries(meta).filter(([key]) => !key.startsWith('_'));

  const dokumen = await Promise.all(
    entries.map(async ([jenis, row]) => {
      const downloadUrl = includeSignedUrl
        ? await getSignedUrl(supabase, row.storagePath)
        : null;

      return {
        jenis,
        label: JENIS_LABEL[jenis] || jenis,
        fileName: row.fileName ?? null,
        statusDokumen: row.statusDokumen ?? 'MENUNGGU',
        rejectionReason: row.rejectionReason ?? null,
        updatedAt: row.updatedAt ?? null,
        storagePath: row.storagePath ?? null,
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
