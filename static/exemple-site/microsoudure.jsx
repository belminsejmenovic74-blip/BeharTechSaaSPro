/* ===========================================================
   ATELIER DÉMO — Micro-soudure (PAGE PHARE) — desktop
   =========================================================== */

const FAULTS = [
  {t:"Ne charge plus", d:"Reprise du circuit de charge et du connecteur dessoudé.",
    ic:<><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/></>},
  {t:"Court-circuit", d:"Après chute ou mauvaise manipulation : on isole et on répare la piste.",
    ic:<><path d="M3 12h4l2-6 4 12 2-6h6"/></>},
  {t:"Désoxydation", d:"Dégât des eaux : nettoyage, traitement et reprise des composants oxydés.",
    ic:<><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/></>},
  {t:"Récupération de données", d:"Carte mère HS : on récupère vos photos et contacts quand c'est possible.",
    ic:<><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 9h16M8 13h5"/></>},
  {t:"Lecteur de carte SIM", d:"Réseau qui saute, SIM non détectée : reprise du lecteur en micro-soudure.",
    ic:<><path d="M6 3h8l4 4v14H6z"/><rect x="9" y="12" width="6" height="5" rx="1"/></>},
  {t:"Puce WiFi / réseau", d:"Plus de WiFi, plus de réseau : diagnostic et reprise de la puce concernée.",
    ic:<><path d="M2 8.5a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8 15.5a6 6 0 0 1 8 0"/><circle cx="12" cy="19" r="1"/></>},
  {t:"Port HDMI console", d:"Switch, PS, Xbox : port arraché ou plus d'image, ressoudé proprement.",
    ic:<><rect x="3" y="9" width="18" height="6" rx="1.5"/><path d="M7 9V7h10v2M8 15v1M16 15v1"/></>},
  {t:"Rétroéclairage écran", d:"Image noire mais tactile vivant : reprise du circuit de rétroéclairage.",
    ic:<><rect x="3" y="4" width="18" height="13" rx="1.5"/><path d="M8 21h8M12 17v4"/><circle cx="12" cy="10.5" r="2"/></>},
  {t:"Reprise carte mère", d:"Pistes coupées, composants arrachés : reconstruction au composant près.",
    ic:<><rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></>},
];

const MSTEPS=[
  {n:"01",t:"Diagnostic au microscope",d:"On localise précisément le composant ou la piste en cause. Gratuit, sans engagement."},
  {n:"02",t:"Devis clair",d:"Vous savez ce qui sera fait et combien, avant qu'on touche à quoi que ce soit."},
  {n:"03",t:"Reprise de précision",d:"Dessoudage à air chaud, reprise des pistes, remplacement du composant."},
  {n:"04",t:"Test & restitution",d:"L'appareil est testé sous toutes ses fonctions puis restitué, garanti."},
];

function MicroHero(){
  return (
    <div style={{background:'#fff',color:'var(--ink)',position:'relative',overflow:'hidden'}}>
      <Nav active="Micro-soudure"/>
      <div style={{position:'relative',display:'grid',gridTemplateColumns:'1.05fr .95fr',gap:30,alignItems:'center',padding:'58px 56px 64px'}}>
        <div className="bmc-rise">
          <span className="bmc-eyebrow">Page phare · notre savoir-faire</span>
          <h1 style={{fontSize:58,lineHeight:1.02,marginTop:20,fontWeight:700}}>
            La micro-soudure,<br/>notre vraie force.
          </h1>
          <p style={{fontSize:18,color:'var(--slate)',maxWidth:460,marginTop:22,lineHeight:1.6}}>
            Réparer une carte mère ne s'improvise pas. Microscope, station à air chaud,
            reprise de pistes au dixième de millimètre — on intervient là où le simple
            remplacement de pièce ne suffit plus.
          </p>
          <div style={{display:'flex',gap:14,marginTop:32}}>
            <a className="bmc-btn bmc-btn--primary" href="#">Diagnostic &amp; devis gratuit</a>
            <a className="bmc-btn bmc-btn--ghost" href="#">Vous êtes Pro ? →</a>
          </div>
        </div>
        <div style={{position:'relative'}}>
          <div className="bmc-glow" style={{position:'absolute',inset:'-4% -2%',background:'radial-gradient(58% 58% at 58% 42%,var(--steel-tint),transparent 70%)'}}/>
          <img src={BOARD} alt="Carte mère iPhone A13" className="bmc-float-slow" style={{position:'relative',width:'112%',marginRight:'-12%',display:'block',filter:'drop-shadow(0 36px 60px rgba(14,28,43,.22))'}}/>
          <div className="bmc-scanwrap"><span className="bmc-scanline"/></div>
          <span className="bmc-solder" style={{left:'50%',top:'40%'}}/>
          <span className="bmc-solder" style={{left:'70%',top:'58%',animationDelay:'1.3s'}}/>
          <div style={{position:'absolute',left:'6%',top:'16%',background:'#fff',border:'1px solid var(--line)',borderRadius:12,padding:'9px 13px',fontSize:12.5,fontWeight:500,color:'var(--ink)',boxShadow:'var(--shadow)'}}>
            <span style={{color:'var(--steel)',fontWeight:700}}>‹ 0,1 mm</span> · précision de reprise
          </div>
        </div>
      </div>
    </div>
  );
}

function FaultsGrid(){
  return (
    <section style={{padding:'78px 56px'}}>
      <div style={{maxWidth:620,marginBottom:42}}>
        <span className="bmc-eyebrow">Ce qu'on répare en micro-soudure</span>
        <h2 style={{fontSize:40,lineHeight:1.1,marginTop:18}}>Si c'est sur la carte mère, c'est notre terrain.</h2>
        <p style={{fontSize:17,color:'var(--slate)',marginTop:16,lineHeight:1.6}}>
          Toutes pannes, tous appareils. Voici les cas qu'on traite le plus souvent — la liste n'est pas exhaustive, demandez-nous.
        </p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
        {FAULTS.map(f=>(
          <div key={f.t} className="bmc-card" style={{padding:'26px 24px',boxShadow:'var(--shadow-sm)'}}>
            <div style={{width:46,height:46,borderRadius:12,background:'var(--steel-tint)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Ico size={23} d={f.ic} stroke="var(--steel-deep)"/>
            </div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:18,marginTop:18}}>{f.t}</div>
            <p style={{fontSize:14.5,color:'var(--slate)',marginTop:8,lineHeight:1.6}}>{f.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function MicroProcess(){
  return (
    <section style={{background:'var(--ink)',color:'#fff',padding:'78px 56px'}}>
      <div style={{display:'grid',gridTemplateColumns:'.9fr 1.1fr',gap:54,alignItems:'center'}}>
        <div>
          <span className="bmc-eyebrow" style={{color:'var(--silver)'}}>Le process</span>
          <h2 style={{fontSize:38,color:'#fff',marginTop:16,lineHeight:1.12}}>Méthodique, sous microscope, sans approximation.</h2>
          <div style={{display:'flex',flexDirection:'column',gap:4,marginTop:30}}>
            {MSTEPS.map((s,i)=>(
              <div key={s.n} style={{display:'flex',gap:20,padding:'18px 0',borderTop:'1px solid rgba(255,255,255,.12)'}}>
                <span style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:15,color:'var(--logo-blue)',flex:'0 0 auto',width:28}}>{s.n}</span>
                <div>
                  <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:18,color:'#fff'}}>{s.t}</div>
                  <p style={{fontSize:14.5,color:'rgba(255,255,255,.6)',marginTop:5,lineHeight:1.55}}>{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{
          height:460,width:'100%',borderRadius:'var(--r-lg)',overflow:'hidden',
          border:'1px solid rgba(255,255,255,.08)',
          background:'linear-gradient(135deg,rgba(255,255,255,.06),rgba(255,255,255,.015))',
          display:'flex',alignItems:'center',justifyContent:'center',position:'relative'
        }}>
          <div className="bmc-scanwrap"><span className="bmc-scanline"/></div>
          <img
            src="assets/carte-mere-a13.png"
            alt="Carte mère iPhone A13"
            className="bmc-float-slow"
            style={{width:'86%',display:'block',filter:'drop-shadow(0 34px 54px rgba(0,0,0,.45))'}}
          />
        </div>
      </div>
    </section>
  );
}

function MicroEquip(){
  const items=[
    {k:"Microscope",v:"Inspection composant par composant, jusqu'à la piste."},
    {k:"Station air chaud",v:"Dessoudage et reprise contrôlés en température."},
    {k:"Reprise de pistes",v:"Reconstruction des liaisons coupées sur la carte."},
    {k:"Tout appareil",v:"Smartphone, tablette, console, ordinateur, accessoires."},
  ];
  return (
    <section style={{padding:'70px 56px'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:0,border:'1px solid var(--line)',borderRadius:'var(--r-lg)',overflow:'hidden',background:'#fff'}}>
        {items.map((it,i)=>(
          <div key={it.k} style={{padding:'30px 26px',borderRight:i<3?'1px solid var(--line)':'none'}}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:19}}>{it.k}</div>
            <p style={{fontSize:14,color:'var(--slate)',marginTop:9,lineHeight:1.55}}>{it.v}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function MicroProof(){
  return (
    <section style={{background:'var(--bg)',padding:'74px 56px',borderTop:'1px solid var(--line)'}}>
      <div style={{display:'grid',gridTemplateColumns:'1.1fr .9fr',gap:48,alignItems:'center'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          {[[AVANT,'AVANT','rgba(14,28,43,.86)'],[APRES,'APRÈS','var(--steel)']].map(([img,lab,bg])=>(
            <div key={lab} style={{position:'relative'}}>
              <img src={img} style={{width:'100%',height:320,objectFit:'cover',borderRadius:16,border:'1px solid var(--line)'}}/>
              <span style={{position:'absolute',top:12,left:12,background:bg,color:'#fff',fontSize:11,fontWeight:600,letterSpacing:'.14em',padding:'6px 11px',borderRadius:999,fontFamily:"'Space Grotesk',sans-serif"}}>{lab}</span>
            </div>
          ))}
        </div>
        <div>
          <span className="bmc-eyebrow">Résultat</span>
          <h2 style={{fontSize:36,lineHeight:1.1,marginTop:16}}>Déclaré perdu ailleurs. Reparti d'ici.</h2>
          <p style={{fontSize:17,color:'var(--slate)',marginTop:18,maxWidth:420,lineHeight:1.65}}>
            La micro-soudure, c'est ce qui transforme un “irréparable” en appareil qui rallume.
            Apportez le vôtre — on regarde, on diagnostique, on vous dit la vérité.
          </p>
          <div style={{marginTop:24}}><GoogleRating/></div>
          <a className="bmc-btn bmc-btn--primary" style={{marginTop:24}} href="#">Demander un devis gratuit</a>
        </div>
      </div>
    </section>
  );
}

function MicroDesktop(){
  return (
    <div className="bmc">
      <MicroHero/>
      <FaultsGrid/>
      <MicroProcess/>
      <MicroEquip/>
      <MicroProof/>
      <ProTeaser/>
      <Footer/>
    </div>
  );
}

Object.assign(window,{MicroDesktop,FAULTS,MSTEPS,MicroHero,FaultsGrid,MicroProcess,MicroEquip,MicroProof});
