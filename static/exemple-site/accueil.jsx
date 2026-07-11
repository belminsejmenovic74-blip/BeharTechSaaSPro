/* ===========================================================
   ATELIER DÉMO — Page d'accueil (desktop + mobile)
   =========================================================== */

const PANNES = [
  "Téléphone qui ne charge plus","Court-circuit après chute","Désoxydation (dégât des eaux)",
  "Connecteur de charge à reprendre","Récupération de données","Lecteur de carte SIM",
  "Port HDMI de console","Rétroéclairage écran","Puce WiFi / réseau","Reprise de pistes carte mère"
];

const UNIVERS = [
  {t:"Smartphone", d:"iPhone, Samsung, Xiaomi…", ic:<><rect x="7" y="2.5" width="10" height="19" rx="2.4"/><line x1="11" y1="18.5" x2="13" y2="18.5"/></>},
  {t:"Tablette", d:"iPad, Galaxy Tab…", ic:<><rect x="4" y="3" width="16" height="18" rx="2.2"/><line x1="10.5" y1="18" x2="13.5" y2="18"/></>},
  {t:"Ordinateur", d:"Portable & fixe, Mac/PC", ic:<><rect x="3" y="4.5" width="18" height="12" rx="1.6"/><path d="M1.5 20h21"/></>},
  {t:"Console", d:"Switch, PS, Xbox", ic:<><rect x="2.5" y="7" width="19" height="10" rx="5"/><line x1="7" y1="12" x2="9" y2="12"/><line x1="8" y1="10.5" x2="8" y2="13.5"/><circle cx="16" cy="11" r="1"/><circle cx="18" cy="13" r="1"/></>},
  {t:"Accessoires", d:"Batteries, chargeurs…", ic:<><rect x="3" y="8" width="14" height="8" rx="2"/><path d="M17 11h2.5v2H17"/><line x1="6" y1="12" x2="9" y2="12"/></>},
  {t:"Micro-soudure", d:"Réparation carte mère", ic:<><rect x="6" y="6" width="12" height="12" rx="2"/><rect x="10" y="10" width="4" height="4" rx="1"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></>},
];
const SERVICE_LINKS = {
  "Smartphone":"#/services/smartphone",
  "Tablette":"#/services/tablette",
  "Ordinateur":"#/services/ordinateur",
  "Console":"#/services/console",
  "Accessoires":"#/services/accessoires",
  "Micro-soudure":"#/services/micro-soudure"
};

const STEPS = [
  {n:"01",t:"Diagnostic",d:"Examen complet au microscope, sans engagement."},
  {n:"02",t:"Devis gratuit",d:"Un prix clair avant toute intervention."},
  {n:"03",t:"Réparation",d:"Au composant près, à l'atelier de démonstration."},
  {n:"04",t:"Garantie",d:"Appareil testé, restitué et garanti."},
];

const CLASSIC = [
  {t:"Écran cassé", d:"Vitre, dalle, tactile — remplacé et recalibré.",
    ic:<><rect x="6" y="2.5" width="12" height="19" rx="2.2"/><path d="M6 7l5 4-3 3 4 3"/></>},
  {t:"Batterie", d:"Autonomie en chute : batterie d'origine remplacée.",
    ic:<><rect x="3" y="7" width="15" height="10" rx="2"/><path d="M18 10h2.5v4H18"/><path d="M7 12h4"/></>},
  {t:"Connecteur de charge", d:"Ne charge plus, faux contact : dock nettoyé ou remplacé.",
    ic:<><path d="M7 8V5M12 8V5M6 8h8v4a4 4 0 0 1-8 0z"/><path d="M10 16v5"/></>},
  {t:"Vitre arrière", d:"Dos fissuré : remplacement propre, comme neuf.",
    ic:<><rect x="6" y="2.5" width="12" height="19" rx="2.2"/><circle cx="10" cy="7" r="1.4"/></>},
  {t:"Caméra / photo", d:"Photos floues, objectif rayé : module changé.",
    ic:<><rect x="3" y="6" width="18" height="13" rx="2"/><circle cx="12" cy="12.5" r="3.4"/><path d="M8 6l1.5-2h5L16 6"/></>},
  {t:"Haut-parleur / micro", d:"Son faible, on ne vous entend plus : remplacé.",
    ic:<><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9.5a3.5 3.5 0 0 1 0 5"/></>},
  {t:"Boutons", d:"Power, volume, home : remis en état.",
    ic:<><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M19 8v4"/></>},
  {t:"Désoxydation", d:"Tombé dans l'eau : nettoyage et sauvetage.",
    ic:<><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/></>},
];

function ClassicRepairs(){
  const promises=[
    {k:"Sans rendez-vous",v:"Passez directement à l'atelier."},
    {k:"Dès 40 min",v:"Écran, batterie ou charge selon modèle et stock."},
    {k:"Devis gratuit",v:"Prix annoncé avant intervention."},
    {k:"Prix clair",v:"Réparation utile, sans surprise."},
  ];
  return (
    <section style={{padding:'74px 56px'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:34}}>
        {promises.map(p=>(
          <div key={p.k} className="bmc-card" style={{padding:'20px 22px',boxShadow:'var(--shadow-sm)'}}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:20}}>{p.k}</div>
            <p style={{fontSize:13.5,color:'var(--slate)',marginTop:5,lineHeight:1.45}}>{p.v}</p>
          </div>
        ))}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:34}}>
        <div>
          <h2 style={{fontSize:38,marginTop:16,lineHeight:1.08}}>Écran, batterie, charge :<br/>on répare vite et bien.</h2>
          <p style={{fontSize:17,color:'var(--slate)',marginTop:14,maxWidth:460,lineHeight:1.6}}>
            Smartphone, tablette, ordinateur, console : les réparations courantes
            sont traitées rapidement. Sans rendez-vous, diagnostic gratuit, prix clair.
          </p>
          <FloatingBubbles items={["Écran cassé","Batterie faible","Charge impossible","Sans rendez-vous"]} style={{marginTop:18,maxWidth:620}}/>
        </div>
        <a className="bmc-btn bmc-btn--primary" href="#">Demander un devis gratuit</a>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
        {CLASSIC.map(c=>(
          <div key={c.t} className="bmc-card" style={{padding:'24px 22px',boxShadow:'var(--shadow-sm)'}}>
            <div style={{width:44,height:44,borderRadius:12,background:'var(--steel-tint)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Ico size={22} d={c.ic} stroke="var(--steel-deep)"/>
            </div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:16.5,marginTop:16}}>{c.t}</div>
            <p style={{fontSize:13.5,color:'var(--slate)',marginTop:6,lineHeight:1.55}}>{c.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SpecialiteBand(){
  return (
    <section style={{background:'var(--bg)',padding:'74px 56px',borderTop:'1px solid var(--line)'}}>
      <div style={{display:'grid',gridTemplateColumns:'.92fr 1.08fr',gap:56,alignItems:'center'}}>
        <div>
          <span className="bmc-eyebrow">Notre spécialité</span>
          <h2 style={{fontSize:42,lineHeight:1.08,marginTop:18}}>La micro-soudure,<br/>là où les autres s'arrêtent.</h2>
          <p style={{fontSize:17,color:'var(--slate)',marginTop:20,maxWidth:440,lineHeight:1.65}}>
            La plupart des boutiques remplacent une pièce. Nous intervenons directement
            sur la carte mère : reprise de composants, pistes, micro-connecteurs.
            C'est ce qui nous permet de récupérer ce que d'autres déclarent irréparable.
          </p>
          <a className="bmc-btn bmc-btn--primary" style={{marginTop:28}} href="#">Découvrir la micro-soudure →</a>
        </div>
        <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
          {PANNES.map(p=>(
            <span key={p} style={{display:'inline-flex',alignItems:'center',gap:9,background:'#fff',border:'1px solid var(--line)',borderRadius:999,padding:'11px 16px',fontSize:14.5,fontWeight:500,boxShadow:'var(--shadow-sm)'}}>
              <span className="bmc-dot"/>{p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServicesStrip(){
  return (
    <section id="services" style={{padding:'74px 56px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:34}}>
        <div>
          <span className="bmc-eyebrow">Nos univers</span>
          <h2 style={{fontSize:38,marginTop:16}}>Tous vos appareils, un seul atelier.</h2>
        </div>
        <a className="bmc-btn bmc-btn--ghost" href="#">Voir tous les services</a>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',border:'1px solid var(--line)',borderRadius:'var(--r-lg)',overflow:'hidden',background:'#fff',boxShadow:'var(--shadow-sm)'}}>
        {UNIVERS.map((u,i)=>(
          <a key={u.t} href={SERVICE_LINKS[u.t]} style={{padding:'30px 22px',borderRight:i<5?'1px solid var(--line)':'none',position:'relative',background:'#fff',textDecoration:'none',color:'inherit'}}>
            <Ico size={26} stroke="var(--steel)" d={u.ic}/>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:16.5,marginTop:18,color:'var(--ink)'}}>{u.t}</div>
            <div style={{fontSize:13,color:'var(--slate-2)',marginTop:5}}>{u.d}</div>
          </a>
        ))}
      </div>
    </section>
  );
}

function ProofBand(){
  return (
    <section style={{background:'var(--bg)',padding:'74px 56px',borderTop:'1px solid var(--line)',borderBottom:'1px solid var(--line)'}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:48,alignItems:'center'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <div style={{position:'relative'}}>
            <img src={AVANT} style={{width:'100%',height:300,objectFit:'cover',borderRadius:16,border:'1px solid var(--line)'}}/>
            <span style={{position:'absolute',top:12,left:12,background:'rgba(14,28,43,.86)',color:'#fff',fontSize:11,fontWeight:600,letterSpacing:'.14em',padding:'6px 11px',borderRadius:999,fontFamily:"'Space Grotesk',sans-serif"}}>AVANT</span>
          </div>
          <div style={{position:'relative'}}>
            <img src={APRES} style={{width:'100%',height:300,objectFit:'cover',borderRadius:16,border:'1px solid var(--line)'}}/>
            <span style={{position:'absolute',top:12,left:12,background:'var(--steel)',color:'#fff',fontSize:11,fontWeight:600,letterSpacing:'.14em',padding:'6px 11px',borderRadius:999,fontFamily:"'Space Grotesk',sans-serif"}}>APRÈS</span>
          </div>
        </div>
        <div>
          <span className="bmc-eyebrow">Cas réel · atelier</span>
          <h2 style={{fontSize:40,lineHeight:1.08,marginTop:18}}>Écran explosé, châssis détruit — récupéré.</h2>
          <p style={{fontSize:17,color:'var(--slate)',marginTop:20,maxWidth:430,lineHeight:1.65}}>
            Cet iPhone 13 Pro est arrivé hors d'usage. Reconstruction complète :
            écran, châssis, étanchéité — et reprise des composants endommagés en micro-soudure.
            Rendu fonctionnel, comme neuf.
          </p>
          <div style={{marginTop:26}}><GoogleRating/></div>
        </div>
      </div>
    </section>
  );
}

function ProcessBand(){
  return (
    <section style={{padding:'74px 56px'}}>
      <div style={{textAlign:'center',marginBottom:42}}>
        <span className="bmc-eyebrow no-rule">Comment ça marche</span>
        <h2 style={{fontSize:38,marginTop:14}}>Simple, transparent, sans surprise.</h2>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:0}}>
        {STEPS.map((s,i)=>(
          <div key={s.n} style={{padding:'0 28px',borderLeft:i>0?'1px solid var(--line)':'none'}}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:15,color:'var(--steel)'}}>{s.n}</div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:20,marginTop:12}}>{s.t}</div>
            <p style={{fontSize:14.5,color:'var(--slate)',marginTop:8,lineHeight:1.6}}>{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProTeaser(){
  const pts=["Envoi postal · France entière","Devis sous 24-48h","Marque blanche & confidentialité","Délai de retour rapide","Tarifs revendeur dédiés"];
  return (
    <section style={{padding:'12px 56px 80px'}}>
      <div style={{background:'var(--ink)',borderRadius:'var(--r-xl)',padding:'52px 56px',position:'relative',overflow:'hidden'}}>
        <div className="bmc-drift" style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px)',backgroundSize:'54px 54px',maskImage:'radial-gradient(80% 120% at 88% 30%,#000,transparent)'}}/>
        <div style={{position:'relative',display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:40,flexWrap:'wrap'}}>
          <div style={{maxWidth:560}}>
            <span className="bmc-tag" style={{background:'rgba(28,159,224,.14)',border:'1px solid rgba(28,159,224,.4)',color:'#7CC8EE'}}>
              <span className="bmc-dot" style={{background:'var(--logo-blue)'}}/>Sous-traitance B2B
            </span>
            <h2 style={{fontSize:38,color:'#fff',marginTop:18,lineHeight:1.1}}>Votre atelier de<br/>micro-soudure.</h2>
            <p style={{color:'rgba(255,255,255,.66)',fontSize:16.5,marginTop:16,maxWidth:520,lineHeight:1.6}}>
              Vous récupérez les réparations « impossibles » sans investir en matériel.
              On reste invisible — vos clients restent vos clients.
            </p>
            <div style={{display:'flex',gap:13,marginTop:28}}>
              <a className="bmc-btn bmc-btn--steel" href="#/contact-pro" onClick={(e)=>{e.preventDefault();BMCGo("#/contact-pro");}}>Demander un devis →</a>
              <a className="bmc-btn bmc-btn--light" href="#">Demande en ligne</a>
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:12,minWidth:300}}>
            {pts.map(p=>(
              <div key={p} style={{display:'flex',alignItems:'center',gap:12,color:'rgba(255,255,255,.9)',fontSize:15,fontWeight:500}}>
                <span style={{width:26,height:26,borderRadius:8,background:'rgba(28,159,224,.16)',display:'flex',alignItems:'center',justifyContent:'center',flex:'0 0 auto'}}>
                  <Ico size={15} stroke="var(--logo-blue)" d={<path d="M4 12l5 5L20 6"/>}/>
                </span>
                {p}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function VisitBand(){
  return (
    <section style={{background:'var(--bg)',padding:'72px 56px',borderTop:'1px solid var(--line)'}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1.2fr',gap:48,alignItems:'center'}}>
        <div>
          <span className="bmc-eyebrow">L'atelier</span>
          <h2 style={{fontSize:36,marginTop:16}}>Découvrez l'expérience client.</h2>
          <div style={{display:'flex',flexDirection:'column',gap:18,marginTop:28}}>
            <InfoRow ic={<><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.6"/></>} k="Adresse" v="Coordonnées non publiées"/>
            <InfoRow ic={<><path d="M4 5c0 9 6 15 15 15a2 2 0 0 0 2-2v-2.4a1 1 0 0 0-.8-1l-3.4-.7a1 1 0 0 0-1 .5l-.8 1.4A12 12 0 0 1 8.7 9l1.4-.8a1 1 0 0 0 .5-1L9.9 3.8A1 1 0 0 0 8.9 3H6.5A2 2 0 0 0 4 5z"/></>} k="Téléphone" v="Demande en ligne"/>
            <WidgetContactLink/>
            <InfoRow ic={<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></>} k="Horaires" v="Lun–Sam · 9h-12h / 14h-19h"/>
          </div>
          <div style={{marginTop:28,display:'flex',gap:12}}>
            <a className="bmc-btn bmc-btn--primary" href="#/contact" target="_blank" rel="noreferrer">Demande en ligne</a>
            <a className="bmc-btn bmc-btn--ghost" href="#">Devis gratuit</a>
          </div>
        </div>
        <ExteriorPhoto h={360}/>
      </div>
    </section>
  );
}
function InfoRow({ic,k,v}){
  return (
    <div style={{display:'flex',gap:16,alignItems:'flex-start'}}>
      <div style={{width:44,height:44,borderRadius:12,background:'#fff',border:'1px solid var(--line)',display:'flex',alignItems:'center',justifyContent:'center',flex:'0 0 auto'}}>
        <Ico size={21} d={ic}/>
      </div>
      <div>
        <div style={{fontSize:12.5,letterSpacing:'.06em',textTransform:'uppercase',color:'var(--slate-2)',fontWeight:600,fontFamily:"'Space Grotesk',sans-serif"}}>{k}</div>
        <div style={{fontSize:18,fontWeight:600,marginTop:3}}>{v}</div>
      </div>
    </div>
  );
}

function AccueilDesktop(){
  return (
    <div className="bmc">
      <HeroA/>
      <ClassicRepairs/>
      <SpecialiteBand/>
      <ServicesStrip/>
      <ProofBand/>
      <ProcessBand/>
      <ProTeaser/>
      <VisitBand/>
      <Footer/>
    </div>
  );
}

Object.assign(window,{AccueilDesktop,PANNES,UNIVERS,STEPS,CLASSIC,ClassicRepairs,SpecialiteBand,ServicesStrip,ProofBand,ProcessBand,ProTeaser,VisitBand,InfoRow});
