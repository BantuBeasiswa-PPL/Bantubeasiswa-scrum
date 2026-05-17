/**
 * PBI-37: API Endpoint untuk READ Beasiswa
 * 
 * GET /api/pendonor/beasiswa
 * Query: ?status=draft (optional), ?limit=10 (optional)
 */

import { getBeasiswaByPendonor } from '../../../../lib/beasiswa';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  // Only accept GET
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // 1. Get JWT from cookies
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'Tidak ada session. Silakan login terlebih dahulu.' });
    }

    // 2. Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Session invalid atau sudah expired' });
    }

    // 3. Pastikan user adalah pendonor
    if (decoded.role !== 'pendonor') {
      return res.status(403).json({ message: 'Hanya pendonor yang bisa akses data beasiswa mereka' });
    }

    const pendonorId = decoded.userId;
    if (!pendonorId) {
      return res.status(400).json({ message: 'Pendonor ID tidak ditemukan di session' });
    }

    // 4. Parse query parameters
    const { status, limit } = req.query;
    const options = {};
    if (status) options.status = status;
    if (limit) options.limit = parseInt(limit, 10);

    // 5. Panggil helper function
    const result = await getBeasiswaByPendonor(pendonorId, options);

    // 6. Return response
    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }

    return res.status(200).json({
      message: 'Daftar program beasiswa berhasil diambil',
      count: result.data.length,
      data: result.data,
    });
  } catch (error) {
    console.error('[api/pendonor/beasiswa] Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}
