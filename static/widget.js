(() => {
	const current = document.currentScript;
	const publicId = current?.getAttribute('data-widget-id') || '';
	if (!/^wdg_[a-zA-Z0-9_-]{12,80}$/.test(publicId)) return;

	const remote = document.createElement('script');
	remote.async = true;
	remote.src = 'https://app.behartechpro.fr/widget.js';
	remote.setAttribute('data-origin', 'https://app.behartechpro.fr');
	remote.setAttribute('data-widget-id', publicId);
	current?.after(remote);
})();
