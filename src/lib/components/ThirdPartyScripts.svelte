<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { page } from '$app/stores';

	const CLARITY_ID = 'xizzn3hn9t';
	const CRISP_ID = '339ec906-f234-4dc3-9963-a0fe9ce12b4d';

	let unsubscribe: (() => void) | undefined;

	function loadScript(id: string, src: string, parent: HTMLElement = document.head) {
		if (document.getElementById(id)) return;
		const script = document.createElement('script');
		script.id = id;
		script.async = true;
		script.src = src;
		parent.appendChild(script);
	}

	type ClarityFunction = ((...args: unknown[]) => void) & { q?: unknown[] };

	function loadClarity() {
		const w = window as Window & { clarity?: ClarityFunction };
		if (!w.clarity) {
			const clarityQueue: ClarityFunction = (...args: unknown[]) => {
				clarityQueue.q = clarityQueue.q || [];
				clarityQueue.q.push(args);
			};
			w.clarity = clarityQueue;
		}
		loadScript('bt-clarity-script', `https://www.clarity.ms/tag/${CLARITY_ID}`);
	}

	function loadCrisp(pathname: string) {
		if (pathname.startsWith('/admin')) return;
		const w = window as Window & {
			$crisp?: unknown[];
			CRISP_WEBSITE_ID?: string;
		};
		w.$crisp = w.$crisp || [];
		w.CRISP_WEBSITE_ID = CRISP_ID;
		loadScript('bt-crisp-script', 'https://client.crisp.chat/l.js');
	}

	onMount(() => {
		loadClarity();
		unsubscribe = page.subscribe(($page) => loadCrisp($page.url.pathname));
	});

	onDestroy(() => unsubscribe?.());
</script>
