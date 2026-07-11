/* ===========================================================
   ATELIER DÉMO — Contact Pro (sous-traitance B2B) — desktop
   =========================================================== */

const PRO_BENEFITS=[
  {t:"Envoi postal — France entière",d:"Où que vous soyez, expédiez vos cartes : on traite et on renvoie.",
    ic:<><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 8l10 6 10-6"/></>},
  {t:"Devis sous 24-48h",d:"Diagnostic rapide, réponse chiffrée claire en un à deux jours ouvrés.",
    ic:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></>},
  {t:"Confidentialité & marque blanche",d:"On reste invisible. Vos clients restent vos clients.",
    ic:<><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9.5 12l1.8 1.8L15 10"/></>},
  {t:"Délai de retour rapide",d:"Vos dossiers traités en priorité pour ne pas bloquer votre atelier.",
    ic:<><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/></>},
  {t:"Tarifs revendeur dédiés",d:"Une grille pro adaptée au volume, pensée pour votre marge.",
    ic:<><path d="M3 7h13l-1.5 9H4.5z"/><path d="M3 7L2 3"/><circle cx="7" cy="20" r="1.4"/><circle cx="14" cy="20" r="1.4"/></>},
  {t:"Suivi de dossier",d:"Un interlocuteur, un statut clair, de la réception au renvoi.",
    ic:<><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>},
];

const PRO_FLOW=[
  {n:"01",t:"Vous expédiez",d:"Carte ou appareil, emballé. Étiquette et adresse fournies."},
  {n:"02",t:"On diagnostique",d:"Examen microscope, retour sous 24-48h avec devis."},
  {n:"03",t:"Réparation",d:"Reprise micro-soudure après votre validation."},
  {n:"04",t:"Retour rapide",d:"Renvoi testé et garanti, en marque blanche."},
];

function Field({label,ph,wide,type="text",name}){
  const fieldName = name || label.toLowerCase().replaceAll(" ","-").replaceAll("/","-");
  const common = {
    name: fieldName,
    placeholder: ph,
    style: {
      width:'100%',height:'100%',border:'none',outline:'none',background:'transparent',
      fontFamily:"'Inter',sans-serif",fontSize:14.5,color:'var(--ink)',resize:'none'
    }
  };
  return (
    <label style={{display:'flex',flexDirection:'column',gap:8,gridColumn:wide?'1 / -1':'auto'}}>
      <span style={{fontSize:13,fontWeight:600,color:'var(--ink)',fontFamily:"'Space Grotesk',sans-serif"}}>{label}</span>
      <div style={{height:type==="area"?108:48,border:'1px solid var(--line-2)',borderRadius:10,background:'#fff',display:'flex',alignItems:type==="area"?'flex-start':'center',padding:type==="area"?'12px 14px':'0 14px',fontSize:14.5,color:'var(--slate-2)'}}>
        {type==="area" ? <textarea {...common}/> : <input type={type==="email"?"email":type==="tel"?"tel":"text"} {...common}/>}
      </div>
    </label>
  );
}

function ProHero(){
  return (
    <div style={{background:'#fff',color:'var(--ink)',position:'relative',overflow:'hidden',minHeight:620}}>
      <Nav active="Contact Pro"/>
      <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(14,28,43,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(14,28,43,.04) 1px,transparent 1px)',backgroundSize:'56px 56px',maskImage:'radial-gradient(80% 90% at 30% 30%,#000,transparent)'}}/>
      <div className="bmc-rise" style={{position:'relative',padding:'88px 56px 92px',width:'100%',minHeight:540,display:'flex',flexDirection:'column',justifyContent:'center'}}>
        <h1 style={{fontSize:64,lineHeight:1.02,marginTop:22,fontWeight:700,maxWidth:780}}>
          Confiez-nous la micro-soudure que vous ne faites pas.
        </h1>
        <p style={{fontSize:19,color:'var(--slate)',marginTop:22,maxWidth:680,lineHeight:1.65}}>
          Atelier Démo devient votre atelier de micro-soudure en sous-traitance : vous récupérez
          des réparations « impossibles », sans investir en matériel ni en formation. Discret,
          rapide, en marque blanche.
        </p>
        <div style={{display:'flex',gap:14,marginTop:28}}>
          <a className="bmc-btn bmc-btn--steel" href="#contact-pro-form">Demander un devis</a>
          <a className="bmc-btn" href="#/contact" target="_blank" rel="noreferrer" style={{background:'#25D366',color:'#fff',boxShadow:'0 16px 34px rgba(37,211,102,.24)'}}><WidgetLinkIcon size={19}/> Widget client</a>
          <a className="bmc-btn bmc-btn--ghost" href="#">Demande en ligne</a>
        </div>
      </div>
    </div>
  );
}

function ProBenefits(){
  return (
    <section style={{padding:'74px 56px'}}>
      <div style={{maxWidth:600,marginBottom:40}}>
        <span className="bmc-eyebrow">Pourquoi sous-traiter chez nous</span>
        <h2 style={{fontSize:38,marginTop:16,lineHeight:1.1}}>Un partenaire technique, pas un concurrent.</h2>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
        {PRO_BENEFITS.map(b=>(
          <div key={b.t} className="bmc-card" style={{padding:'26px 24px',boxShadow:'var(--shadow-sm)'}}>
            <div style={{width:46,height:46,borderRadius:12,background:'var(--steel-tint)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Ico size={22} d={b.ic} stroke="var(--steel-deep)"/>
            </div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:17,marginTop:18}}>{b.t}</div>
            <p style={{fontSize:14.5,color:'var(--slate)',marginTop:8,lineHeight:1.6}}>{b.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProFlow(){
  return (
    <section style={{background:'var(--bg)',padding:'70px 56px',borderTop:'1px solid var(--line)',borderBottom:'1px solid var(--line)'}}>
      <span className="bmc-eyebrow">Le circuit, de bout en bout</span>
      <h2 style={{fontSize:34,marginTop:14,marginBottom:38}}>Quatre étapes, aucune friction.</h2>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:18}}>
        {PRO_FLOW.map((s,i)=>(
          <div key={s.n} style={{position:'relative'}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <span style={{width:38,height:38,borderRadius:'50%',background:'var(--ink)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:14}}>{s.n}</span>
              {i<3 && <span style={{flex:1,height:1,background:'var(--line-2)'}}/>}
            </div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:18,marginTop:16}}>{s.t}</div>
            <p style={{fontSize:14,color:'var(--slate)',marginTop:7,lineHeight:1.55}}>{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProForm(){
  return (
    <section id="contact-pro-form" style={{padding:'78px 56px'}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1.25fr',gap:56,alignItems:'start'}}>
        <div>
          <span className="bmc-eyebrow">Demande de sous-traitance</span>
          <h2 style={{fontSize:36,marginTop:16,lineHeight:1.12}}>Parlons de votre volume.</h2>
          <p style={{fontSize:16.5,color:'var(--slate)',marginTop:18,lineHeight:1.65,maxWidth:380}}>
            Dites-nous qui vous êtes et ce que vous rencontrez le plus souvent.
            On revient vers vous sous 24-48h avec une grille tarifaire dédiée.
          </p>
          <div style={{display:'flex',flexDirection:'column',gap:16,marginTop:32}}>
            <InfoRow ic={<><path d="M4 5c0 9 6 15 15 15a2 2 0 0 0 2-2v-2.4a1 1 0 0 0-.8-1l-3.4-.7a1 1 0 0 0-1 .5l-.8 1.4A12 12 0 0 1 8.7 9l1.4-.8a1 1 0 0 0 .5-1L9.9 3.8A1 1 0 0 0 8.9 3H6.5A2 2 0 0 0 4 5z"/></>} k="Ligne directe pro" v="Demande en ligne"/>
            <WidgetContactLink/>
            <InfoRow ic={<><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.6"/></>} k="Dépôt / atelier" v="Coordonnées non publiées"/>
          </div>
        </div>
        <form className="bmc-card" style={{padding:'34px 34px',boxShadow:'var(--shadow)'}} onSubmit={BMCSubmitForm}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
            <Field label="Société / enseigne" ph="Ex. Atelier Réparation Lyon"/>
            <Field label="Interlocuteur" ph="Nom et prénom"/>
            <Field label="E-mail pro" ph="vous@entreprise.fr" type="email"/>
            <Field label="Téléphone" ph="06 00 00 00 00" type="tel"/>
            <Field label="Type d'appareils" ph="Smartphones, consoles…"/>
            <Field label="Volume estimé / mois" ph="Ex. 10 à 20 cartes"/>
            <Field label="Décrivez les pannes que vous sous-traitez" ph="Court-circuit, charge, désoxydation, données…" type="area" wide/>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:14,marginTop:24,justifyContent:'space-between'}}>
            <span style={{fontSize:12.5,color:'var(--slate-2)',maxWidth:280,lineHeight:1.5}}>Vos données restent confidentielles. Aucune sollicitation commerciale.</span>
            <button className="bmc-btn bmc-btn--primary" style={{border:'none'}} type="submit">Envoyer ma demande →</button>
          </div>
        </form>
      </div>
    </section>
  );
}

function ContactProDesktop(){
  return (
    <div className="bmc">
      <ProHero/>
      <ProBenefits/>
      <ProFlow/>
      <ProForm/>
      <Footer/>
    </div>
  );
}

Object.assign(window,{ContactProDesktop,PRO_BENEFITS,PRO_FLOW,Field,ProHero,ProBenefits,ProFlow,ProForm});
