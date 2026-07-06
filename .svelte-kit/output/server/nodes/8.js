import * as server from '../entries/pages/admin/_page.server.ts.js';

export const index = 8;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/admin/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/admin/+page.server.ts";
export const imports = ["_app/immutable/nodes/8.9ICnHIek.js","_app/immutable/chunks/scheduler.ClyjVq2j.js","_app/immutable/chunks/index.DgaDRGRF.js","_app/immutable/chunks/spread.mDU32Hd6.js","_app/immutable/chunks/Toaster.svelte_svelte_type_style_lang.DE74AVxw.js","_app/immutable/chunks/index.B3RVpgtF.js","_app/immutable/chunks/Icon.CQ3DMQxp.js","_app/immutable/chunks/x.CW8Ty1Pp.js","_app/immutable/chunks/icons.Crk-i6Zt.js"];
export const stylesheets = ["_app/immutable/assets/Toaster.436keKGd.css"];
export const fonts = [];
