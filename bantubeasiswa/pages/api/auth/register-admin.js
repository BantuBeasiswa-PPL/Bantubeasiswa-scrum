import { supabase } from '../../../lib/db';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { nama, email, password, adminSecretKey } = req.body;

  // 1. Validasi input
  if (!nama || !email || !password || !adminSecretKey) {
    return res.status(400).json({ message: 'Semua field (nama, email, password, kunci admin) harus diisi' });
  }

  // 2. Verifikasi secret key
  const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY;
  if (!ADMIN_SECRET_KEY || adminSecretKey !== ADMIN_SECRET_KEY) {
    return res.status(403).json({ message: 'Kunci admin tidak valid' });
  }

  // 3. Cek apakah email sudah terdaftar
  const { data: existingAccount, error: checkError } = await supabase
    .from('account')
    .select('id')
    .eq('email', email)
    .single();

  if (existingAccount) {
    return res.status(400).json({ message: 'Email sudah terdaftar. Silakan login.' });
  }

  if (checkError && checkError.code !== 'PGRST116') {
    return res.status(500).json({ message: 'Terjadi kesalahan sistem saat mengecek email.', error: checkError });
  }

  try {
    // 4. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Masukkan data ke tabel account dengan role admin
    const { data: newAccount, error: accError } = await supabase
      .from('account')
      .insert([
        { 
          email: email, 
          kataKunci: hashedPassword, 
          role: 'admin' 
        }
      ])
      .select('accountId')
      .single();

    if (accError || !newAccount) {
      console.error('Account Insert Error:', accError);
      return res.status(500).json({ message: 'Gagal membuat akun admin. Silakan coba lagi.' });
    }

    // 6. Masukkan data ke tabel admin
    const { error: adminError } = await supabase
      .from('admin')
      .insert([
        {
          accountId: newAccount.accountId,
          email: email,
          nama: nama
        }
      ]);

    if (adminError) {
      console.error('Admin Insert Error:', adminError);
      // Rollback: hapus account jika insert admin gagal
      await supabase.from('account').delete().eq('accountId', newAccount.accountId);
      return res.status(500).json({ message: 'Gagal membuat profil admin.' });
    }

    return res.status(201).json({ message: 'Pendaftaran admin berhasil. Silakan login.' });

  } catch (error) {
    console.error('Admin Registration API Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan internal server.' });
  }
}
