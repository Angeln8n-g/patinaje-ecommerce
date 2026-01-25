const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function verifyTables() {
  try {
    const envPath = path.resolve(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) env[key.trim()] = value.trim();
    });

    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    console.log('Checking tables...');
    
    // Check carts
    const { error: cartsError } = await supabase.from('carts').select('count', { count: 'exact', head: true });
    if (cartsError) console.error('❌ Carts table error:', cartsError.message);
    else console.log('✅ Carts table exists');

    // Check cart_items
    const { error: itemsError } = await supabase.from('cart_items').select('count', { count: 'exact', head: true });
    if (itemsError) console.error('❌ Cart_items table error:', itemsError.message);
    else console.log('✅ Cart_items table exists');

    // Check profiles
    const { error: profilesError } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    if (profilesError) console.error('❌ Profiles table error:', profilesError.message);
    else console.log('✅ Profiles table exists');

  } catch (err) {
    console.error('Script error:', err);
  }
}

verifyTables();
