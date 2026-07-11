/* ===========================================================
   ATELIER DÉMO — Nos services : réparations par appareil
   =========================================================== */

const SERVICE_CATS = [
  {t:"Smartphone", d:"Écran, batterie, charge, caméra, son, oxydation.", href:"#/services/smartphone", ic:UNIVERS[0].ic},
  {t:"Tablette", d:"Écran tactile, batterie, connecteur, diagnostic.", href:"#/services/tablette", ic:UNIVERS[1].ic},
  {t:"Ordinateur", d:"Charge, batterie, écran, nettoyage, petits composants.", href:"#/services/ordinateur", ic:UNIVERS[2].ic},
  {t:"Console", d:"Port HDMI, ventilation, lecteur, manettes, image.", href:"#/services/console", ic:UNIVERS[3].ic},
  {t:"Accessoires", d:"Batteries, chargeurs, écouteurs, petits remplacements.", href:"#/services/accessoires", ic:UNIVERS[4].ic},
  {t:"Micro-soudure", d:"Carte mère, court-circuit, données, pistes.", href:"#/services/micro-soudure", ic:UNIVERS[5].ic},
];

const SMARTPHONE_REPAIRS = [
  {t:"Écran cassé", d:"Vitre fissurée, écran noir, tactile qui ne répond plus : remplacement propre et test complet.", ic:CLASSIC[0].ic},
  {t:"Batterie", d:"Autonomie faible, téléphone qui s'éteint, batterie gonflée : remplacement adapté au modèle.", ic:CLASSIC[1].ic},
  {t:"Connecteur de charge", d:"Ne charge plus, faux contact, câble qui bouge : nettoyage, remplacement ou reprise si besoin.", ic:CLASSIC[2].ic},
  {t:"Vitre arrière", d:"Dos cassé ou fissuré : remplacement net, châssis contrôlé.", ic:CLASSIC[3].ic},
  {t:"Caméra / objectif", d:"Photo floue, objectif rayé, caméra qui tremble : module ou lentille remplacé.", ic:CLASSIC[4].ic},
  {t:"Haut-parleur / micro", d:"Son faible, appel inaudible, micro muet : diagnostic puis remplacement du composant.", ic:CLASSIC[5].ic},
  {t:"Boutons", d:"Power, volume, vibreur, bouton home : remise en état selon la panne.", ic:CLASSIC[6].ic},
  {t:"Désoxydation", d:"Téléphone tombé dans l'eau : nettoyage interne, diagnostic et tentative de sauvetage.", ic:CLASSIC[7].ic},
  {t:"Récupération de données", d:"Photos, contacts, fichiers : intervention quand l'appareil ne démarre plus.", ic:<><rect x="5" y="5" width="14" height="14" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/></>},
  {t:"Carte mère", d:"Panne de charge, court-circuit, réseau, SIM : micro-soudure au composant près.", ic:UNIVERS[5].ic},
];

const REPAIR_GROUPS = [
  {slug:"smartphone", title:"Smartphone", headline:"Toutes les réparations téléphone.", text:"iPhone, Samsung, Xiaomi et autres modèles : diagnostic gratuit, devis clair, réparation testée avant restitution.", items:SMARTPHONE_REPAIRS},
  {slug:"tablette", title:"Tablette", headline:"Réparations tablette et iPad.", text:"iPad, Galaxy Tab et autres tablettes : tactile, écran, batterie, charge et remise en état.", items:[
    {t:"Écran / tactile", d:"Vitre cassée, tactile bloqué, affichage noir : remplacement et contrôle complet.", ic:CLASSIC[0].ic},
    {t:"Batterie tablette", d:"Autonomie faible, tablette qui s'éteint ou ne tient plus la charge.", ic:CLASSIC[1].ic},
    {t:"Connecteur de charge", d:"Port abîmé, câble qui bouge, charge impossible ou lente.", ic:CLASSIC[2].ic},
    {t:"Boutons / volume", d:"Boutons power, volume ou home qui ne répondent plus.", ic:CLASSIC[6].ic},
    {t:"Caméra", d:"Objectif flou, caméra avant ou arrière qui ne s'ouvre plus.", ic:CLASSIC[4].ic},
    {t:"Désoxydation", d:"Tablette tombée dans l'eau : nettoyage interne et diagnostic.", ic:CLASSIC[7].ic},
  ]},
  {slug:"ordinateur", title:"Ordinateur", headline:"Réparations ordinateur portable et fixe.", text:"Mac/PC portable ou fixe : on traite les pannes courantes et les problèmes de charge ou d'affichage.", items:[
    {t:"Écran ordinateur", d:"Dalle cassée, lignes, affichage noir ou rétroéclairage faible.", ic:UNIVERS[2].ic},
    {t:"Batterie PC/Mac", d:"Autonomie faible, gonflement, arrêt soudain ou charge instable.", ic:CLASSIC[1].ic},
    {t:"Connecteur de charge", d:"Prise USB-C, MagSafe ou alimentation avec faux contact.", ic:CLASSIC[2].ic},
    {t:"Clavier / trackpad", d:"Touches HS, liquide, trackpad qui répond mal.", ic:<><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M6 10h12M6 14h8"/></>},
    {t:"Nettoyage interne", d:"Poussière, chauffe, ventilation bruyante : nettoyage et contrôle.", ic:<><path d="M12 3v18M5 8l14 8M19 8L5 16"/></>},
    {t:"Diagnostic panne", d:"Démarrage impossible, écran noir, charge ou carte mère à contrôler.", ic:UNIVERS[5].ic},
  ]},
  {slug:"console", title:"Console", headline:"Réparations console de jeu.", text:"Switch, PlayStation, Xbox : image, charge, ventilation, ports et pannes fréquentes.", items:[
    {t:"Port HDMI", d:"Image absente, port arraché ou tordu : remplacement ou reprise propre.", ic:<><rect x="4" y="8" width="16" height="8" rx="2"/><path d="M8 12h8"/></>},
    {t:"Connecteur de charge", d:"Console qui ne charge plus, USB-C abîmé ou faux contact.", ic:CLASSIC[2].ic},
    {t:"Ventilation", d:"Console qui chauffe, bruit fort, poussière : nettoyage et contrôle.", ic:<><path d="M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0"/><path d="M12 4c2 3 2 5 0 8M20 12c-3 2-5 2-8 0M12 20c-2-3-2-5 0-8"/></>},
    {t:"Lecteur / cartouche", d:"Jeu non détecté, lecteur ou slot à contrôler.", ic:<><rect x="6" y="4" width="12" height="16" rx="2"/><path d="M9 8h6M9 12h6"/></>},
    {t:"Manettes", d:"Joystick drift, boutons, gâchettes ou connectique.", ic:UNIVERS[3].ic},
    {t:"Micro-soudure console", d:"Pistes arrachées, composants ou connecteurs à reprendre.", ic:UNIVERS[5].ic},
  ]},
  {slug:"accessoires", title:"Accessoires", headline:"Accessoires et petits équipements.", text:"On s'occupe aussi des batteries, chargeurs, petits connecteurs et accessoires utiles.", items:[
    {t:"Batteries", d:"Remplacement ou contrôle des batteries compatibles selon l'appareil.", ic:CLASSIC[1].ic},
    {t:"Chargeurs / câbles", d:"Diagnostic de charge, câble ou adaptateur défectueux.", ic:UNIVERS[4].ic},
    {t:"Écouteurs / audio", d:"Son faible, micro ou connectique audio à vérifier.", ic:CLASSIC[5].ic},
    {t:"Petits connecteurs", d:"USB, nappe, bouton ou connectique accessoire.", ic:CLASSIC[2].ic},
  ]},
  {slug:"micro-soudure", title:"Micro-soudure", headline:"Réparations carte mère.", text:"Pour les pannes plus profondes : court-circuit, charge, données, pistes et composants.", items:[
    {t:"Court-circuit", d:"Diagnostic au microscope et réparation au composant près.", ic:<><path d="M13 2L6 13h6l-1 9 7-12h-6z"/></>},
    {t:"Charge carte mère", d:"Circuit de charge, composant ou connecteur à reprendre.", ic:CLASSIC[2].ic},
    {t:"Récupération données", d:"Photos et fichiers récupérables quand c'est possible.", ic:<><rect x="5" y="5" width="14" height="14" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/></>},
    {t:"Reprise de pistes", d:"Pistes coupées ou arrachées reconstruites proprement.", ic:UNIVERS[5].ic},
    {t:"Lecteur SIM / réseau", d:"SIM non détectée, WiFi ou réseau instable.", ic:<><path d="M5 12a10 10 0 0 1 14 0M8 15a6 6 0 0 1 8 0M11 18a2 2 0 0 1 2 0"/></>},
    {t:"Désoxydation avancée", d:"Nettoyage et reprise des composants oxydés.", ic:CLASSIC[7].ic},
  ]},
];

function RepairCard({item, compact=false}){
  return (
    <div className="bmc-card" style={{padding:compact?'18px 16px':'24px 22px',boxShadow:'var(--shadow-sm)'}}>
      <div style={{width:compact?40:44,height:compact?40:44,borderRadius:12,background:'var(--steel-tint)',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <Ico size={compact?20:22} d={item.ic} stroke="var(--steel-deep)"/>
      </div>
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:compact?15.5:17,marginTop:compact?13:16}}>{item.t}</div>
      <p style={{fontSize:compact?13.2:14,color:'var(--slate)',marginTop:6,lineHeight:1.55}}>{item.d}</p>
    </div>
  );
}

function ServicesDesktop({focus}){
  React.useEffect(()=>{
    if (focus) {
      requestAnimationFrame(()=>document.getElementById(`${focus}-reparations`)?.scrollIntoView({behavior:"smooth",block:"start"}));
    }
  },[focus]);
  return (
    <div className="bmc">
      <Nav active="Nos services"/>
      <section style={{padding:'78px 56px 66px',background:'#fff'}}>
        <span className="bmc-eyebrow">Réparation sans rendez-vous</span>
        <h1 style={{fontSize:64,lineHeight:1.02,marginTop:18,maxWidth:880}}>
          Réparez votre appareil vite, sans mauvaise surprise.
        </h1>
        <p style={{fontSize:18,color:'var(--slate)',marginTop:22,maxWidth:680,lineHeight:1.65}}>
          Écran cassé, batterie faible, téléphone qui ne charge plus, caméra ou son :
          passez à l'atelier sans rendez-vous. Réparation possible dès 40 minutes selon la panne,
          devis gratuit et prix parmi les plus bas de la région.
        </p>
        <div style={{display:'flex',gap:14,marginTop:30}}>
          <a className="bmc-btn bmc-btn--primary" href="#/contact">Demander un devis gratuit</a>
          <a className="bmc-btn bmc-btn--ghost" href="#/services/smartphone">Voir les réparations →</a>
        </div>
        <FloatingBubbles
          items={["Sans rendez-vous","Dès 40 min","Prix clair","Prix bas région","Devis gratuit"]}
          style={{marginTop:24,maxWidth:720}}
        />
      </section>
      <section style={{padding:'0 56px 42px'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
          {[
            ["Sans rendez-vous","Venez directement au magasin."],
            ["Dès 40 minutes","Pour les réparations courantes selon modèle et stock."],
            ["Devis gratuit","On annonce le prix avant de toucher l'appareil."],
            ["Prix clair","Une réparation utile, au juste prix."],
          ].map(([k,v])=>(
            <div key={k} className="bmc-card" style={{padding:'22px 24px',boxShadow:'var(--shadow-sm)'}}>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:20}}>{k}</div>
              <p style={{fontSize:14,color:'var(--slate)',marginTop:6,lineHeight:1.5}}>{v}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{padding:'0 56px 76px'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',border:'1px solid var(--line)',borderRadius:'var(--r-lg)',overflow:'hidden',boxShadow:'var(--shadow-sm)'}}>
          {SERVICE_CATS.map((cat,i)=>(
            <a key={cat.t} href={cat.href} style={{padding:'30px 22px',borderRight:i<5?'1px solid var(--line)':'none',textDecoration:'none',color:'inherit',background:'#fff'}}>
              <Ico size={26} stroke="var(--steel)" d={cat.ic}/>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:16.5,marginTop:18}}>{cat.t}</div>
              <div style={{fontSize:13,color:'var(--slate-2)',marginTop:5,lineHeight:1.45}}>{cat.d}</div>
            </a>
          ))}
        </div>
      </section>

      {REPAIR_GROUPS.map((group,i)=>(
        <section key={group.slug} id={`${group.slug}-reparations`} style={{background:i%2===0?'var(--bg)':'#fff',padding:'76px 56px',borderTop:'1px solid var(--line)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',gap:30,marginBottom:34}}>
            <div>
              <span className="bmc-eyebrow">{group.title}</span>
              <h2 style={{fontSize:44,lineHeight:1.08,marginTop:16}}>{group.headline}</h2>
              <p style={{fontSize:17,color:'var(--slate)',marginTop:14,maxWidth:650,lineHeight:1.6}}>{group.text}</p>
              <FloatingBubbles items={["Diagnostic gratuit","Prix annoncé avant","Réparation rapide"]} style={{marginTop:18}}/>
            </div>
            <a className="bmc-btn bmc-btn--primary" href="#/contact">Devis gratuit</a>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
            {group.items.map(r=><RepairCard key={r.t} item={r}/>)}
          </div>
        </section>
      ))}
      <VisitBand/>
      <Footer/>
    </div>
  );
}

function ServicesMobile({focus}){
  React.useEffect(()=>{
    if (focus) {
      requestAnimationFrame(()=>document.getElementById(`m-${focus}-reparations`)?.scrollIntoView({behavior:"smooth",block:"start"}));
    }
  },[focus]);
  return (
    <div className="bmc">
      <NavMobile/>
      <div style={{padding:'34px 20px'}}>
        <span className="bmc-eyebrow">Réparation sans rendez-vous</span>
        <h1 style={{fontSize:34,lineHeight:1.06,marginTop:14}}>Réparez votre appareil vite.</h1>
        <p style={{fontSize:15.5,color:'var(--slate)',marginTop:14,lineHeight:1.6}}>
          Écran, batterie, charge, caméra, son : devis gratuit, prix clair,
          réparation possible dès 40 minutes selon la panne.
        </p>
        <FloatingBubbles items={["Sans RDV","Dès 40 min","Prix clair"]} style={{marginTop:16}}/>
        <a className="bmc-btn bmc-btn--primary" style={{marginTop:20,width:'100%'}} href="#/contact">Devis gratuit</a>
      </div>
      <div style={{padding:'0 20px 24px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        {["Sans RDV","Dès 40 min","Devis gratuit","Prix clair"].map(k=>(
          <div key={k} className="bmc-card" style={{padding:'16px 14px',fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:15,textAlign:'center'}}>{k}</div>
        ))}
      </div>
      <div style={{padding:'0 20px 34px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        {SERVICE_CATS.map(cat=>(
          <a key={cat.t} href={cat.href} className="bmc-card" style={{padding:'18px 16px',textDecoration:'none',color:'inherit'}}>
            <Ico size={22} stroke="var(--steel)" d={cat.ic}/>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:15,marginTop:12}}>{cat.t}</div>
            <div style={{fontSize:12,color:'var(--slate-2)',marginTop:3,lineHeight:1.4}}>{cat.d}</div>
          </a>
        ))}
      </div>
      {REPAIR_GROUPS.map((group,i)=>(
        <div key={group.slug} id={`m-${group.slug}-reparations`} style={{background:i%2===0?'var(--bg)':'#fff',padding:'34px 20px',borderTop:'1px solid var(--line)'}}>
          <MSectionHead eyebrow={group.title} title={group.headline}/>
          <p style={{fontSize:14.5,color:'var(--slate)',lineHeight:1.6,marginTop:-8,marginBottom:18}}>{group.text}</p>
          <FloatingBubbles items={["Devis gratuit","Prix clair","Rapide"]} style={{marginBottom:18}}/>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {group.items.map(r=><RepairCard key={r.t} item={r} compact/>)}
          </div>
        </div>
      ))}
      <MFooter/>
    </div>
  );
}

Object.assign(window,{ServicesDesktop,ServicesMobile,SERVICE_CATS,SMARTPHONE_REPAIRS,REPAIR_GROUPS});
