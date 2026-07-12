/* Atelier Démo — parcours client propulsé par Behar Tech Pro. */

function BeharWidgetFrame({mobile=false}){
  const publicId = window.BEHAR_WIDGET_PUBLIC_ID;
  const ready = publicId && !publicId.startsWith("__");
  if (!ready) {
    return (
      <div className="bmc-card" style={{padding:mobile?'28px 20px':'48px',textAlign:'center',boxShadow:'var(--shadow)'}}>
        <ChipMark size={44}/>
        <h2 style={{fontSize:mobile?24:30,marginTop:18}}>Widget en cours d’activation</h2>
        <p style={{color:'var(--slate)',marginTop:10,lineHeight:1.6}}>La démonstration sera disponible après la publication du widget.</p>
      </div>
    );
  }
  return (
    <iframe
      title="Widget client Behar Tech Pro"
      src={`https://app.behartechpro.fr/widget/${encodeURIComponent(publicId)}/`}
      style={{width:'100%',height:mobile?760:820,border:'1px solid var(--line)',borderRadius:mobile?16:24,background:'#fff',boxShadow:'var(--shadow)'}}
      loading="eager"
      referrerPolicy="strict-origin-when-cross-origin"
      sandbox="allow-forms allow-scripts allow-same-origin"
    />
  );
}

function ContactInfoCard(){
  return (
    <div className="bmc-card" style={{padding:'26px',boxShadow:'var(--shadow-sm)'}}>
      <strong style={{display:'block',fontSize:18}}>Site de démonstration</strong>
      <p style={{color:'var(--slate)',fontSize:14,marginTop:8,lineHeight:1.6}}>
        Aucun nom, numéro, e-mail ou adresse d’un atelier réel n’est affiché sur cette page.
      </p>
    </div>
  );
}

function ContactDesktop(){
  return (
    <div className="bmc">
      <Nav active="Contact"/>
      <section style={{background:'var(--bg)',padding:'74px 56px 52px',borderBottom:'1px solid var(--line)',textAlign:'center'}}>
        <span className="bmc-eyebrow">Widget client</span>
        <h1 style={{fontSize:58,lineHeight:1.04,margin:'18px auto 0',fontWeight:700,maxWidth:820}}>Testez une demande comme votre client.</h1>
        <p style={{fontSize:18,color:'var(--slate)',margin:'18px auto 0',maxWidth:700,lineHeight:1.65}}>
          Ce parcours utilise uniquement des données fictives. Aucune demande réelle n’est enregistrée dans le SaaS.
        </p>
      </section>
      <section id="widget-demo" style={{padding:'46px 56px 76px',maxWidth:980,margin:'0 auto'}}>
        <BeharWidgetFrame/>
      </section>
      <Footer/>
    </div>
  );
}

function ContactMobile(){
  return (
    <div className="bmc">
      <NavMobile/>
      <section style={{background:'var(--bg)',padding:'40px 20px 30px',textAlign:'center'}}>
        <span className="bmc-eyebrow">Widget client</span>
        <h1 style={{fontSize:36,lineHeight:1.05,marginTop:12,fontWeight:700}}>Testez votre demande.</h1>
        <p style={{fontSize:15,color:'var(--slate)',marginTop:12,lineHeight:1.6}}>Une démonstration sans coordonnées d’un atelier réel.</p>
      </section>
      <section style={{padding:'20px 14px 40px'}}><BeharWidgetFrame mobile/></section>
      <MFooter/>
    </div>
  );
}

Object.assign(window,{ContactDesktop,ContactMobile,ContactInfoCard,BeharWidgetFrame});
