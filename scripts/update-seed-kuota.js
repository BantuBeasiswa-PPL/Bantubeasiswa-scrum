const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials in env!');
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  console.log('Updating seeded beasiswa rows to have kuota = 50...');
  
  const { data, error } = await supabase
    .from('beasiswa')
    .update({ kuota: 50 })
    .in('beasiswaId', [1, 2, 3, 4])
    .select('beasiswaId, judul, kuota');

  if (error) {
    console.error('Failed to update beasiswa kuota:', error);
    process.exit(1);
  }

  console.log('Successfully updated rows:', data);
}

run();
