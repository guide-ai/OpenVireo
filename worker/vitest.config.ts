import { defineConfig } from 'vitest/config';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';

// Runs inside workerd through Miniflare: D1 and R2 are in-memory local emulation; remote bindings are off.
export default defineConfig({
  plugins: [cloudflareTest(async () => ({
    remoteBindings: false,
    wrangler: { configPath: './wrangler.jsonc' },
    miniflare: {
      bindings: {
        TEST_MIGRATIONS: await readD1Migrations('./migrations'),
        APP_ORIGIN: 'http://127.0.0.1:5175',
        EMAIL_MODE: 'dev-sink',
        MAX_INVESTIGATIONS: '3',
        MAX_TOTAL_BYTES: String(40 * 1024 * 1024),
      },
    },
  }))],
  test: { include: ['test/**/*.test.ts'], setupFiles: ['./test/setup.ts'] },
});
