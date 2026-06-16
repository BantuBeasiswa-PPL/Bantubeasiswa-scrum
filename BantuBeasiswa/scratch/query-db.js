const { createClient } = require('c:/Users/Nadhif/OneDrive/Dokumen/Bantubeasiswa-scrum/bantubeasiswa/node_modules/@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('c:/Users/Nadhif/OneDrive/Dokumen/Bantubeasiswa-scrum/bantubeasiswa/.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    env[key] = val;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('favorit').select('*').limit(1);
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Favorit keys:', Object.keys(data[0] || {}));
    console.log('Favorit sample:', data[0]);
  }
}

run();
