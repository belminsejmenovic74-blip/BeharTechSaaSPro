const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase.from('public_tracking_repairs').select('*');
  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log("Rows in public_tracking_repairs:", data.length);
    if (data.length > 0) {
      console.log("First row tracking ID:", data[0].tracking_id);
    }
  }
}

check();
