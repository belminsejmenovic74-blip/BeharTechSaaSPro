<script lang="ts">
	import ComingSoon from '$lib/components/ComingSoon.svelte';
	import JsonLd from '$lib/components/guides/JsonLd.svelte';
	import { organizationJsonLd } from '$lib/guides/jsonld';
</script>

<JsonLd data={organizationJsonLd()} />
<ComingSoon />
