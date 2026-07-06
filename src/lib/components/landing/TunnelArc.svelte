<script lang="ts">
	// Arc dégradé chaud (teal + pêche) — demi-cercle du tunnel.
	// direction "down" = bombé vers le haut, collé en bas d'une section.
	// direction "up"   = miroir, collé en haut.
	export let direction: 'down' | 'up' = 'down';
</script>

<div
	aria-hidden="true"
	class="pointer-events-none absolute inset-x-0 z-0 h-[300px] overflow-hidden {direction === 'down'
		? 'bottom-0'
		: 'top-0'}"
>
	<div
		class="absolute left-1/2 h-[560px] w-[175%] -translate-x-1/2 rounded-[50%]"
		style="{direction === 'down' ? 'top:44px;' : 'bottom:44px;'} background: radial-gradient(closest-side, rgba(42,157,143,0.12), rgba(244,214,180,0.24) 52%, rgba(250,250,248,0) 78%); filter: blur(30px);"
	></div>
	<div
		class="absolute left-1/2 h-[540px] w-[150%] -translate-x-1/2 rounded-[50%] border"
		style="{direction === 'down' ? 'top:44px;' : 'bottom:44px;'} border-color: rgba(42,157,143,0.14);"
	></div>
</div>
