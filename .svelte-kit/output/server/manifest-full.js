export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.png","imgs/amazon-logo.png","imgs/beevo-email-logo.png","imgs/beevo-sms-logo.png","imgs/discord.svg","imgs/label-quali-repar-logo.png","imgs/mockup-a-atelier.png","imgs/mockup-a-mobile.png","imgs/mockup-b-ocr.png","imgs/mockup-b-rachat.png","imgs/mockup-b-suivi.png","imgs/mockup-b-widget.png","imgs/mockup-c-avis.png","imgs/mockup-c-recond.png","imgs/mockup-c-sms.png","imgs/mockup-c-suivi.png","imgs/mockup-clients.png","imgs/mockup-comptoir.png","imgs/mockup-dashboard.png","imgs/mockup-ocr.png","imgs/stripe-logo.png","imgs/sumup-logo.png","imgs/x.svg"]),
	mimeTypes: {".png":"image/png",".svg":"image/svg+xml"},
	_: {
		client: {"start":"_app/immutable/entry/start.BBxk2LRB.js","app":"_app/immutable/entry/app.BCdxW4aM.js","imports":["_app/immutable/entry/start.BBxk2LRB.js","_app/immutable/chunks/entry.CqKSIBTH.js","_app/immutable/chunks/scheduler.ClyjVq2j.js","_app/immutable/chunks/index.B3RVpgtF.js","_app/immutable/entry/app.BCdxW4aM.js","_app/immutable/chunks/scheduler.ClyjVq2j.js","_app/immutable/chunks/index.DgaDRGRF.js"],"stylesheets":[],"fonts":[],"uses_env_dynamic_public":false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js')),
			__memo(() => import('./nodes/7.js')),
			__memo(() => import('./nodes/8.js')),
			__memo(() => import('./nodes/9.js'))
		],
		routes: [
			{
				id: "/(app)",
				pattern: /^\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/admin",
				pattern: /^\/admin\/?$/,
				params: [],
				page: { layouts: [0,4,], errors: [1,,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/admin/api/reset",
				pattern: /^\/admin\/api\/reset\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/admin/api/reset/_server.ts.js'))
			},
			{
				id: "/admin/api/save",
				pattern: /^\/admin\/api\/save\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/admin/api/save/_server.ts.js'))
			},
			{
				id: "/admin/api/upload",
				pattern: /^\/admin\/api\/upload\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/admin/api/upload/_server.ts.js'))
			},
			{
				id: "/admin/login",
				pattern: /^\/admin\/login\/?$/,
				params: [],
				page: { layouts: [0,4,], errors: [1,,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/(app)/(auth)/signin",
				pattern: /^\/signin\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/(app)/(auth)/signup",
				pattern: /^\/signup\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,,], leaf: 7 },
				endpoint: null
			}
		],
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
