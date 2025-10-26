// test-migrate-services-mongo.js
// Migrate local SERVICES data into MongoDB 'services' collection (upsert by id)

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { SERVICES } from './data/services.js';

function loadEnvFiles() {
  const cwd = process.cwd();
  const envPath = path.join(cwd, '.env');
  const envLocalPath = path.join(cwd, '.env.local');
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
  if (fs.existsSync(envLocalPath)) dotenv.config({ path: envLocalPath, override: true });
}

loadEnvFiles();

const mongoUri = process.env.MONGODB_URI || process.env.MONGODB_URL;
const dbName = process.env.MONGODB_DB || process.env.DB_NAME || 'washlabs';

if (!mongoUri) {
  console.error('Missing MONGODB_URI. Add it to .env.local');
  process.exit(1);
}

async function migrateMongo() {
  console.log('Connecting to MongoDB...');
  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const col = db.collection('services');

    // Ensure unique index on id
    await col.createIndex({ id: 1 }, { unique: true });

    console.log('Upserting', SERVICES.length, 'services...');
    let ok = 0;
    for (const svc of SERVICES) {
      const res = await col.updateOne(
        { id: svc.id },
        { $set: svc },
        { upsert: true }
      );
      if (res.upsertedCount === 1 || res.modifiedCount === 1 || res.matchedCount === 1) {
        ok += 1;
        console.log(`✔ Upserted: ${svc.id}`);
      } else {
        console.warn(`? No change for: ${svc.id}`);
      }
    }
    console.log(`Mongo migration complete. Success: ${ok}/${SERVICES.length}`);
  } catch (e) {
    console.error('Mongo migration failed:', e);
    process.exit(1);
  } finally {
    await client.close();
  }
}

migrateMongo();
