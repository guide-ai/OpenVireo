import { defineConfig } from 'vitest/config';
import {documentMessages} from './src/i18n/html.ts';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react(),{name:'openvireo-document-messages',transformIndexHtml:documentMessages}], server: { host: '127.0.0.1', port: 5173, strictPort: true, watch: { ignored: ['**/.claude/**', '**/test-results/**', '**/playwright-report/**'] } }, test: { include: ['src/**/*.test.ts'] } });
