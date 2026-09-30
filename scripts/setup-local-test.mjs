import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const status = spawnSync('npx', ['--no-install', 'supabase', 'status', '-o', 'json'], { encoding: 'utf8' });
if (status.status !== 0) throw new Error('Start the isolated local stack first.');
const local = JSON.parse(status.stdout);
if (new URL(local.API_URL).port !== '56321') throw new Error('Unexpected stack; refusing configuration.');
writeFileSync('.env.local', `NEXT_PUBLIC_SUPABASE_URL=${local.API_URL}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${local.ANON_KEY}\nSUPABASE_SERVICE_ROLE_KEY=${local.SERVICE_ROLE_KEY}\nNEXT_PUBLIC_SITE_URL=http://127.0.0.1:4175\n`, { mode: 0o600 });
console.info('Configured ignored local test environment; no credentials printed.');
