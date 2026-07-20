import { absUrl } from '$lib/guides/config';

export const prerender = true;

// Autorise explicitement les crawlers SEO + IA (PRD §F6) et référence le sitemap.
const BOTS = [
	'Googlebot',
	'Bingbot',
	'GPTBot',
	'ClaudeBot',
	'Claude-Web',
	'PerplexityBot',
	'CCBot'
];

export function GET() {
	const lines: string[] = [];
	for (const bot of BOTS) {
		lines.push(`User-agent: ${bot}`);
		lines.push('Allow: /');
		lines.push('');
	}
	lines.push('User-agent: *');
	lines.push('Allow: /');
	lines.push('');
	lines.push(`Sitemap: ${absUrl('/sitemap.xml')}`);
	lines.push('');

	return new Response(lines.join('\n'), {
		headers: { 'content-type': 'text/plain' }
	});
}
