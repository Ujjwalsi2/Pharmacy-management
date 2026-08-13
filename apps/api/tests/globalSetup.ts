import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prismaDir = path.join(__dirname, '..', 'prisma');
const mainSchema = path.join(prismaDir, 'schema.prisma');
const postgresSchema = path.join(prismaDir, 'schema.postgresql.prisma');
const sqliteSchema = path.join(prismaDir, 'schema.sqlite.prisma');

export function setup() {
  // Save PostgreSQL schema and swap in SQLite for testing.
  if (!fs.existsSync(sqliteSchema)) {
    throw new Error('Missing prisma/schema.sqlite.prisma — cannot run tests');
  }
  if (fs.existsSync(postgresSchema)) {
    // Already swapped — restore and redo.
    fs.copyFileSync(postgresSchema, mainSchema);
  }
  fs.copyFileSync(mainSchema, postgresSchema);
  fs.copyFileSync(sqliteSchema, mainSchema);
  execSync('npx prisma generate', {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env },
    stdio: 'pipe'
  });
}

export function teardown() {
  try {
    if (fs.existsSync(postgresSchema)) {
      fs.copyFileSync(postgresSchema, mainSchema);
      fs.rmSync(postgresSchema);
    }
    execSync('npx prisma generate', {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env },
      stdio: 'pipe'
    });
  } catch {
    // Best effort.
  }
}
