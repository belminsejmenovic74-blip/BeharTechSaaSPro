import { getContext } from 'svelte';
import type { Writable } from 'svelte/store';

import type { SiteContent } from './types';

/** Store de contenu CMS partagé (fourni par le layout racine). */
export function getCms(): Writable<SiteContent> {
	return getContext<Writable<SiteContent>>('cms');
}
