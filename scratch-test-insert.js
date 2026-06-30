const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Using ANON key like the client does
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  console.log("Testing insert with ANON key...");
  const { data, error } = await supabase.from('public_tracking_repairs').upsert([
    {
      tracking_id: 'BT-9999-00000',
      workshop_id: 'test_ws',
      shop_slug: 'behar-tech',
      repair_number: '123',
      status: 'received',
      device: 'Test Device',
      public_data: { test: true },
      updated_at: new Date().toISOString()
    }
  ], { onConflict: 'tracking_id' });
  
  if (error) {
    console.error("Insert Error:", error);
  } else {
    console.log("Insert Success!", data);
  }
}

test();
