// Les pages marketing peuvent être mises en cache par Vercel, mais le projet
// reste SSR afin d'héberger Auth PKCE, Checkout et les webhooks Stripe.
export const prerender = false;
