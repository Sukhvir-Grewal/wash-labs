// test-migrate-services.js
// Script to migrate local services data to Supabase 'services' table

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { SERVICES } from './data/services.js';

// Load environment variables from .env and .env.local (override)
function loadEnvFiles() {
  const cwd = process.cwd();
  const envPath = path.join(cwd, '.env');
  const envLocalPath = path.join(cwd, '.env.local');
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
  if (fs.existsSync(envLocalPath)) dotenv.config({ path: envLocalPath, override: true });
}

loadEnvFiles();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('Missing Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) in your .env/.env.local.');
  process.exit(1);
}
if (!supabaseKey) {
  console.error('Missing Supabase key. Prefer SUPABASE_SERVICE_ROLE_KEY in .env.local for write access.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateServices() {
  console.log('Using Supabase URL:', supabaseUrl);
  console.log('Starting migration of', SERVICES.length, 'services...');
  let ok = 0;
  for (const service of SERVICES) {
    // Upsert by primary/unique key 'id'
    const { error } = await supabase
      .from('services')
      .upsert(service, { onConflict: 'id' });
    if (error) {
      console.error(`Error migrating service ${service.id}:`, error.message);
    } else {
      ok += 1;
      console.log(`✔ Inserted/Updated: ${service.id}`);
    }
  }
  console.log(`Migration complete. Success: ${ok}/${SERVICES.length}`);
}

migrateServices().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
