import { defineConfig } from 'vitest/config';
import {documentMessages} from './src/i18n/html.ts';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react(),{name:'openclea-document-messages',transformIndexHtml:documentMessages}], server: { host: '127.0.0.1', port: 5173, strictPort: true }, test: { include: ['src/**/*.test.ts'] } });
