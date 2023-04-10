import { Pool } from 'pg';

export const pool = new Pool();

pool.on('error', err => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});
