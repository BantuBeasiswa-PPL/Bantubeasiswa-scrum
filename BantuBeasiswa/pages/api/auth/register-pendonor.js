import { supabase } from '../../../lib/db';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { namaOrganisasi, email, kontak, alamat, password } = req.body;

  if (!namaOrganisasi || !email || !password || !kontak || !alamat) {
    return res.status(400).json({ message: 'Semua field harus diisi (termasuk nama organisasi, email, kontak, alamat, dan password).' });
  }

  const { data: existingAccount, error: checkError } = await supabase
    .from('account')
    .select('accountId')
    .eq('email', email)
    .single();

  if (existingAccount) {
    return res.status(400).json({ message: 'Email sudah terdaftar. Silakan login.' });
  }

  if (checkError && checkError.code !== 'PGRST116') {
    return res.status(500).json({ message: 'Terjadi kesalahan sistem saat mengecek email.', error: checkError });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const { data: newAccount, error: accError } = await supabase
      .from('account')
      .insert([
        {
          email: email,
          kataKunci: hashedPassword,
          role: 'pendonor',
        }
      ])
      .select('accountId')
      .single();

    if (accError || !newAccount) {
      console.error('Account Insert Error:', accError);
      return res.status(500).json({ message: 'Gagal membuat akun pendonor. Silakan coba lagi.' });
    }

    const { error: pendonorError } = await supabase
      .from('pendonor')
      .insert([
        {
          accountId: newAccount.accountId,
          statusOrganisasi: namaOrganisasi,
          kontak: kontak,
          alamat: alamat,
        }
      ]);

    if (pendonorError) {
      console.error('Pendonor Insert Error:', pendonorError);
      await supabase.from('account').delete().eq('accountId', newAccount.accountId);
      return res.status(500).json({ message: 'Gagal membuat profil pendonor.' });
    }

    return res.status(201).json({ message: 'Pendaftaran pendonor berhasil. Silakan login.' });
  } catch (error) {
    console.error('Register Pendonor API Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan internal server.' });
  }
}
