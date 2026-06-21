const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envRaw = fs.readFileSync('.env.local', 'utf8');
envRaw.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Seeding profile data for userId: 1...');
  const { data, error } = await supabase
    .from('user')
    .update({
      tanggalLahir: '2000-01-01',
      provinsiKtpId: 1,
      kabupatenKtpId: 1,
      alamatKtp: 'Jl. Testing',
      noHandphone: '08123456789'
    })
    .eq('userId', 1); // Or whatever column

  if (error) {
    console.error('Error updating:', error);
  } else {
    console.log('Update success!', data);
  }
}

run();
