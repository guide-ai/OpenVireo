import { defineConfig } from 'vitest/config';
import {documentMessages} from './src/i18n/html.ts';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {openVireoTestHarnesses} from './tests/harness/vite-plugin.ts';
import {openVireoSeoPages} from './src/seo/vitePlugin.ts';
// @ts-expect-error A plain JS script (Front LAZY-OBS), as scripts/i18n-split.mjs.
import {openVireoAppEntry} from './scripts/app-entry-plugin.mjs';
// Front ES-SPLIT (docs/I18N.md): each language's text as a core module and one module per route area (virtual modules).
// @ts-expect-error The planner is a plain JS script (as scripts/audit-ui-messages.mjs), shared with check-i18n-dist.mjs.
import {openVireoI18nSplit} from './scripts/i18n-split.mjs';
// Ignore only this checkout's own .claude folder (agent worktrees live there); a worktree's own path also contains /.claude/.
const root=fileURLToPath(new URL('.',import.meta.url));
export default defineConfig({ plugins: [react(),{name:'openvireo-document-messages',transformIndexHtml:documentMessages},openVireoTestHarnesses(),openVireoSeoPages(),openVireoI18nSplit(),openVireoAppEntry()], server: { host: '127.0.0.1', port: 5173, strictPort: true, watch: { ignored: [`${root}.claude/**`, `${root}test-results/**`, `${root}playwright-report/**`] } }, test: { include: ['src/**/*.test.ts'], setupFiles: ['src/i18n/useEnglish.ts'] } });
