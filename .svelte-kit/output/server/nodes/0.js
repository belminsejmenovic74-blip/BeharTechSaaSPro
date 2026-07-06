import * as server from '../entries/pages/_layout.server.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/+layout.server.ts";
export const imports = ["_app/immutable/nodes/0.D8sSgR8v.js","_app/immutable/chunks/scheduler.ClyjVq2j.js","_app/immutable/chunks/index.DgaDRGRF.js","_app/immutable/chunks/index.B3RVpgtF.js","_app/immutable/chunks/stores.DCOWSESJ.js"];
export const stylesheets = ["_app/immutable/assets/0.Co1m7r8l.css"];
export const fonts = [];
