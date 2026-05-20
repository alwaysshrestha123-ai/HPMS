/**
 * Initialises the PostgreSQL database:
 *   1. Runs schema.sql
 *   2. Overwrites seed-user password hashes with a freshly-generated bcrypt hash
 *      for the password "Password123!" so every demo user can log in.
 *
 * Run with:  npm run init-db
 */
require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const SEED_PASSWORD = 'Password123!';

async function init() {
  try {
    console.log('Reading schema.sql ...');
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');

    console.log('Running schema (drop + create + seed) ...');
    await db.query(sql);

    console.log('Regenerating bcrypt hash for seed users ...');
    const hash = await bcrypt.hash(SEED_PASSWORD, parseInt(process.env.BCRYPT_ROUNDS, 10) || 10);
    await db.query('UPDATE users SET password_hash = $1', [hash]);

    console.log('\n✅  Database initialised successfully.');
    console.log('\nSeed accounts (password = Password123!):');
    console.log('   admin@hpms.local         (ADMIN)');
    console.log('   sarah.chen@hpms.local    (DOCTOR)');
    console.log('   raj.patel@hpms.local     (DOCTOR)');
    console.log('   emma.wilson@hpms.local   (NURSE)');
    console.log('   john.smith@hpms.local    (PATIENT)');
    console.log('   mary.johnson@hpms.local  (PATIENT)\n');
  } catch (err) {
    console.error('❌  DB init failed:', err.message);
    process.exitCode = 1;
  } finally {
    await db.pool.end();
  }
}

init();
