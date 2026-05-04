import { supabase } from '../../../lib/db';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { nama, email, password } = req.body;

  if (!nama || !email || !password) {
    return res.status(400).json({ message: 'Semua field (nama, email, password) harus diisi' });
  }

  // 1. Cek apakah email sudah terdaftar di tabel account
  const { data: existingAccount, error: checkError } = await supabase
    .from('account')
    .select('accountId')
    .eq('email', email)
    .single();

  if (existingAccount) {
    return res.status(400).json({ message: 'Email sudah terdaftar. Silakan login.' });
  }

  // Mengabaikan error check jika errornya karena data tidak ditemukan (PGRST116)
  if (checkError && checkError.code !== 'PGRST116') {
     return res.status(500).json({ message: 'Terjadi kesalahan sistem saat mengecek email.', error: checkError });
  }

  try {
    // 2. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Masukkan data ke tabel account
    const { data: newAccount, error: accError } = await supabase
      .from('account')
      .insert([
        { 
          email: email, 
          kataKunci: hashedPassword, 
          role: 'mahasiswa' 
        }
      ])
      .select('accountId')
      .single();

    if (accError || !newAccount) {
      console.error('Account Insert Error:', accError);
      return res.status(500).json({ message: 'Gagal membuat akun. Silakan coba lagi.' });
    }

    // 4. Masukkan data ke tabel "user" (profil mahasiswa)
    const { error: userError } = await supabase
      .from('user')
      .insert([
        {
          accountId: newAccount.accountId,
          email: email,
          nama: nama,
          kataSandi: hashedPassword,
          ukuranFont: 16,
          modeKontras: 0
        }
      ]);

    if (userError) {
      console.error('User Insert Error:', userError);
      // Fallback: hapus account jika insert user gagal agar tidak ada data yatim
      await supabase.from('account').delete().eq('accountId', newAccount.accountId);
      return res.status(500).json({ message: 'Gagal membuat profil mahasiswa.' });
    }

    return res.status(201).json({ message: 'Pendaftaran berhasil. Silakan login.' });

  } catch (error) {
    console.error('Registration API Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan internal server.' });
  }
}
