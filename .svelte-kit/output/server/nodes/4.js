import * as server from '../entries/pages/admin/_layout.server.ts.js';

export const index = 4;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/admin/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/admin/+layout.server.ts";
export const imports = ["_app/immutable/nodes/4.CBrpulQ3.js","_app/immutable/chunks/scheduler.ClyjVq2j.js","_app/immutable/chunks/index.DgaDRGRF.js","_app/immutable/chunks/spread.mDU32Hd6.js","_app/immutable/chunks/Toaster.H9ABdWdG.js","_app/immutable/chunks/Toaster.svelte_svelte_type_style_lang.DE74AVxw.js","_app/immutable/chunks/index.B3RVpgtF.js","_app/immutable/chunks/stores.DCOWSESJ.js"];
export const stylesheets = ["_app/immutable/assets/Toaster.436keKGd.css"];
export const fonts = [];
