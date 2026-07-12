/* ===========================================================
   ATELIER DÉMO — Écrans mobiles (390px) : Accueil · Micro · Pro
   =========================================================== */

function MFooter() {
	return (
		<footer style={{ background: 'var(--ink)', color: '#fff', padding: '40px 20px 26px' }}>
			<Logo size={19} tone="light" />
			<p style={{ color: 'rgba(255,255,255,.6)', fontSize: 13.5, marginTop: 14, lineHeight: 1.6 }}>
				Atelier de réparation high-tech &amp; micro-soudure dans votre ville.
			</p>
			<div style={{ marginTop: 16 }}>
				<GoogleRating size={14} light />
			</div>
			<div style={{ height: 1, background: 'rgba(255,255,255,.12)', margin: '24px 0' }} />
			<p style={{ fontSize: 14, lineHeight: 1.85, color: 'rgba(255,255,255,.82)' }}>
				Coordonnées non publiées
				<br />
				<span style={{ color: '#fff', fontWeight: 600 }}>Demande en ligne</span>
				<br />
				<span style={{ display: 'inline-flex', margin: '6px 0' }}>
					<WidgetContactLink light compact />
				</span>
				<br />
				<span style={{ color: 'rgba(255,255,255,.6)' }}>Lun–Sam · 9h-12h / 14h-19h</span>
			</p>
			<div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.4)', marginTop: 22 }}>
				© 2026 Atelier Démo — votre ville
			</div>
		</footer>
	);
}

function MSectionHead({ eyebrow, title, light }) {
	return (
		<div style={{ marginBottom: 20 }}>
			<span className="bmc-eyebrow" style={light ? { color: 'var(--silver)' } : null}>
				{eyebrow}
			</span>
			<h2
				style={{
					fontSize: 27,
					lineHeight: 1.12,
					marginTop: 12,
					color: light ? '#fff' : 'var(--ink)'
				}}
			>
				{title}
			</h2>
		</div>
	);
}

/* ---------------- ACCUEIL MOBILE ---------------- */
function AccueilMobile() {
	return (
		<div className="bmc">
			<NavMobile />
			{/* hero */}
			<div style={{ padding: '30px 20px 34px' }}>
				<span className="bmc-eyebrow">Réparation sans rendez-vous</span>
				<h1 style={{ fontSize: 34, lineHeight: 1.06, marginTop: 14, fontWeight: 700 }}>
					Réparation téléphone rapide dans votre ville.
				</h1>
				<p style={{ fontSize: 15.5, color: 'var(--slate)', marginTop: 14, lineHeight: 1.6 }}>
					Écran, batterie, charge, caméra : devis gratuit, prix clair, réparation possible dès 40
					minutes selon la panne.
				</p>
				<FloatingBubbles
					items={['Sans RDV', 'Dès 40 min', 'Prix clair']}
					style={{ marginTop: 16 }}
				/>
				<div style={{ marginTop: 20 }}>
					<HeroDeviceSelector />
				</div>
				<div style={{ position: 'relative', marginTop: 24 }}>
					<div
						style={{
							position: 'absolute',
							inset: '0 0',
							background: 'radial-gradient(60% 55% at 55% 45%,var(--steel-tint),transparent 70%)'
						}}
					/>
					<img
						src={BOARD}
						alt="Carte mère"
						className="bmc-float-slow"
						style={{
							position: 'relative',
							width: '100%',
							display: 'block',
							filter: 'drop-shadow(0 20px 36px rgba(14,28,43,.16))'
						}}
					/>
				</div>
				<div style={{ marginTop: 18 }}>
					<GoogleRating size={16} />
				</div>
			</div>
			{/* spécialité */}
			<div
				style={{
					background: 'var(--bg)',
					padding: '34px 20px',
					borderTop: '1px solid var(--line)'
				}}
			>
				<MSectionHead
					eyebrow="Notre spécialité"
					title="La micro-soudure, là où les autres s'arrêtent."
				/>
				<p style={{ fontSize: 15, color: 'var(--slate)', lineHeight: 1.6, marginBottom: 18 }}>
					On intervient directement sur la carte mère — reprise de composants, pistes,
					micro-connecteurs.
				</p>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
					{PANNES.slice(0, 6).map((p) => (
						<span
							key={p}
							style={{
								display: 'inline-flex',
								alignItems: 'center',
								gap: 7,
								background: '#fff',
								border: '1px solid var(--line)',
								borderRadius: 999,
								padding: '8px 12px',
								fontSize: 12.5,
								fontWeight: 500
							}}
						>
							<span className="bmc-dot" />
							{p}
						</span>
					))}
				</div>
				<a className="bmc-btn bmc-btn--ghost" style={{ marginTop: 18, width: '100%' }} href="#">
					Découvrir la micro-soudure →
				</a>
			</div>
			{/* services */}
			<div style={{ padding: '34px 20px' }}>
				<MSectionHead eyebrow="Nos univers" title="Tous vos appareils, un seul atelier." />
				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
					{UNIVERS.map((u) => (
						<a
							key={u.t}
							href={SERVICE_LINKS[u.t]}
							className="bmc-card"
							style={{
								padding: '18px 16px',
								background: '#fff',
								textDecoration: 'none',
								color: 'inherit'
							}}
						>
							<Ico size={22} stroke="var(--steel)" d={u.ic} />
							<div
								style={{
									fontFamily: "'Space Grotesk',sans-serif",
									fontWeight: 600,
									fontSize: 15,
									marginTop: 12,
									color: 'var(--ink)'
								}}
							>
								{u.t}
							</div>
							<div style={{ fontSize: 12, color: 'var(--slate-2)', marginTop: 3 }}>{u.d}</div>
						</a>
					))}
				</div>
			</div>
			{/* avant/après */}
			<div
				style={{
					background: 'var(--bg)',
					padding: '34px 20px',
					borderTop: '1px solid var(--line)'
				}}
			>
				<MSectionHead eyebrow="Cas réel" title="Écran explosé — récupéré." />
				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
					{[
						[AVANT, 'AVANT', 'rgba(14,28,43,.86)'],
						[APRES, 'APRÈS', 'var(--steel)']
					].map(([img, lab, bg]) => (
						<div key={lab} style={{ position: 'relative' }}>
							<img
								src={img}
								style={{
									width: '100%',
									height: 200,
									objectFit: 'cover',
									borderRadius: 12,
									border: '1px solid var(--line)'
								}}
							/>
							<span
								style={{
									position: 'absolute',
									top: 9,
									left: 9,
									background: bg,
									color: '#fff',
									fontSize: 10,
									fontWeight: 600,
									letterSpacing: '.12em',
									padding: '5px 9px',
									borderRadius: 999,
									fontFamily: "'Space Grotesk',sans-serif"
								}}
							>
								{lab}
							</span>
						</div>
					))}
				</div>
			</div>
			{/* pro teaser */}
			<div style={{ padding: '30px 20px' }}>
				<div
					style={{ background: 'var(--ink)', borderRadius: 'var(--r-lg)', padding: '30px 24px' }}
				>
					<span className="bmc-eyebrow" style={{ color: 'var(--silver)' }}>
						Sous-traitance B2B
					</span>
					<h3 style={{ fontSize: 22, color: '#fff', marginTop: 12, lineHeight: 1.15 }}>
						Réparateur ? Sous-traitez votre micro-soudure.
					</h3>
					<p style={{ color: 'rgba(255,255,255,.62)', fontSize: 14, marginTop: 10 }}>
						Envoi postal, devis 24-48h, marque blanche.
					</p>
					<a
						className="bmc-btn bmc-btn--steel"
						style={{ marginTop: 18, width: '100%' }}
						href="#/contact-pro"
						onClick={(e) => {
							e.preventDefault();
							BMCGo('#/contact-pro');
						}}
					>
						Demander un devis →
					</a>
				</div>
			</div>
			{/* visite */}
			<div
				style={{
					background: 'var(--bg)',
					padding: '34px 20px',
					borderTop: '1px solid var(--line)'
				}}
			>
				<MSectionHead eyebrow="L'atelier" title="Découvrez l'expérience client." />
				<ExteriorPhoto h={170} style={{ borderRadius: 14, marginBottom: 18 }} />
				<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
					<InfoRow
						ic={
							<>
								<path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" />
								<circle cx="12" cy="10" r="2.6" />
							</>
						}
						k="Adresse"
						v="Coordonnées non publiées"
					/>
					<InfoRow
						ic={
							<>
								<path d="M4 5c0 9 6 15 15 15a2 2 0 0 0 2-2v-2.4a1 1 0 0 0-.8-1l-3.4-.7a1 1 0 0 0-1 .5l-.8 1.4A12 12 0 0 1 8.7 9l1.4-.8a1 1 0 0 0 .5-1L9.9 3.8A1 1 0 0 0 8.9 3H6.5A2 2 0 0 0 4 5z" />
							</>
						}
						k="Téléphone"
						v="Demande en ligne"
					/>
					<WidgetContactLink />
					<InfoRow
						ic={
							<>
								<circle cx="12" cy="12" r="9" />
								<path d="M12 7v5l3.5 2" />
							</>
						}
						k="Horaires"
						v="Lun–Sam · 9h-12h / 14h-19h"
					/>
				</div>
			</div>
			<MFooter />
		</div>
	);
}

/* ---------------- MICRO-SOUDURE MOBILE ---------------- */
function MicroMobile() {
	return (
		<div className="bmc">
			<NavMobile />
			{/* hero blanc */}
			<div
				style={{
					background: '#fff',
					color: 'var(--ink)',
					padding: '30px 20px 30px',
					position: 'relative',
					overflow: 'hidden'
				}}
			>
				<div
					style={{
						position: 'absolute',
						inset: 0,
						backgroundImage:
							'linear-gradient(rgba(14,28,43,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(14,28,43,.04) 1px,transparent 1px)',
						backgroundSize: '46px 46px',
						maskImage: 'radial-gradient(70% 60% at 60% 30%,#000,transparent)'
					}}
				/>
				<div style={{ position: 'relative' }}>
					<span className="bmc-eyebrow">Page phare</span>
					<h1 style={{ fontSize: 33, lineHeight: 1.05, marginTop: 14, fontWeight: 700 }}>
						La micro-soudure, notre vraie force.
					</h1>
					<p style={{ fontSize: 15, color: 'var(--slate)', marginTop: 14, lineHeight: 1.6 }}>
						Microscope, station à air chaud, reprise de pistes au dixième de millimètre.
					</p>
					<img
						src={BOARD}
						alt="Carte mère"
						className="bmc-float-slow"
						style={{
							width: '100%',
							marginTop: 20,
							display: 'block',
							filter: 'drop-shadow(0 24px 44px rgba(14,28,43,.20))'
						}}
					/>
					<a className="bmc-btn bmc-btn--primary" style={{ marginTop: 18, width: '100%' }} href="#">
						Diagnostic &amp; devis gratuit
					</a>
					<a className="bmc-btn bmc-btn--ghost" style={{ marginTop: 10, width: '100%' }} href="#">
						Vous êtes Pro ? →
					</a>
				</div>
			</div>
			{/* faults */}
			<div style={{ padding: '34px 20px' }}>
				<MSectionHead
					eyebrow="Ce qu'on répare"
					title="Si c'est sur la carte mère, c'est notre terrain."
				/>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
					{FAULTS.map((f) => (
						<div
							key={f.t}
							className="bmc-card"
							style={{ padding: '18px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}
						>
							<div
								style={{
									width: 40,
									height: 40,
									borderRadius: 11,
									background: 'var(--steel-tint)',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									flex: '0 0 auto'
								}}
							>
								<Ico size={20} d={f.ic} stroke="var(--steel-deep)" />
							</div>
							<div>
								<div
									style={{
										fontFamily: "'Space Grotesk',sans-serif",
										fontWeight: 600,
										fontSize: 16
									}}
								>
									{f.t}
								</div>
								<p
									style={{ fontSize: 13.5, color: 'var(--slate)', marginTop: 4, lineHeight: 1.55 }}
								>
									{f.d}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>
			{/* process */}
			<div style={{ background: 'var(--ink)', color: '#fff', padding: '34px 20px' }}>
				<MSectionHead light eyebrow="Le process" title="Méthodique, sous microscope." />
				<div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
					{MSTEPS.map((s) => (
						<div
							key={s.n}
							style={{
								display: 'flex',
								gap: 16,
								padding: '15px 0',
								borderTop: '1px solid rgba(255,255,255,.12)'
							}}
						>
							<span
								style={{
									fontFamily: "'Space Grotesk',sans-serif",
									fontWeight: 700,
									fontSize: 14,
									color: 'var(--logo-blue)',
									width: 22,
									flex: '0 0 auto'
								}}
							>
								{s.n}
							</span>
							<div>
								<div
									style={{
										fontFamily: "'Space Grotesk',sans-serif",
										fontWeight: 600,
										fontSize: 16,
										color: '#fff'
									}}
								>
									{s.t}
								</div>
								<p
									style={{
										fontSize: 13.5,
										color: 'rgba(255,255,255,.6)',
										marginTop: 4,
										lineHeight: 1.5
									}}
								>
									{s.d}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>
			{/* avant/après */}
			<div
				style={{
					background: 'var(--bg)',
					padding: '34px 20px',
					borderTop: '1px solid var(--line)'
				}}
			>
				<MSectionHead eyebrow="Résultat" title="Déclaré perdu ailleurs. Reparti d'ici." />
				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
					{[
						[AVANT, 'AVANT', 'rgba(14,28,43,.86)'],
						[APRES, 'APRÈS', 'var(--steel)']
					].map(([img, lab, bg]) => (
						<div key={lab} style={{ position: 'relative' }}>
							<img
								src={img}
								style={{
									width: '100%',
									height: 200,
									objectFit: 'cover',
									borderRadius: 12,
									border: '1px solid var(--line)'
								}}
							/>
							<span
								style={{
									position: 'absolute',
									top: 9,
									left: 9,
									background: bg,
									color: '#fff',
									fontSize: 10,
									fontWeight: 600,
									letterSpacing: '.12em',
									padding: '5px 9px',
									borderRadius: 999,
									fontFamily: "'Space Grotesk',sans-serif"
								}}
							>
								{lab}
							</span>
						</div>
					))}
				</div>
				<div style={{ marginTop: 18 }}>
					<GoogleRating size={15} />
				</div>
				<a className="bmc-btn bmc-btn--primary" style={{ marginTop: 18, width: '100%' }} href="#">
					Demander un devis gratuit
				</a>
			</div>
			<MFooter />
		</div>
	);
}

/* ---------------- CONTACT PRO MOBILE ---------------- */
function ContactProMobile() {
	return (
		<div className="bmc">
			<NavMobile />
			{/* hero blanc */}
			<div
				style={{
					background: '#fff',
					color: 'var(--ink)',
					padding: '44px 20px 46px',
					position: 'relative',
					overflow: 'hidden',
					minHeight: 430,
					display: 'flex',
					alignItems: 'center'
				}}
			>
				<div
					style={{
						position: 'absolute',
						inset: 0,
						backgroundImage:
							'linear-gradient(rgba(14,28,43,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(14,28,43,.04) 1px,transparent 1px)',
						backgroundSize: '46px 46px',
						maskImage: 'radial-gradient(80% 70% at 30% 30%,#000,transparent)'
					}}
				/>
				<div style={{ position: 'relative' }}>
					<span
						className="bmc-tag"
						style={{
							background: 'rgba(52,114,143,.10)',
							border: '1px solid rgba(52,114,143,.35)',
							color: 'var(--steel-deep)'
						}}
					>
						<span className="bmc-dot" />
						Sous-traitance B2B
					</span>
					<h1 style={{ fontSize: 38, lineHeight: 1.04, marginTop: 16, fontWeight: 700 }}>
						Confiez-nous la micro-soudure que vous ne faites pas.
					</h1>
					<p style={{ fontSize: 15, color: 'var(--slate)', marginTop: 14, lineHeight: 1.6 }}>
						Votre atelier de micro-soudure en sous-traitance. Discret, rapide, en marque blanche.
					</p>
					<a
						className="bmc-btn bmc-btn--steel"
						style={{ marginTop: 20, width: '100%' }}
						href="#contact-pro-form"
					>
						Demander un devis
					</a>
					<a className="bmc-btn bmc-btn--ghost" style={{ marginTop: 10, width: '100%' }} href="#">
						Demande en ligne
					</a>
					<a
						className="bmc-btn"
						style={{ marginTop: 10, width: '100%', background: '#25D366', color: '#fff' }}
						href="#/contact"
						target="_blank"
						rel="noreferrer"
					>
						<WidgetLinkIcon size={19} /> Widget client · Widget en ligne
					</a>
				</div>
			</div>
			{/* benefits */}
			<div style={{ padding: '34px 20px' }}>
				<MSectionHead eyebrow="Pourquoi nous" title="Un partenaire technique, pas un concurrent." />
				<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
					{PRO_BENEFITS.map((b) => (
						<div
							key={b.t}
							className="bmc-card"
							style={{ padding: '18px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}
						>
							<div
								style={{
									width: 40,
									height: 40,
									borderRadius: 11,
									background: 'var(--steel-tint)',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									flex: '0 0 auto'
								}}
							>
								<Ico size={20} d={b.ic} stroke="var(--steel-deep)" />
							</div>
							<div>
								<div
									style={{
										fontFamily: "'Space Grotesk',sans-serif",
										fontWeight: 600,
										fontSize: 15.5
									}}
								>
									{b.t}
								</div>
								<p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 4, lineHeight: 1.5 }}>
									{b.d}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>
			{/* flow */}
			<div
				style={{
					background: 'var(--bg)',
					padding: '34px 20px',
					borderTop: '1px solid var(--line)'
				}}
			>
				<MSectionHead eyebrow="Le circuit" title="Quatre étapes, aucune friction." />
				<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
					{PRO_FLOW.map((s) => (
						<div key={s.n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
							<span
								style={{
									width: 34,
									height: 34,
									borderRadius: '50%',
									background: 'var(--ink)',
									color: '#fff',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									fontFamily: "'Space Grotesk',sans-serif",
									fontWeight: 700,
									fontSize: 13,
									flex: '0 0 auto'
								}}
							>
								{s.n}
							</span>
							<div>
								<div
									style={{
										fontFamily: "'Space Grotesk',sans-serif",
										fontWeight: 600,
										fontSize: 16
									}}
								>
									{s.t}
								</div>
								<p style={{ fontSize: 13.5, color: 'var(--slate)', marginTop: 3, lineHeight: 1.5 }}>
									{s.d}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>
			{/* form */}
			<div style={{ padding: '34px 20px' }}>
				<MSectionHead eyebrow="Demande de sous-traitance" title="Parlons de votre volume." />
				<form
					className="bmc-card"
					style={{ padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}
					onSubmit={BMCSubmitForm}
				>
					<Field label="Société / enseigne" ph="Ex. Atelier Réparation Lyon" />
					<Field label="Interlocuteur" ph="Nom et prénom" />
					<Field label="E-mail pro" ph="vous@entreprise.fr" type="email" />
					<Field label="Téléphone" ph="06 00 00 00 00" type="tel" />
					<Field label="Volume estimé / mois" ph="Ex. 10 à 20 cartes" />
					<Field label="Pannes sous-traitées" ph="Court-circuit, charge, données…" type="area" />
					<button
						className="bmc-btn bmc-btn--primary"
						style={{ border: 'none', width: '100%' }}
						type="submit"
					>
						Envoyer ma demande →
					</button>
					<span
						style={{ fontSize: 12, color: 'var(--slate-2)', lineHeight: 1.5, textAlign: 'center' }}
					>
						Vos données restent confidentielles.
					</span>
				</form>
			</div>
			<MFooter />
		</div>
	);
}

Object.assign(window, { AccueilMobile, MicroMobile, ContactProMobile, MFooter, MSectionHead });
