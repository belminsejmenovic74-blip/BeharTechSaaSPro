import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: '200.html',
      precompress: false,
      strict: false
    }),
    // Vitrine statique : une ancre CMS pointant vers une section masquée ne doit
    // pas casser le build (avertissement au lieu d'erreur).
    prerender: { handleMissingId: 'warn' }
  }
};

export default config;
