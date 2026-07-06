<script lang="ts">
	import { Toaster } from '$lib/components/ui/sonner';
</script>

<div class="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
	<slot></slot>
</div>
<Toaster />
