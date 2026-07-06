import * as server from '../entries/pages/admin/login/_page.server.ts.js';

export const index = 9;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/admin/login/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/admin/login/+page.server.ts";
export const imports = ["_app/immutable/nodes/9.DubTLWJn.js","_app/immutable/chunks/scheduler.ClyjVq2j.js","_app/immutable/chunks/index.DgaDRGRF.js","_app/immutable/chunks/forms.BicgKZlJ.js","_app/immutable/chunks/entry.CqKSIBTH.js","_app/immutable/chunks/index.B3RVpgtF.js","_app/immutable/chunks/spread.mDU32Hd6.js","_app/immutable/chunks/Icon.CQ3DMQxp.js"];
export const stylesheets = [];
export const fonts = [];
