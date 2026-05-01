import { supabase } from '../../lib/db';
export default async function handler(req, res) {
  const [beasiswa, pendonor, wilayah, beasiswa_wilayah] = await Promise.all([
    supabase.from('beasiswa').select('*').limit(1),
    supabase.from('pendonor').select('*').limit(1),
    supabase.from('wilayah').select('*').limit(1),
    supabase.from('beasiswa_wilayah').select('*').limit(1)
  ]);
  res.status(200).json({ 
    beasiswa: beasiswa.data?.[0], 
    pendonor: pendonor.data?.[0], 
    wilayah: wilayah.data?.[0], 
    beasiswa_wilayah: beasiswa_wilayah.data?.[0]
  });
}
