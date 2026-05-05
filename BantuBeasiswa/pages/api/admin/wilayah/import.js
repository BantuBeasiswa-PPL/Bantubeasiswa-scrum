import { supabase } from '../../../../lib/db';
import { verifyToken } from '../../../../lib/auth';

/**
 * Parse CSV line dengan proper handling untuk quoted fields
 * Contoh: `"Kab. A, B",kabupaten` → ['Kab. A, B', 'kabupaten']
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Push field terakhir
  if (current || result.length > 0) {
    result.push(current.trim());
  }

  return result;
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

/**
 * POST /api/admin/wilayah/import
 * Import wilayah 3T dari CSV.
 * Format CSV: provinsi,nama,tipe,mode,isAfirmasi,is3T,jenis_3t
 *
 * FIX: Provinsi yang belum ada di tabel `provinsi` akan di-insert otomatis
 *      sehingga tidak ada baris yang di-skip karena provinsi tidak ditemukan.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Verify admin
  const decoded = verifyToken(req);
  if (!decoded || decoded.role !== 'admin') {
    return res.status(403).json({ message: 'Hanya admin yang dapat import wilayah' });
  }

  const { csvData } = req.body;
  if (!csvData) {
    return res.status(400).json({ message: 'csvData wajib diisi' });
  }

  try {
    // ── 1. Split baris & validasi header ───────────────────────────────────
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) {
      return res.status(400).json({
        message: 'CSV harus memiliki header dan minimal 1 data row',
      });
    }

    // Pakai parseCSVLine agar aman untuk header yang di-quote
    const headers          = parseCSVLine(lines[0]);
    const expectedHeaders  = ['provinsi', 'nama', 'tipe', 'mode', 'isAfirmasi', 'is3T', 'jenis_3t'];

    if (JSON.stringify(headers) !== JSON.stringify(expectedHeaders)) {
      return res.status(400).json({
        message:   'Header CSV tidak sesuai',
        diharapkan: expectedHeaders.join(', '),
        ditemukan:  headers.join(', '),
      });
    }

    // ── 2. Fetch semua provinsi yang sudah ada ──────────────────────────────
    const { data: provinsiList, error: provinsiError } = await supabase
      .from('provinsi')
      .select('provinsiId, nama');

    if (provinsiError) throw new Error('Gagal fetch provinsi: ' + provinsiError.message);

    // Map nama provinsi → id  (mutable; diperbarui kalau ada provinsi baru)
    const provinsiMap = {};
    provinsiList.forEach((p) => {
      provinsiMap[p.nama] = p.provinsiId;
    });

    // ── 3. Parse setiap baris data ─────────────────────────────────────────
    const rows   = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // lewati baris kosong

      const values = parseCSVLine(line);

      if (values.length !== expectedHeaders.length) {
        errors.push(
          `Baris ${i + 1}: jumlah kolom tidak sesuai ` +
          `(ditemukan ${values.length}, diharapkan ${expectedHeaders.length})`
        );
        continue;
      }

      const [provinsiName, nama, tipe, mode, isAfirmasi, is3T, jenis_3t] = values;

      // ── Auto-insert provinsi yang belum ada ─────────────────────────────
      let provinsiId = provinsiMap[provinsiName];

      if (!provinsiId) {
        const { data: newProv, error: provErr } = await supabase
          .from('provinsi')
          .insert({ nama: provinsiName, isAfirmasi: false })
          .select('provinsiId, nama')
          .single();

        if (provErr) {
          errors.push(
            `Baris ${i + 1}: gagal membuat provinsi "${provinsiName}" – ${provErr.message}`
          );
          continue;
        }

        // Simpan ke map agar baris-baris berikutnya dengan provinsi sama
        // tidak melakukan insert duplikat
        provinsiMap[newProv.nama] = newProv.provinsiId;
        provinsiId = newProv.provinsiId;
      }

      // Validate tipe
      if (!['kabupaten', 'kota'].includes(tipe)) {
        errors.push(`Baris ${i + 1}: tipe harus 'kabupaten' atau 'kota', ditemukan '${tipe}'`);
        continue;
      }

      // Parse boolean
      const isAfirmasiVal = isAfirmasi.toUpperCase() === 'TRUE';
      const is3TVal       = is3T.toUpperCase() === 'TRUE';

      // Validate jenis_3t (wajib ada jika is3T = true)
      if (is3TVal && !['Terdepan', 'Terluar', 'Tertinggal'].includes(jenis_3t)) {
        errors.push(
          `Baris ${i + 1}: jenis_3t harus 'Terdepan', 'Terluar', atau 'Tertinggal', ` +
          `ditemukan '${jenis_3t}'`
        );
        continue;
      }

      rows.push({
        provinsiId,
        nama,
        tipe,
        mode,
        isAfirmasi: isAfirmasiVal,
        is3T:       is3TVal,
        jenis_3t:   is3TVal ? jenis_3t : null,
      });
    }

    if (rows.length === 0) {
      return res.status(400).json({
        message: 'Tidak ada data valid untuk diimport',
        errors,
      });
    }

    // ── 4. Batch insert ke tabel wilayah ───────────────────────────────────
    const { data, error: insertError } = await supabase
      .from('wilayah')
      .insert(rows)
      .select('wilayahId, nama');

    if (insertError) throw new Error('Gagal insert data: ' + insertError.message);

    return res.status(200).json({
      message:  'Import berhasil',
      imported: data?.length || 0,
      skipped:  errors.length,
      errors:   errors.length > 0 ? errors : undefined,
      data,
    });

  } catch (error) {
    console.error('Import error:', error);
    return res.status(500).json({
      message: 'Gagal import wilayah',
      error:   error.message,
    });
  }
}
