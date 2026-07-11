/* ===========================================================
   ATELIER DÉMO — 3 variantes de héros (page d'accueil)
   =========================================================== */

const BOARD = "assets/carte-mere-a13.png";
const AVANT = "assets/avant-reparation.jpg";
const APRES = "assets/apres-reparation.jpg";

/* ---------- A · Éditorial atelier ---------- */
function HeroA(){
  return (
    <div className="bmc">
      <Nav active="Accueil"/>
      <div style={{display:'grid',gridTemplateColumns:'1.05fr .95fr',alignItems:'center',gap:30,padding:'62px 56px 70px'}}>
        <div className="bmc-rise">
          <span className="bmc-eyebrow">Réparation sans rendez-vous · votre ville</span>
          <h1 style={{fontSize:62,lineHeight:1.02,fontWeight:700,marginTop:22}}>
            Réparation téléphone<br/>rapide, claire,<br/>au bon prix.
          </h1>
          <p style={{fontSize:18,color:'var(--slate)',maxWidth:440,marginTop:24,lineHeight:1.6}}>
            Écran cassé, batterie, charge, caméra : passez directement à l'atelier.
            Diagnostic et devis gratuits, réparation possible dès 40 minutes selon la panne.
            Prix clairs, parmi les plus bas de la région.
          </p>
          <div style={{display:'flex',gap:14,marginTop:32}}>
            <a className="bmc-btn bmc-btn--primary" href="#">Devis gratuit maintenant</a>
            <a className="bmc-btn bmc-btn--ghost" href="#/services">Voir les réparations →</a>
          </div>
          <FloatingBubbles
            items={["Sans rendez-vous","Dès 40 min","Devis gratuit","Prix bas région"]}
            style={{marginTop:24,maxWidth:560}}
          />
          <div style={{marginTop:36}}><GoogleRating/></div>
        </div>
        <div style={{position:'relative'}}>
          <div className="bmc-glow" style={{position:'absolute',inset:'-6% -4%',background:'radial-gradient(60% 60% at 60% 40%, var(--steel-tint), transparent 70%)'}}/>
          <img src={BOARD} alt="Carte mère iPhone A13" className="bmc-float-slow" style={{position:'relative',width:'100%',display:'block',filter:'drop-shadow(0 30px 50px rgba(14,28,43,.18))'}}/>
          <span className="bmc-solder" style={{left:'46%',top:'40%'}}/>
          <div style={{position:'absolute',right:18,bottom:26,background:'#fff',border:'1px solid var(--line)',borderRadius:14,padding:'12px 16px',boxShadow:'var(--shadow)',display:'flex',alignItems:'center',gap:11}}>
            <span className="bmc-dot"/>
            <span style={{fontSize:13,fontWeight:600}}>Sans rendez-vous · dès 40 min</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- B · Preuve avant / après ---------- */
function HeroB(){
  return (
    <div className="bmc">
      <Nav active="Accueil"/>
      <div style={{padding:'48px 56px 58px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',gap:30,marginBottom:30}}>
          <div>
            <span className="bmc-eyebrow">La preuve, pas la promesse</span>
            <h1 style={{fontSize:54,lineHeight:1.04,fontWeight:700,marginTop:18,maxWidth:620}}>
              Détruit hier. Remis à neuf aujourd'hui.
            </h1>
          </div>
          <div style={{textAlign:'right',flex:'0 0 auto'}}>
            <p style={{fontSize:16,color:'var(--slate)',maxWidth:280,marginBottom:16,lineHeight:1.55}}>
              Smartphone, tablette, console, ordinateur — récupérés même quand le cas paraît perdu.
            </p>
            <a className="bmc-btn bmc-btn--primary" href="#">Devis gratuit</a>
          </div>
        </div>
        {/* diptyque avant / après */}
        <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',alignItems:'center',gap:0,background:'#fff',border:'1px solid var(--line)',borderRadius:24,overflow:'hidden',boxShadow:'var(--shadow)'}}>
          <BAcell img={AVANT} label="AVANT" sub="iPhone 13 Pro — écran &amp; châssis détruits" tone="avant"/>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:'0 6px',zIndex:2}}>
            <div style={{width:48,height:48,borderRadius:'50%',background:'var(--ink)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'var(--shadow)'}}>
              <Ico size={22} stroke="#fff" d={<><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></>}/>
            </div>
          </div>
          <BAcell img={APRES} label="APRÈS" sub="Fonctionnel, étanchéité refaite, comme neuf" tone="apres"/>
        </div>
        <div style={{display:'flex',justifyContent:'center',marginTop:26}}><GoogleRating/></div>
      </div>
    </div>
  );
}
function BAcell({img,label,sub,tone}){
  const isApres = tone==="apres";
  return (
    <div style={{position:'relative'}}>
      <img src={img} alt={label} style={{width:'100%',height:340,objectFit:'cover',display:'block'}}/>
      <div style={{position:'absolute',top:16,left:16,display:'inline-flex',alignItems:'center',gap:8,
        background:isApres?'var(--steel)':'rgba(14,28,43,.86)',color:'#fff',
        fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:12,letterSpacing:'.14em',
        padding:'7px 13px',borderRadius:999}}>{label}</div>
      <div style={{position:'absolute',left:0,right:0,bottom:0,padding:'34px 18px 16px',
        background:'linear-gradient(transparent,rgba(14,28,43,.78))',color:'#fff',fontSize:13.5,fontWeight:500}}
        dangerouslySetInnerHTML={{__html:sub}}/>
    </div>
  );
}

/* ---------- C · Fiche technique (fond blanc) ---------- */
function HeroC(){
  return (
    <div className="bmc" style={{background:'#fff',color:'var(--ink)'}}>
      <Nav active="Accueil"/>
      <div style={{position:'relative',padding:'56px 56px 0',overflow:'hidden'}}>
        {/* grille métallique fine, claire */}
        <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(14,28,43,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(14,28,43,.045) 1px,transparent 1px)',backgroundSize:'58px 58px',maskImage:'radial-gradient(80% 80% at 70% 30%,#000,transparent)'}}/>
        <div style={{position:'relative',display:'grid',gridTemplateColumns:'1.1fr .9fr',gap:30,alignItems:'center'}}>
          <div className="bmc-rise">
            <span className="bmc-eyebrow">Atelier micro-soudure · 01100</span>
            <h1 style={{fontSize:60,lineHeight:1.0,fontWeight:700,marginTop:20}}>
              La réparation<br/>au niveau du<br/><span style={{color:'var(--steel)'}}>composant.</span>
            </h1>
            <p style={{fontSize:17,color:'var(--slate)',maxWidth:430,marginTop:22,lineHeight:1.6}}>
              Du quotidien au cas désespéré : écran, batterie, et la micro-soudure quand le remplacement ne suffit plus.
            </p>
            <div style={{display:'flex',gap:14,marginTop:30}}>
              <a className="bmc-btn bmc-btn--primary" href="#">Devis gratuit</a>
              <a className="bmc-btn bmc-btn--ghost" href="#/contact-pro" onClick={(e)=>{e.preventDefault();BMCGo("#/contact-pro");}}>Sous-traitance</a>
            </div>
            <div style={{display:'flex',gap:0,marginTop:42,borderTop:'1px solid var(--line)',paddingTop:22}}>
              <SpecC k="4,8/5" v="Avis Google"/>
              <SpecC k="6 univers" v="Tél · tablette · PC · console"/>
              <SpecC k="Sur devis" v="Diagnostic gratuit"/>
            </div>
          </div>
          <div style={{position:'relative',alignSelf:'end'}}>
            <img src={BOARD} alt="Carte mère" className="bmc-float-slow" style={{width:'118%',marginRight:'-18%',display:'block',filter:'drop-shadow(0 30px 55px rgba(14,28,43,.20))'}}/>
            <span className="bmc-solder" style={{left:'52%',top:'42%'}}/>
          </div>
        </div>
      </div>
    </div>
  );
}
function SpecC({k,v}){
  return (
    <div style={{paddingRight:34,marginRight:34,borderRight:'1px solid var(--line)'}}>
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:24,color:'var(--ink)'}}>{k}</div>
      <div style={{fontSize:13,color:'var(--slate)',marginTop:4}}>{v}</div>
    </div>
  );
}

Object.assign(window,{HeroA,HeroB,HeroC,BOARD,AVANT,APRES});
