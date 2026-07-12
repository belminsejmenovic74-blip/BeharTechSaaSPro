# Behar Tech Pro — site Svelte

- Démonstration atelier : `/exemple`
- Démonstration Svelte native : `/reparation`
- Widget publié : `wdg_b8d8c22875f0499b97929660fc7bbdd0`

Le site charge le widget avec :

```html
<div data-behar-widget-search></div>
<script
	async
	src="https://behartechpro.fr/widget.js"
	data-widget-id="wdg_b8d8c22875f0499b97929660fc7bbdd0"
></script>
```

La clé d’activation reste uniquement côté logiciel et serveur. Elle ne doit jamais être intégrée au site public.
