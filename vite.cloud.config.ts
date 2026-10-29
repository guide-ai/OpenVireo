import {mergeConfig} from 'vite';
import base from './vite.config.ts';
// Front A local cloud flow (docs/BACKEND-LOCAL.md): the app plus a same-origin /api proxy to `wrangler dev` on loopback,
// the shape production would have (Workers serving the site and /api together). Own Vite cache: node_modules is shared
// between worktrees.
const workerPort=Number(process.env.OPENVIREO_WORKER_PORT);
if(!Number.isInteger(workerPort)||workerPort<1024||workerPort>65535)throw new Error('Set OPENVIREO_WORKER_PORT to the local wrangler dev port');
export default mergeConfig(base,{cacheDir:'.local/vite-cloud',server:{proxy:{'/api':{target:`http://127.0.0.1:${workerPort}`}}}});
