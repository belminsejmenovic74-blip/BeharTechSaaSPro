import { getSupabase } from './src/lib/supabase/client';
import { syncPublicTrackingRepairsToCloud } from './src/lib/public-tracking-sync';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
  const supabase = getSupabase();
  if (!supabase) return;
  const { data } = await supabase.from('workshop_snapshots').select('state').limit(1).single();
  
  if (!data) {
    console.log("No snapshot found");
    return;
  }
  
  const state = data.state;
  const activeRepairs = (state.repairs || []).filter((r: any) => r?.publicAccess?.active !== false);
  console.log("Found active repairs:", activeRepairs.length);
  
  const success = await syncPublicTrackingRepairsToCloud(activeRepairs, state);
  console.log("Sync success:", success);
}

test();
