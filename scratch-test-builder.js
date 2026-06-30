const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
// We need to run TS code, so we can use ts-node
