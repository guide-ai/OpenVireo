import { defineConfig } from 'vitest/config';
import {documentMessages} from './src/i18n/html.ts';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {openVireoTestHarnesses} from './tests/harness/vite-plugin.ts';
// Ignore only this checkout's own .claude folder (agent worktrees live there); a worktree's own path also contains /.claude/.
const root=fileURLToPath(new URL('.',import.meta.url));
export default defineConfig({ plugins: [react(),{name:'openvireo-document-messages',transformIndexHtml:documentMessages},openVireoTestHarnesses()], server: { host: '127.0.0.1', port: 5173, strictPort: true, watch: { ignored: [`${root}.claude/**`, `${root}test-results/**`, `${root}playwright-report/**`] } }, test: { include: ['src/**/*.test.ts'] } });
