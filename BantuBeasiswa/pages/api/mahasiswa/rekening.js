import { verifyToken } from '@/lib/auth';
import { decryptRekeningNumber, encryptRekeningNumber } from '@/lib/rekeningCrypto';
import { getServerSupabase } from '@/lib/supabaseServer';

const REKENING_SCHEMAS = [
  {
    name: 'snake',
    id: 'id',
    user: 'user_id',
    bank: 'nama_bank',
    owner: 'nama_pemilik',
    number: 'nomor_rekening',
    photo: 'foto_buku_url',
  },
  {
    name: 'legacy',
    id: 'rekeningId',
    user: 'userId',
    bank: 'namaBank',
    owner: 'namaPemilik',
    number: 'nomorRekening',
    photo: 'fotoBukuUrl',
    legacyName: 'namRekening',
  },
];

function isSchemaError(error) {
  if (!error) return false;
  const message = `${error.message || ''} ${error.details || ''}`.toLowerCase();
  return (
    error.code === 'PGRST204' ||
    error.code === '42703' ||
    error.code === '42P01' ||
    message.includes('schema cache') ||
    message.includes('column') ||
    message.includes('does not exist')
  );
}

function isSameId(a, b) {
  return String(a) === String(b);
}

async function resolveUserId(supabase, decoded) {
  if (decoded.userId) return decoded.userId;

  const candidates = [
    { accountColumn: 'accountId', idColumn: 'userId' },
    { accountColumn: 'account_id', idColumn: 'id' },
    { accountColumn: 'account_id', idColumn: 'user_id' },
  ];

  for (const candidate of candidates) {
    const { data, error } = await supabase
      .from('user')
      .select(candidate.idColumn)
      .eq(candidate.accountColumn, decoded.accountId)
      .maybeSingle();

    if (!error && data?.[candidate.idColumn]) {
      return data[candidate.idColumn];
    }
    if (error && !isSchemaError(error)) {
      throw error;
    }
  }

  return null;
}

function buildPayload(schema, { userId, namaBank, namaPemilik, nomorTerenkripsi, fotoBukuUrl }) {
  const payload = {
    [schema.user]: userId,
    [schema.bank]: namaBank?.trim() || null,
    [schema.owner]: namaPemilik.trim(),
    [schema.number]: nomorTerenkripsi,
    status: 'pending',
  };

  if (fotoBukuUrl) {
    payload[schema.photo] = fotoBukuUrl;
  }

  if (schema.legacyName) {
    payload[schema.legacyName] = namaBank
      ? `${namaBank.trim()} - ${namaPemilik.trim()}`
      : namaPemilik.trim();
  }

  return payload;
}

function buildMinimalLegacyPayload({ namaBank, namaPemilik, nomorTerenkripsi }) {
  return {
    namRekening: namaBank
      ? `${namaBank.trim()} - ${namaPemilik.trim()}`
      : namaPemilik.trim(),
    nomorRekening: nomorTerenkripsi,
    status: 'pending',
  };
}

async function getExistingRekening(supabase, schema, userId) {
  const { data, error } = await supabase
    .from('rekening')
    .select(`${schema.id}, ${schema.user}, ${schema.number}`)
    .eq(schema.user, userId)
    .order(schema.id, { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isSchemaError(error)) return { schemaMismatch: true };
    throw error;
  }

  return { data };
}

async function getDuplicateRekening(supabase, schema, nomorBersih) {
  const { data, error } = await supabase
    .from('rekening')
    .select(`${schema.id}, ${schema.user}, ${schema.number}`)
    .limit(10000);

  if (error) {
    if (isSchemaError(error)) return { schemaMismatch: true };
    throw error;
  }

  const duplicate = (data ?? []).find((rekening) => (
    decryptRekeningNumber(rekening[schema.number]) === nomorBersih
  ));

  return { data: duplicate ?? null };
}

async function saveWithSchema(supabase, schema, existing, payload, legacyFallbackData) {
  if (existing?.[schema.id]) {
    const { data, error } = await supabase
      .from('rekening')
      .update(payload)
      .eq(schema.id, existing[schema.id])
      .select('*')
      .single();

    if (!error || !schema.legacyName || !isSchemaError(error)) {
      return { data, error };
    }

    return supabase
      .from('rekening')
      .update(buildMinimalLegacyPayload(legacyFallbackData))
      .eq(schema.id, existing[schema.id])
      .select('*')
      .single();
  }

  const { data, error } = await supabase
    .from('rekening')
    .insert(payload)
    .select('*')
    .single();

  if (!error || !schema.legacyName || !isSchemaError(error)) {
    return { data, error };
  }

  return supabase
    .from('rekening')
    .insert({
      ...buildMinimalLegacyPayload(legacyFallbackData),
      [schema.user]: payload[schema.user],
    })
    .select('*')
    .single();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ message: 'Tidak terautentikasi.' });
  if (decoded.role !== 'mahasiswa') {
    return res.status(403).json({ message: 'Hanya mahasiswa yang dapat mengakses endpoint ini.' });
  }

  const { namaBank, namaPemilik, nomorRekening, fotoBukuUrl, confirmUpdate } = req.body || {};

  if (!namaBank || !namaBank.trim()) {
    return res.status(400).json({ message: 'Bank wajib dipilih.' });
  }
  if (!namaPemilik || namaPemilik.trim().length < 3) {
    return res.status(400).json({ message: 'Nama pemilik rekening minimal 3 karakter.' });
  }
  if (!nomorRekening || !/^\d{10,16}$/.test(nomorRekening.trim())) {
    return res.status(400).json({ message: 'Nomor rekening harus 10-16 digit angka.' });
  }

  const supabase = getServerSupabase();
  const nomorBersih = nomorRekening.trim();
  let nomorTerenkripsi;

  try {
    nomorTerenkripsi = encryptRekeningNumber(nomorBersih);
  } catch (error) {
    console.error('[api/mahasiswa/rekening] encryption error:', error);
    return res.status(500).json({
      message: 'Konfigurasi enkripsi rekening belum siap. Set REKENING_ENCRYPTION_KEY di environment server.',
    });
  }

  let userId;
  try {
    userId = await resolveUserId(supabase, decoded);
  } catch (error) {
    console.error('[api/mahasiswa/rekening] resolve user error:', error);
    return res.status(500).json({ message: 'Gagal membaca profil mahasiswa.' });
  }

  if (!userId) return res.status(404).json({ message: 'Profil mahasiswa tidak ditemukan.' });

  let lastSchemaError = null;

  for (const schema of REKENING_SCHEMAS) {
    try {
      const existingResult = await getExistingRekening(supabase, schema, userId);
      if (existingResult.schemaMismatch) continue;

      const existing = existingResult.data;
      if (existing?.[schema.id] && !confirmUpdate) {
        return res.status(409).json({
          message: 'Data rekening sudah ada. Konfirmasi jika ingin memperbarui data rekening tersebut.',
          requiresConfirmation: true,
        });
      }

      const duplicateResult = await getDuplicateRekening(supabase, schema, nomorBersih);
      if (duplicateResult.schemaMismatch) continue;

      const duplicate = duplicateResult.data;
      if (
        duplicate?.[schema.id] &&
        !isSameId(duplicate[schema.user], userId) &&
        !isSameId(duplicate[schema.id], existing?.[schema.id])
      ) {
        return res.status(400).json({
          message: 'Nomor rekening sudah terdaftar oleh pengguna lain. Harap gunakan nomor rekening yang berbeda.',
        });
      }

      const payloadData = {
        userId,
        namaBank,
        namaPemilik,
        nomorBersih,
        nomorTerenkripsi,
        fotoBukuUrl,
      };
      const payload = buildPayload(schema, payloadData);
      const result = await saveWithSchema(supabase, schema, existing, payload, payloadData);

      if (result.error?.code === '23505') {
        return res.status(400).json({
          message: 'Nomor rekening sudah terdaftar. Harap gunakan nomor rekening yang berbeda.',
        });
      }

      if (result.error) {
        if (isSchemaError(result.error)) {
          lastSchemaError = result.error;
          continue;
        }
        console.error('[api/mahasiswa/rekening] save error:', result.error);
        return res.status(500).json({ message: 'Gagal menyimpan data rekening. Silakan coba lagi.' });
      }

      return res.status(existing?.[schema.id] ? 200 : 201).json({
        message: existing?.[schema.id]
          ? 'Data rekening berhasil diperbarui.'
          : 'Data rekening berhasil disimpan.',
        rekening: result.data,
        schema: schema.name,
      });
    } catch (error) {
      if (isSchemaError(error)) {
        lastSchemaError = error;
        continue;
      }
      console.error('[api/mahasiswa/rekening] error:', error);
      return res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  }

  console.error('[api/mahasiswa/rekening] no compatible schema:', lastSchemaError);
  return res.status(500).json({
    message: 'Struktur tabel rekening belum cocok dengan aplikasi. Periksa kolom rekening di Supabase.',
  });
}
