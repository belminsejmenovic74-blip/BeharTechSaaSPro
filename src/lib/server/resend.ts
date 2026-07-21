import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

// Client Resend LAZY : le SDK lève si on le construit sans clé, et le build
// (phase d'analyse) charge ce module. On ne construit donc le client qu'au
// runtime, lorsque RESEND_API_KEY est réellement présent. Renvoie null sinon.
let _client: Resend | null = null;
export function getResend(): Resend | null {
	const key = env.RESEND_API_KEY;
	if (!key) return null;
	_client ??= new Resend(key);
	return _client;
}
