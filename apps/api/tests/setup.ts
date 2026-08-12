import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, afterAll } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbPath = path.join(__dirname, 'test.db');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = `file:${testDbPath}`;
process.env.JWT_ACCESS_SECRET = 'test-access-secret-test-access-secret-32';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-test-refresh-secret';
process.env.ACCESS_TOKEN_TTL = '15m';
process.env.REFRESH_TOKEN_TTL = '7d';
process.env.PORT = '4001';

beforeAll(() => {
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    const f = testDbPath + suffix;
    if (fs.existsSync(f)) fs.rmSync(f);
  }
  // globalSetup swapped schema.prisma to SQLite, so db push will
  // create SQLite tables. Prisma Client was regenerated against the
  // SQLite schema so the file: URL is accepted.
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env },
    stdio: 'pipe'
  });
}, 60000);

afterAll(() => {
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    const f = testDbPath + suffix;
    if (fs.existsSync(f)) fs.rmSync(f);
  }
});
