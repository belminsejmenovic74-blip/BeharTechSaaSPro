/* Le sélecteur et le modal sont rendus par le script public Behar Tech Pro.
   Ce petit adaptateur conserve les emplacements React du site exemple sans
   dupliquer le catalogue, les prix ou la logique du widget. */

function HeroDeviceSelector() {
	return <div data-behar-widget-search style={{ width: '100%' }} />;
}

function RepairWidgetRoot() {
	return null;
}

Object.assign(window, { HeroDeviceSelector, RepairWidgetRoot });
