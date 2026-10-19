import {readFileSync,writeFileSync} from 'node:fs';
const catalog=JSON.parse(readFileSync(new URL('../src/i18n/en.json',import.meta.url),'utf8'));
const names=s=>[...new Set([...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]))].sort();
const body=Object.entries(catalog).map(([key,value])=>`  ${JSON.stringify(key)}: ${names(value).length?names(value).map(JSON.stringify).join(' | '):'never'};`).join('\n');
writeFileSync(new URL('../src/i18n/params.generated.ts',import.meta.url),`// Generated from en.json by scripts/generate-message-types.mjs; checked by tests.\nexport interface MessageParameters {\n${body}\n}\n`);
