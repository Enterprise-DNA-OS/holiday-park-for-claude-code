#!/usr/bin/env node
// Loads the demo park (supabase/seed.sql). Fictional records only. Safe to run twice. Never run it against your real database.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getDb, REPO_ROOT } from './lib/db.mjs';

export async function seed(db) {
  await db.exec(fs.readFileSync(path.join(REPO_ROOT, 'supabase', 'seed.sql'), 'utf8'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const db = await getDb();
  try {
    await seed(db);
    console.log('Demo park loaded: Riverbend Holiday Park, 23 sites, cabins and units beside the Motueka River, four long-stay agreements and six months of past stays. Fictional records only.');
  } finally {
    await db.close();
  }
}
