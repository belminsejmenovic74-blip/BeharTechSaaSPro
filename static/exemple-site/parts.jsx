/* ===========================================================
   ATELIER DÉMO — composants partagés
   =========================================================== */

/* --- Glyphe "chip" : carte/puce stylisée (formes simples) --- */
function ChipMark({size=34, tone="ink"}){
  const body = tone==="light" ? "#fff" : "var(--ink)";
  const die  = "var(--logo-blue)";
  const pin  = tone==="light" ? "rgba(255,255,255,.85)" : "var(--ink)";
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true" style={{display:'block',flex:'0 0 auto'}}>
      {/* pins */}
      {[10,20,30].map(x=>(<rect key={'t'+x} x={x-1.1} y="2" width="2.2" height="5" rx="1" fill={pin}/>))}
      {[10,20,30].map(x=>(<rect key={'b'+x} x={x-1.1} y="33" width="2.2" height="5" rx="1" fill={pin}/>))}
      {[10,20,30].map(y=>(<rect key={'l'+y} x="2" y={y-1.1} width="5" height="2.2" rx="1" fill={pin}/>))}
      {[10,20,30].map(y=>(<rect key={'r'+y} x="33" y={y-1.1} width="5" height="2.2" rx="1" fill={pin}/>))}
      {/* package */}
      <rect x="7" y="7" width="26" height="26" rx="6" fill={body}/>
      {/* die */}
      <rect x="14.5" y="14.5" width="11" height="11" rx="2.6" fill={die}/>
    </svg>
  );
}

function Logo({size=26, tone="ink"}){
  const color = tone==="light" ? "#fff" : "var(--ink)";
  return (
    <span aria-label="Atelier Démo" style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:size,fontWeight:800,letterSpacing:'-.04em',color}}>
      ATELIER <span style={{color:'var(--steel)'}}>DÉMO</span>
    </span>
  );
}

/* --- Étoiles Google (note seule, pas de commentaire) --- */
function Stars({value=4.8, size=18, gap=3}){
  const full = Math.floor(value);
  const frac = value - full;
  const star = (fill)=> (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{display:'block'}}>
      <defs>
        <linearGradient id={'g'+fill} x1="0" x2="1" y1="0" y2="0">
          <stop offset={`${fill*100}%`} stopColor="#F5A623"/>
          <stop offset={`${fill*100}%`} stopColor="#E2E6EA"/>
        </linearGradient>
      </defs>
      <path d="M12 2.2l2.95 5.98 6.6.96-4.77 4.65 1.13 6.57L12 17.98l-5.9 3.1 1.13-6.57L2.46 9.86l6.6-.96L12 2.2z"
        fill={`url(#g${fill})`}/>
    </svg>
  );
  return (
    <span className="bmc-stars" style={{gap}}>
      {[0,1,2,3,4].map(i=>{
        const fill = i<full?1:(i===full?frac:0);
        return <span key={i}>{star(fill)}</span>;
      })}
    </span>
  );
}

/* bloc avis google compact : étoiles + note (aucun texte d'avis) */
function GoogleRating({size=18, light=false, align='left'}){
  return (
    <div
      style={{display:'flex',alignItems:'center',gap:12,justifyContent:align==='center'?'center':'flex-start',textDecoration:'none'}}
    >
      <Stars value={4.8} size={size}/>
      <div style={{display:'flex',alignItems:'baseline',gap:6}}>
        <span style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:size*1.05,color:light?'#fff':'var(--ink)'}}>4,8</span>
        <span style={{fontSize:size*0.72,color:light?'rgba(255,255,255,.6)':'var(--slate-2)',fontWeight:500}}>/5</span>
      </div>
      <span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:size*0.7,color:light?'rgba(255,255,255,.62)':'var(--slate)',fontWeight:500,borderLeft:`1px solid ${light?'rgba(255,255,255,.18)':'var(--line)'}`,paddingLeft:12}}>
        Exemple d’avis
      </span>
    </div>
  );
}
function GoogleG({size=15}){
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{display:'block'}}>
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-2.8-.4-4H24v7.3h12.1c-.2 1.9-1.6 4.8-4.5 6.7l6.9 5.3c4.1-3.8 6.6-9.4 6.6-15.3z"/>
      <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.3c-1.9 1.3-4.4 2.2-7.6 2.2-5.8 0-10.7-3.9-12.5-9.2l-7.1 5.5C8 41.1 15.4 46 24 46z"/>
      <path fill="#FBBC05" d="M11.5 28.4c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4l-7.1-5.5C2.9 17 2 20.4 2 24s.9 7 2.4 9.9l7.1-5.5z"/>
      <path fill="#EA4335" d="M24 10.4c3.2 0 5.4 1.4 6.6 2.5l6.1-5.9C33 3.5 29 2 24 2 15.4 2 8 6.9 4.4 14.1l7.1 5.5C13.3 14.3 18.2 10.4 24 10.4z"/>
    </svg>
  );
}

/* petite icône trait (ligne/forme simple) */
function Ico({d, size=22, stroke="var(--steel)", sw=1.6}){
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      style={{display:'block'}}>
      {d}
    </svg>
  );
}
function WidgetLinkIcon({size=20}){
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{display:'block'}}>
      <path fill="#25D366" d="M12 2.5a9.3 9.3 0 0 0-8 14.1L3 21.5l5-1.2A9.3 9.3 0 1 0 12 2.5z"/>
      <path fill="#fff" d="M17.2 14.5c-.3-.2-1.7-.8-2-.9-.3-.1-.5-.2-.7.2-.2.3-.8.9-1 .9-.2.1-.4.1-.7-.1-.3-.2-1.2-.4-2.2-1.4-.8-.7-1.4-1.6-1.5-1.9-.2-.3 0-.5.1-.6l.5-.6c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2c-.2-.5-.5-.4-.7-.4h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.2.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1 0-.3-.1-.6-.2z"/>
    </svg>
  );
}
function WidgetContactLink({light=false, compact=false, style={}}){
  const color = light ? '#fff' : 'var(--ink)';
  const muted = light ? 'rgba(255,255,255,.7)' : 'var(--slate)';
  return (
    <a href="#/contact" onClick={(e)=>{e.preventDefault();BMCGo("#/contact");}} style={{display:'inline-flex',alignItems:'center',gap:10,textDecoration:'none',color,...style}}>
      <ChipMark size={compact?18:22}/>
      <span style={{display:'inline-flex',flexDirection:'column',gap:compact?1:2}}>
        <span style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:compact?13:15}}>Demande en ligne</span>
        <span style={{fontSize:compact?13:15,color:muted,fontWeight:600}}>Avec le Widget Behar Tech Pro</span>
      </span>
    </a>
  );
}

/* placeholder image */
function Ph({label, h=220, dark=false, style={}}){
  return (
    <div className={"bmc-ph"+(dark?" bmc-ph--dark":"")} style={{height:h,width:'100%',...style}}>
      <span>{label}</span>
    </div>
  );
}
function ExteriorPhoto({h=240, style={}}){
  return (
    <div
      style={{
        height:h,width:'100%',borderRadius:'var(--r-lg)',overflow:'hidden',
        display:'block',border:'1px solid var(--line)',boxShadow:'var(--shadow)',
        background:'#fff',...style
      }}
    >
      <div style={{width:'100%',height:'100%',display:'grid',placeItems:'center',padding:28,textAlign:'center',background:'linear-gradient(135deg,var(--bg),#fff)'}}>
        <div><ChipMark size={42}/><strong style={{display:'block',marginTop:16}}>Votre atelier ici</strong><span style={{display:'block',marginTop:6,color:'var(--slate)',fontSize:14}}>Identité, photos et coordonnées personnalisables.</span></div>
      </div>
    </div>
  );
}
function FloatingBubbles({items, tone="light", style={}}){
  const list = items || ["Sans rendez-vous","Dès 40 min","Devis gratuit","Prix clair"];
  return (
    <div style={{display:'flex',flexWrap:'wrap',gap:10,...style}}>
      {list.map((item,i)=>(
        <span
          key={item}
          className="bmc-float"
          style={{
            animationDelay:`${i*.28}s`,animationDuration:`${6+i*.55}s`,
            display:'inline-flex',alignItems:'center',gap:8,
            padding:'10px 14px',borderRadius:999,
            background:tone==="dark"?'rgba(255,255,255,.08)':'#fff',
            border:`1px solid ${tone==="dark"?'rgba(255,255,255,.14)':'var(--line)'}`,
            boxShadow:tone==="dark"?'none':'var(--shadow-sm)',
            color:tone==="dark"?'#fff':'var(--ink)',
            fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:13.5,
            whiteSpace:'nowrap'
          }}
        >
          <span className="bmc-dot"/>{item}
        </span>
      ))}
    </div>
  );
}

/* ====== NAV ====== */
const BMC_ROUTES = {
  "Accueil":"#/",
  "Nos services":"#/services",
  "Micro-soudure":"#/micro-soudure",
  "Contact Pro":"#/contact-pro",
  "Contact":"#/contact"
};

function BMCGo(href){
  if (window.BMCSetRoute) window.BMCSetRoute(href);
  else window.location.hash = href;
}

function Nav({active="Accueil", tone="light"}){
  const items=["Accueil","Nos services","Micro-soudure","Contact Pro","Contact"];
  const dark = tone==="dark";
  const txt = dark?'rgba(255,255,255,.78)':'var(--slate)';
  return (
    <header style={{
      position:'relative',zIndex:20,
      display:'flex',alignItems:'center',justifyContent:'space-between',
      padding:'20px 56px',
      borderBottom:`1px solid ${dark?'rgba(255,255,255,.10)':'var(--line)'}`,
      background:dark?'var(--ink)':'rgba(255,255,255,.92)',
    }}>
      <a href="#/" onClick={(e)=>{e.preventDefault();BMCGo("#/");}} style={{textDecoration:'none',display:'inline-flex'}}><Logo size={23} tone={dark?'light':'ink'}/></a>
      <nav style={{display:'flex',alignItems:'center',gap:30}}>
        {items.map(it=>(
          <a key={it} href={BMC_ROUTES[it]} onClick={(e)=>{e.preventDefault();BMCGo(BMC_ROUTES[it]);}} style={{
            fontFamily:"'Space Grotesk',sans-serif",fontWeight:active===it?600:500,fontSize:14.5,
            color:active===it?(dark?'#fff':'var(--ink)'):txt,position:'relative',textDecoration:'none',
          }}>
            {it}
            {it==="Micro-soudure" && active!==it &&
              <span style={{position:'absolute',top:-9,right:-12,width:5,height:5,borderRadius:'50%',background:'var(--steel)'}}/>}
            {active===it && <span style={{position:'absolute',left:0,right:0,bottom:-22,height:2,background:'var(--steel)'}}/>}
          </a>
        ))}
      </nav>
      <a className="bmc-btn bmc-btn--steel" style={{padding:'11px 20px',fontSize:14}} href="#/contact" onClick={(e)=>{e.preventDefault();BMCGo("#/contact");}}>
        Devis gratuit
      </a>
    </header>
  );
}

function NavMobile({tone="light"}){
  const dark=tone==="dark";
  const [open,setOpen] = React.useState(false);
  return (
    <header style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'space-between',
      padding:'16px 20px',borderBottom:`1px solid ${dark?'rgba(255,255,255,.10)':'var(--line)'}`,
      background:dark?'var(--ink)':'#fff',zIndex:20}}>
      <a href="#/" onClick={(e)=>{e.preventDefault();BMCGo("#/");}} style={{textDecoration:'none',display:'inline-flex'}}><Logo size={18} tone={dark?'light':'ink'}/></a>
      <button aria-label="Menu" aria-expanded={open} onClick={()=>setOpen(!open)}
        style={{border:0,background:'transparent',padding:6,display:'flex',flexDirection:'column',gap:4.5,cursor:'pointer'}}>
        {[0,1,2].map(i=><span key={i} style={{width:22,height:2,borderRadius:2,background:dark?'#fff':'var(--ink)'}}/>)}
      </button>
      {open && (
        <nav style={{position:'absolute',left:0,right:0,top:'100%',background:'#fff',borderBottom:'1px solid var(--line)',boxShadow:'var(--shadow)',padding:'10px 20px 18px',display:'flex',flexDirection:'column',gap:2}}>
          {["Accueil","Nos services","Micro-soudure","Contact Pro","Contact"].map(it=>(
            <a key={it} onClick={(e)=>{e.preventDefault();setOpen(false);BMCGo(BMC_ROUTES[it]);}} href={BMC_ROUTES[it]} style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:15,color:'var(--ink)',textDecoration:'none',padding:'12px 0',borderBottom:'1px solid var(--line)'}}>{it}</a>
          ))}
          <a onClick={(e)=>{e.preventDefault();setOpen(false);BMCGo("#/contact");}} className="bmc-btn bmc-btn--steel" style={{marginTop:12,width:'100%'}} href="#/contact">Devis gratuit</a>
        </nav>
      )}
    </header>
  );
}

/* ====== FOOTER ====== */
function Footer(){
  return (
    <footer style={{background:'var(--ink)',color:'#fff',padding:'56px 56px 30px'}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:40,flexWrap:'wrap',paddingBottom:38,borderBottom:'1px solid rgba(255,255,255,.10)'}}>
        <div style={{maxWidth:300}}>
          <Logo size={22} tone="light"/>
          <p style={{color:'rgba(255,255,255,.6)',fontSize:14,marginTop:16,lineHeight:1.6}}>
            Atelier de réparation high-tech &amp; micro-soudure dans votre ville. On répare ce que personne d'autre ne sait réparer.
          </p>
          <div style={{marginTop:18}}><GoogleRating size={15} light/></div>
        </div>
        <div style={{display:'flex',gap:56,flexWrap:'wrap'}}>
          <FootCol title="Services" items={["Smartphone","Tablette","Ordinateur","Console","Accessoires"]}/>
          <FootCol title="Atelier" items={["Micro-soudure","Contact Pro","Nos services","Devis gratuit"]}/>
          <div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:13,letterSpacing:'.04em',color:'rgba(255,255,255,.5)',textTransform:'uppercase',marginBottom:14}}>Atelier</div>
            <p style={{fontSize:14.5,lineHeight:1.85,color:'rgba(255,255,255,.82)'}}>
              Coordonnées non publiées<br/><br/>
              <span style={{color:'#fff',fontWeight:600}}>Demande en ligne</span><br/>
              <span style={{display:'inline-flex',marginTop:7}}><WidgetContactLink light compact/></span><br/>
              <span style={{color:'rgba(255,255,255,.6)'}}>Lun–Sam · 9h-12h / 14h-19h</span>
            </p>
          </div>
        </div>
      </div>
      <div style={{paddingTop:22,display:'flex',justifyContent:'space-between',fontSize:13,color:'rgba(255,255,255,.45)'}}>
        <span>© 2026 Atelier Démo — votre ville</span>
        <span>Mentions légales · Confidentialité</span>
      </div>
    </footer>
  );
}
function FootCol({title,items}){
  return (
    <div>
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:13,letterSpacing:'.04em',color:'rgba(255,255,255,.5)',textTransform:'uppercase',marginBottom:14}}>{title}</div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {items.map(i=><span key={i} style={{fontSize:14.5,color:'rgba(255,255,255,.82)'}}>{i}</span>)}
      </div>
    </div>
  );
}

Object.assign(window,{ChipMark,Logo,Stars,GoogleRating,GoogleG,Ico,WidgetLinkIcon,WidgetContactLink,Ph,ExteriorPhoto,FloatingBubbles,Nav,NavMobile,Footer,FootCol,BMC_ROUTES,BMCGo});
