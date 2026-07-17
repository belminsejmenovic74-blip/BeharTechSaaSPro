import { browser } from '$app/environment';
import { Clerk } from '@clerk/clerk-js';
import { frFR } from '@clerk/localizations';
import { ui } from '@clerk/ui';
import { shadcn } from '@clerk/ui/themes';
import { writable } from 'svelte/store';

export const clerkSession = writable({ ready: false, signedIn: false });

let clerkPromise: Promise<Clerk> | null = null;

export function getClerk(): Promise<Clerk> {
	if (!browser) return Promise.reject(new Error('Clerk est disponible uniquement dans le navigateur.'));

	if (!clerkPromise) {
		clerkPromise = initializeClerk().catch((error) => {
			clerkPromise = null;
			clerkSession.set({ ready: true, signedIn: false });
			throw error;
		});
	}

	return clerkPromise;
}

async function initializeClerk(): Promise<Clerk> {
	const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
	if (!publishableKey) {
		throw new Error('VITE_CLERK_PUBLISHABLE_KEY est manquante. Lancez `clerk env pull`.');
	}

	const clerk = new Clerk(publishableKey);
	await clerk.load({
		ui: { ClerkUI: ui.ClerkUI },
		afterSignOutUrl: '/',
		localization: frFR,
		appearance: {
			theme: shadcn,
			variables: {
				colorPrimary: '#1a1916',
				colorText: '#1a1916',
				colorTextSecondary: '#6b6b6b',
				colorBackground: '#ffffff',
				colorInputBackground: '#ffffff',
				colorInputText: '#1a1916',
				borderRadius: '0.5rem'
			}
		}
	});

	const updateSession = () => {
		clerkSession.set({ ready: true, signedIn: clerk.isSignedIn });
	};
	clerk.addListener(updateSession);
	updateSession();

	return clerk;
}
