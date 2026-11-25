(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const districts={
    NET:{short:'Redes',building:'Centro de datos',color:0x60a5fa,h:5.2,x:-7,z:-7},
    WEB:{short:'Web',building:'Comercio digital',color:0xf59e0b,h:3.8,x:0,z:-7},
    AUTH:{short:'Accesos',building:'Banco de identidad',color:0xfb7185,h:4.5,x:7,z:-7},
    CRYPTO:{short:'Criptografía',building:'Bóveda digital',color:0xa78bfa,h:3.7,x:-7,z:0},
    SOC:{short:'Ingeniería social',building:'Telecomunicaciones',color:0x38bdf8,h:5.7,x:0,z:0},
    OSINT:{short:'OSINT',building:'Inteligencia',color:0xfbbf24,h:3.2,x:7,z:0},
    FORENSIC:{short:'Forense',building:'Investigación',color:0x94a3b8,h:3.9,x:-7,z:7},
    CTF:{short:'CTF final',building:'Empresa virtual',color:0xf97316,h:3.0,x:0,z:7},
    DEF:{short:'Blue Team',building:'Centro de defensa',color:0x2dd4bf,h:5.0,x:7,z:7}
  };
  const avatars={explorer:'🧭',shield:'🛡️',analyst:'🔍',engineer:'⚙️',pilot:'🚀',robot:'🤖'};
  const rankIcons=['🧭','⌨️','🔎','🛡️','🏗️','👑'];
  let lastRank=null,rankNoticeTimer=null;
  const dashboardTabs=['progress','ranks','achievements'];
  function activateDashboardTab(name,focus=false){
    if(!dashboardTabs.includes(name))return;
    dashboardTabs.forEach(key=>{const button=$('tab-'+key),active=key===name;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;$('panel-'+key).hidden=!active;});
    if(focus)$('tab-'+name).focus();
  }
  dashboardTabs.forEach(name=>{$('tab-'+name).addEventListener('click',()=>activateDashboardTab(name));});
  $('dashboard-tabs').addEventListener('keydown',e=>{
    const i=dashboardTabs.findIndex(name=>$('tab-'+name)===e.target);if(i<0)return;
    let next;
    if(e.key==='ArrowRight')next=(i+1)%dashboardTabs.length;
    else if(e.key==='ArrowLeft')next=(i+dashboardTabs.length-1)%dashboardTabs.length;
    else if(e.key==='Home')next=0;else if(e.key==='End')next=dashboardTabs.length-1;else return;
    e.preventDefault();activateDashboardTab(dashboardTabs[next],true);
  });
  const profileDialog=$('profile-dialog');let profileTrigger=null;
  function openProfile(e){if(!model?.student||profileDialog.open)return;profileTrigger=e.currentTarget;profileDialog.showModal();$('profile-close').focus();}
  $('profile-settings').addEventListener('click',openProfile);
  $('nav-profile').addEventListener('click',openProfile);
  $('profile-close').addEventListener('click',()=>profileDialog.close());
  $('profile-done').addEventListener('click',()=>profileDialog.close());
  profileDialog.addEventListener('close',()=>{if(profileTrigger?.getClientRects().length)profileTrigger.focus();profileTrigger=null;});
  const read=(k,f)=>{try{return localStorage.getItem(k)??f}catch{return f}};
  const save=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
  const motionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
  let theme=read('ctf-city-theme','dark')==='light'?'light':'dark';
  let sound=read('ctf-city-sound','off')==='on';
  let paused=motionPreference.matches||read('ctf-city-paused','off')==='on';
  let model=null, lab=null, protectedMode=false, audio=null, sceneApi=null, loading=false;
  const color=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  function select(key){document.dispatchEvent(new CustomEvent('city:select',{detail:key}));}
  function themeApply(){
    document.documentElement.dataset.theme=theme;
    $('theme-toggle').textContent=theme==='light'?'☾ Tema oscuro':'☀ Tema claro';
    $('theme-toggle').setAttribute('aria-pressed',String(theme==='light'));
    sceneApi?.theme();if(model)drawProgress();if(lab)drawTopology();
  }
  $('theme-toggle').addEventListener('click',()=>{theme=theme==='dark'?'light':'dark';save('ctf-city-theme',theme);themeApply();});
  $('sound-toggle').checked=sound;
  function play(success=false){
    if(!sound)return;
    try{
      const Audio=window.AudioContext||window.webkitAudioContext;
      if(!Audio)return;
      audio??=new Audio();
      if(audio.state==='suspended')audio.resume().catch(()=>{});
      const now=audio.currentTime;
      (success?[523.25,659.25,783.99]:[440]).forEach((hz,i)=>{
        const osc=audio.createOscillator(),gain=audio.createGain(),t=now+i*.09;
        osc.type='sine';osc.frequency.value=hz;gain.gain.setValueAtTime(.0001,t);
        gain.gain.exponentialRampToValueAtTime(.035,t+.025);gain.gain.exponentialRampToValueAtTime(.0001,t+.17);
        osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+.18);
      });
    }catch{}
  }
  $('sound-toggle').addEventListener('change',()=>{sound=$('sound-toggle').checked;save('ctf-city-sound',sound?'on':'off');if(sound)play();});
  document.addEventListener('city:success',()=>play(true));
  function motionUI(){ $('city-motion').textContent=paused?'Activar animación':'Pausar animación';$('city-motion').setAttribute('aria-pressed',String(paused));}
  $('city-motion').addEventListener('click',()=>{paused=!paused;save('ctf-city-paused',paused?'on':'off');motionUI();});
  motionPreference.addEventListener?.('change',e=>{if(e.matches){paused=true;motionUI();}});
  motionUI();
  function renderProfile(){
    if(!model?.student)return;
    const done=model.groups.reduce((a,g)=>a+g.done,0), total=model.groups.reduce((a,g)=>a+g.total,0);
    // El rango llega calculado desde el servidor; nunca desde el selector de avatar.
    const progress=model.rankProgress; 
    if(progress){
      const rank=progress.current,next=progress.next;
      $('rank-label').textContent=rank.name;
      $('summary-rank').textContent=rank.name;
      $('next-rank').textContent=next?(next.threshold-progress.completed)+' para '+next.name:'Rango máximo alcanzado';
      const span=next?next.threshold-rank.threshold:1;
      $('rank-fill').style.width=(next?Math.min(100,Math.max(0,(progress.completed-rank.threshold)/span*100)):100)+'%';
      $('rank-ladder').replaceChildren(...progress.ranks.map((r,i)=>{
        const li=document.createElement('li');
        li.className=r.current?'current':r.unlocked?'unlocked':'locked';
        if(r.current)li.setAttribute('aria-current','step');
        const icon=document.createElement('span');icon.textContent=r.unlocked?rankIcons[i]:'🔒';icon.setAttribute('aria-hidden','true');
        const name=document.createElement('strong');name.textContent=r.name+' · '+r.threshold+' misiones';
        const state=document.createElement('span');state.className='rank-state';state.textContent=r.current?'Actual':r.unlocked?'Obtenido':'Bloqueado';
        li.append(icon,name,state);return li;
      }));
      if(lastRank!==null&&rank.threshold>lastRank){
        $('rank-unlock').textContent='🏆 ¡Nuevo rango desbloqueado! '+rank.name+' · '+progress.completed+' misiones completadas.';
        $('rank-unlock').hidden=false;
        clearTimeout(rankNoticeTimer);rankNoticeTimer=setTimeout(()=>$('rank-unlock').hidden=true,9000);
        play(true);
      }else if(lastRank!==null&&rank.threshold<lastRank){
        clearTimeout(rankNoticeTimer);$('rank-unlock').hidden=true;
      }
      lastRank=rank.threshold;
    }
    $('profile-name').textContent=model.student.name;
    $('avatar-select').value=avatars[model.student.avatar]?model.student.avatar:'explorer';
    $('avatar-display').textContent=avatars[$('avatar-select').value];
    $('rank-count').textContent=(progress?progress.completed:done)+' / '+total;
    $('progress-percent').textContent=Math.round(done/Math.max(total,1)*100)+'%';
    const all=model.groups.filter(g=>g.done===g.total&&g.total>0);
    const feats=[['Primera flag',done>=1],['Cinco misiones',done>=5],['Distrito conquistado',all.length>0],['Defensor de la ciudad',all.some(g=>g.key==='DEF')],['Media ciudad',done>=27],['Ciudad asegurada',done===total&&total>0]];
    $('district-count').textContent=all.length+' / '+model.groups.length;
    $('achievement-count').textContent=feats.filter(([,earned])=>earned).length+' / '+feats.length;
    $('achievements').replaceChildren(...feats.map(([name,earned])=>{const el=document.createElement('div');el.className='achievement'+(earned?' earned':'');el.textContent=(earned?'🏅 ':'🔒 ')+name+(earned?' · obtenido':' · pendiente');return el;}));
  }
  $('avatar-select').addEventListener('change',async()=>{
    if(!model?.student)return;
    const el=$('avatar-select'),previous=model.student.avatar,avatar=el.value;
    el.disabled=true;$('profile-status').textContent='';
    try{const response=await fetch('/api/student/avatar',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({avatar})});if(!response.ok)throw Error('No se pudo guardar el avatar.');const data=await response.json();model.student.avatar=data.avatar;renderProfile();$('profile-status').textContent='Avatar guardado.';play();}
    catch(e){el.value=previous;$('profile-status').textContent=e.message;}
    finally{el.disabled=false;}
  });
  function drawProgress(){
    const host=$('progress-chart');host.replaceChildren();if(!model)return;
    const d3=window.d3;
    for(const g of model.groups){
      const percent=Math.round(g.done/Math.max(1,g.total)*100);
      const button=document.createElement('button');button.type='button';button.className='district-ring';
      button.setAttribute('aria-label',g.name+': '+g.done+' de '+g.total+' misiones, '+percent+'%. Explorar distrito.');
      button.setAttribute('aria-pressed',String(model.selected===g.key));button.title=g.name;button.addEventListener('click',()=>select(g.key));
      if(d3){
        const svg=d3.select(button).append('svg').attr('viewBox','0 0 64 64').attr('aria-hidden','true');
        const arc=d3.arc().innerRadius(23).outerRadius(28).startAngle(0);
        const ring=svg.append('g').attr('transform','translate(32,32)');
        ring.append('path').attr('d',arc({endAngle:2*Math.PI})).attr('fill',color('--surface2'));
        if(g.done>0)ring.append('path').attr('d',arc({endAngle:Math.min(1,g.done/Math.max(1,g.total))*2*Math.PI})).attr('fill',g.key==='DEF'?color('--teal'):color('--accent'));
        ring.append('text').attr('text-anchor','middle').attr('dominant-baseline','central').attr('font-size',14).text(percent+'%');
      }else{
        const fallback=document.createElement('span');fallback.className='ring-fallback';fallback.textContent=percent+'%';button.append(fallback);
      }
      const name=document.createElement('strong');name.textContent=districts[g.key].short;
      const count=document.createElement('small');count.textContent=g.done+'/'+g.total;
      button.append(name,count);host.append(button);
    }
  }
  const templates={
    NET:['Clientes','Control de red','Servicio','Tráfico / paquetes','Firewall, autenticación o cifrado según el caso'],
    WEB:['Navegador','Aplicación / API','Datos','Petición HTTP','Validación y autorización en servidor'],
    AUTH:['Usuario','Autenticación','Cuenta','Identidad / sesión','MFA, límites y validación de sesión'],
    CRYPTO:['Datos','Control criptográfico','Servicio','Secreto / token','Claves protegidas y validación criptográfica'],
    SOC:['Mensaje','Verificación humana','Cuenta / organización','Solicitud ficticia','Canal independiente y controles de identidad'],
    OSINT:['Inventario','Revisión de exposición','Activo','Evidencia ficticia','Restringir exposición y revisar datos'],
    FORENSIC:['Evento','Detección y análisis','Equipo / evidencia','Registro simulado','Contención y preservación de evidencia'],
    CTF:['Entrada','Control de seguridad','Sistema ficticio','Evento de laboratorio','Remediación y verificación'],
    DEF:['Tráfico / evento','Control defensivo','Activo protegido','Evidencia simulada','Control específico del ejercicio']
  };
  function drawTopology(){
    if(!lab)return;
    const host=$('topology-chart');host.replaceChildren();
    const base=templates[lab.group]||templates.CTF;
    const t=[...(lab.nodes||base.slice(0,3)),...base.slice(3)];
    $('topology-title').textContent=lab.title;
    $('topology-vulnerable').setAttribute('aria-pressed',String(!protectedMode));
    $('topology-protected').setAttribute('aria-pressed',String(protectedMode));
    const note=protectedMode&&lab.report?'Corrección propuesta: '+lab.report.fix:'Situación vulnerable: '+lab.description;
    $('topology-note').textContent=note+' Modelo conceptual, no medición ni prueba real.';
    if(!window.d3){host.textContent=t[0]+' → '+t[1]+' → '+t[2];return;}
    const d3=window.d3,nodes=[{x:110,label:t[0],info:t[3]},{x:380,label:t[1],info:protectedMode&&lab.report?lab.report.implementation:'Control insuficiente en este escenario'},{x:650,label:t[2],info:protectedMode?'Activo tras la corrección propuesta':'Activo potencialmente afectado'}];
    const svg=d3.select(host).append('svg').attr('viewBox','0 0 760 175').attr('role','group').attr('aria-label','Flujo conceptual del laboratorio');
    const edge=protectedMode?color('--teal'):color('--error');
    svg.selectAll('line').data([[nodes[0],nodes[1]],[nodes[1],nodes[2]]]).join('line').attr('x1',d=>d[0].x+88).attr('x2',d=>d[1].x-88).attr('y1',78).attr('y2',78).attr('stroke',edge).attr('stroke-width',3).attr('stroke-dasharray',protectedMode?'0':'6 4');
    svg.selectAll('path.arrow').data([292,562]).join('path').attr('class','arrow').attr('d',x=>'M'+(x-8)+' 72 L'+x+' 78 L'+(x-8)+' 84').attr('fill','none').attr('stroke',edge).attr('stroke-width',2);
    const group=svg.selectAll('g.node').data(nodes).join('g').attr('class','node').attr('transform',d=>'translate('+d.x+',78)').attr('tabindex',0).attr('role','button').attr('aria-label',d=>d.label+': '+d.info).on('click',(_,d)=>{$('topology-note').textContent=d.label+': '+d.info+'. '+note;}).on('keydown',(e,d)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('topology-note').textContent=d.label+': '+d.info+'. '+note;}});
    group.append('rect').attr('x',-88).attr('y',-32).attr('width',176).attr('height',64).attr('rx',9).attr('fill',color('--input')).attr('stroke',(d,i)=>i===1?edge:color('--line')).attr('stroke-width',2);
    group.append('text').attr('text-anchor','middle').attr('font-size',13).attr('y',-3).text(d=>d.label);
    group.append('text').attr('text-anchor','middle').attr('font-size',11).attr('y',17).text((d,i)=>i===1?(protectedMode?'CONTROL APLICADO':'CONTROL INSUFICIENTE'):'Seleccionar nodo');
    svg.append('text').attr('x',380).attr('y',145).attr('text-anchor','middle').attr('font-size',12).text(protectedMode?'Flujo protegido en el modelo conceptual':'Flujo vulnerable en el modelo conceptual');
  }
  // Additional interactive models for selected scenarios. No network operations.
  function renderMissionModel(){
    const host=$('mission-model');host.replaceChildren();host.hidden=true;
    if(!lab||!['11','12','38','43','50','51'].includes(lab.id))return;
    host.hidden=false;
    const add=(tag,text,parent=host)=>{const el=document.createElement(tag);el.textContent=text;parent.append(el);return el;};
    add('h3','Simulador didáctico · '+lab.title);
    add('p','Valores y eventos ficticios. Este modelo no ejecuta herramientas ni aplica cambios reales.').className='city-caption';
    const enabled=!!lab.report;
    const control=document.createElement('label');control.className='choice';const check=document.createElement('input');check.type='checkbox';check.disabled=!enabled;control.append(check);
    const modes={'11':'Aplicar limitación de carga','50':'Activar mitigación aguas arriba','12':'Validar TLS y certificado','51':'Instalar certificado válido','38':'Aplicar contención del equipo','43':'Aplicar política de entrada restrictiva'};
    add('span',(enabled?'':'🔒 ')+modes[lab.id],control);
    const result=add('p','');result.className='mission-model-result';result.setAttribute('role','status');
    let update;
    if(['11','50'].includes(lab.id)){
      const label=add('label','Demanda simulada: 90%');label.htmlFor='model-demand';
      const range=document.createElement('input');range.type='range';range.min='0';range.max='100';range.value='90';range.id='model-demand';host.append(range);
      const meter=document.createElement('progress');meter.max=100;meter.setAttribute('aria-label','Carga conceptual del servicio');host.append(meter);
      update=()=>{const incoming=Number(range.value),load=check.checked?Math.min(incoming,40):incoming;label.textContent='Demanda simulada: '+incoming+'%';meter.value=load;result.textContent='Carga del servicio: '+load+'% · '+(load>75?'Saturación':'Operativo')+' · Carga limitada: '+(incoming-load)+'%. Modelo simplificado, no mide un servidor real.';};
      range.addEventListener('input',update);
    }else if(['12','51'].includes(lab.id)){
      const selector=document.createElement('select');selector.className='field';selector.setAttribute('aria-label','Tipo de certificado ficticio');
      ['Certificado válido','Certificado no confiable','Certificado expirado'].forEach((v,i)=>{const opt=add('option',v,selector);opt.value=String(i);});selector.value='1';host.append(selector);
      update=()=>{const valid=selector.value==='0';result.textContent=check.checked?(valid?'Conexión autenticada aceptada en el modelo.':'Conexión rechazada por validación del certificado.'):(valid?'Conexión aceptada; el modelo no exige la validación.':'Advertencia: conexión sin garantía de autenticidad en el modelo.');};selector.addEventListener('change',update);
    }else if(lab.id==='38'){
      const grid=document.createElement('div');grid.className='model-assets';host.append(grid);
      const assets=['PC-01','PC-02','PC-03','SRV-01','Respaldo','SOC'].map(name=>add('span',name,grid));
      update=()=>{assets.forEach((el,i)=>{const affected=[1,2,3].includes(i);el.className=affected?(check.checked?'contained':'alert'):'normal';el.textContent=['PC-01','PC-02','PC-03','SRV-01','Respaldo','SOC'][i]+' · '+(affected?(check.checked?'Aislado':'Alerta'):'Normal');});result.textContent=check.checked?'Contención representada; falta erradicar la causa y verificar respaldos.':'Tres activos presentan alertas ficticias. Analiza el alcance antes de recuperar.';};
    }else{
      const selector=document.createElement('select');selector.className='field';selector.setAttribute('aria-label','Conexión ficticia');
      ['HTTPS público','SSH administrativo','SSH desde red pública','Servicio no autorizado'].forEach((v,i)=>{const opt=add('option',v,selector);opt.value=String(i);});selector.value='2';host.append(selector);
      update=()=>{const allowed=Number(selector.value)<2;result.textContent=check.checked?(allowed?'Permitido por política ficticia.':'Denegado por política ficticia.'):'Sin política restrictiva: acceso permitido en este modelo.';};selector.addEventListener('change',update);
    }
    host.insertBefore(control,result);check.addEventListener('change',update);update();
  }
  $('topology-vulnerable').onclick=()=>{protectedMode=false;drawTopology()};
  $('topology-protected').onclick=()=>{if(lab?.report){protectedMode=true;drawTopology()}};
  document.addEventListener('city:lab',e=>{lab=e.detail;protectedMode=false;$('topology-protected').disabled=true;$('topology-protected').textContent='🔒 Después de corregir';drawTopology();renderMissionModel();play()});
  document.addEventListener('city:defense',e=>{if(!lab)return;lab.report=e.detail;protectedMode=false;$('topology-protected').disabled=!lab.report;$('topology-protected').textContent=lab.report?'Después de corregir':'🔒 Después de corregir';drawTopology();renderMissionModel();});
  async function createCity(){
    if(loading||sceneApi)return;loading=true;
    const host=$('city-viewport'),fallback=$('city-fallback');
    try{
      const T=await import('/vendor/three.module.js');
      const renderer=new T.WebGLRenderer({antialias:true,alpha:false});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
      renderer.outputColorSpace=T.SRGBColorSpace;
      host.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');
      const scene=new T.Scene(),camera=new T.OrthographicCamera(-16,16,10,-10,.1,120);
      const world=new T.Group();scene.add(world);
      scene.add(new T.HemisphereLight(0xffffff,0x64748b,2.2));
      const sunlight=new T.DirectionalLight(0xffffff,2.4);sunlight.position.set(10,22,8);scene.add(sunlight);
      const mats={ground:new T.MeshStandardMaterial({color:0x223348}),road:new T.MeshStandardMaterial({color:0x101827}),wall:new T.MeshStandardMaterial({color:0x334c68}),roof:new T.MeshStandardMaterial({color:0x526d88}),line:new T.MeshStandardMaterial({color:0xcbd5e1})};
      function box(parent,w,h,d,x,y,z,mat){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
      box(world,23,.55,23,0,-.45,0,mats.ground);
      for(const p of [-3.5,3.5]){box(world,1.35,.06,22.8,p,-.13,0,mats.road);box(world,22.8,.06,1.35,0,-.12,p,mats.road);for(let i=-10;i<=10;i+=2){box(world,.08,.02,.7,p,-.08,i,mats.line);box(world,.7,.02,.08,i,-.07,p,mats.line);}}
      const buildings=[],labels=$('city-labels');labels.replaceChildren();
      for(const [key,d] of Object.entries(districts)){
        const g=new T.Group();g.position.set(d.x,0,d.z);world.add(g);
        const accent=new T.MeshStandardMaterial({color:d.color,emissive:d.color,emissiveIntensity:.16});
        const pad=new T.MeshStandardMaterial({color:d.color,transparent:true,opacity:.25});
        box(g,4.8,.12,4.8,0,.02,0,pad);
        const body=box(g,2.8,d.h,2.8,0,d.h/2,0,mats.wall);body.userData.key=key;
        box(g,3.02,.22,3.02,0,d.h+.08,0,accent);
        box(g,1.3,.65,1.3,0,d.h+.45,0,mats.roof);
        if(key==='SOC'||key==='NET'){box(g,.12,1.45,.12,0,d.h+1,0,accent);box(g,.8,.1,.12,0,d.h+1.55,0,accent);}
        for(let row=.6;row<d.h-.25;row+=.7){for(const offset of [-.86,0,.86]){box(g,.55,.32,.04,offset,row,1.425,accent);box(g,.55,.32,.04,offset,row,-1.425,accent);box(g,.04,.32,.55,1.425,row,offset,accent);box(g,.04,.32,.55,-1.425,row,offset,accent);}}
        const label=document.createElement('button');label.className='city-label';label.type='button';label.textContent=d.short;label.title=d.building;label.setAttribute('aria-label',d.building+' — '+d.short);label.onclick=()=>select(key);labels.append(label);
        buildings.push({key,d,g,body,pad,label});
      }
      const packets=[];for(let i=0;i<6;i++){const p=new T.Mesh(new T.SphereGeometry(.12,10,8),new T.MeshBasicMaterial({color:i%2?0x2dd4bf:0xfbbf24}));world.add(p);packets.push(p);}
      let angle=Math.PI/4,zoom=1,drag=null,dirty=true;
      function position(){const r=33;camera.position.set(Math.sin(angle)*r,25,Math.cos(angle)*r);camera.lookAt(0,1,0);camera.zoom=zoom;camera.updateProjectionMatrix();dirty=true;}
      function resize(){const w=host.clientWidth,h=host.clientHeight;if(w<1||h<1)return;renderer.setSize(w,h,false);const a=w/h;const half=Math.max(10.8,15.4/a);camera.left=-half*a;camera.right=half*a;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();dirty=true;}
      function applyTheme(){scene.background=new T.Color(theme==='light'?0xe3eaf2:0x101827);mats.ground.color.set(theme==='light'?0xc0cfdd:0x223348);mats.road.color.set(theme==='light'?0x8093a5:0x101827);mats.wall.color.set(theme==='light'?0x9db2c8:0x334c68);mats.roof.color.set(theme==='light'?0xd1dce5:0x526d88);dirty=true;}
      function updateLabels(){const w=host.clientWidth,h=host.clientHeight;buildings.forEach(b=>{const v=new T.Vector3(b.d.x,b.d.h+.85,b.d.z).project(camera);const visible=Math.abs(v.x)<.99&&Math.abs(v.y)<.94;b.label.hidden=!visible;b.label.style.left=((v.x+1)*w/2)+'px';b.label.style.top=((1-v.y)*h/2)+'px';});}
      function updateProgress(){buildings.forEach(b=>{const g=model?.groups.find(g=>g.key===b.key);const selected=model?.selected===b.key;b.label.setAttribute('aria-pressed',String(selected));b.label.textContent=b.d.short+(g?' '+g.done+'/'+g.total:'');b.pad.opacity=selected?.85:g&&g.done===g.total?.65:.25;});dirty=true;}
      const ray=new T.Raycaster(),pointer=new T.Vector2();
      renderer.domElement.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,angle};renderer.domElement.setPointerCapture(e.pointerId);});
      renderer.domElement.addEventListener('pointermove',e=>{if(!drag)return;angle=drag.angle-(e.clientX-drag.x)*.008;position();});
      renderer.domElement.addEventListener('pointercancel',()=>{drag=null;});
      renderer.domElement.addEventListener('pointerup',e=>{if(!drag)return;const moved=Math.hypot(e.clientX-drag.x,e.clientY-drag.y);drag=null;if(moved>5)return;const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(buildings.map(b=>b.body))[0];if(hit)select(hit.object.userData.key);});
      $('city-left').onclick=()=>{angle-=Math.PI/6;position()};
      $('city-right').onclick=()=>{angle+=Math.PI/6;position()};
      $('city-zoom-in').onclick=()=>{zoom=Math.min(1.65,zoom+.15);position()};
      $('city-zoom-out').onclick=()=>{zoom=Math.max(.65,zoom-.15);position()};
      $('city-reset').onclick=()=>{angle=Math.PI/4;zoom=1;position()};
      const observer=new ResizeObserver(resize);observer.observe(host);
      applyTheme();position();resize();updateProgress();
      fallback.hidden=true;
      sceneApi={theme:applyTheme,progress:updateProgress};
      function frame(t){
        if(!host.getClientRects().length||document.hidden)return;
        if(!paused){packets.forEach((p,i)=>{const v=((t*.001*(1+i*.11)+i*.23)%1)*20-10;p.position.set(i%2?3.5:v,.20,i%2?v:-3.5)});dirty=true;}
        if(dirty){renderer.render(scene,camera);updateLabels();dirty=false;}
      }
      renderer.setAnimationLoop(frame);
      renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();renderer.setAnimationLoop(null);renderer.domElement.hidden=true;labels.hidden=true;fallback.hidden=false;fallback.textContent='WebGL dejó de estar disponible. Usa las tarjetas de módulos o recarga para intentar restaurar el mapa.';});
    }catch(e){fallback.hidden=false;fallback.textContent='Mapa 3D no disponible. Puedes seleccionar todos los distritos en las tarjetas inferiores.';console.warn('Cyber City:',e);}
  }
  document.addEventListener('city:progress',e=>{model=e.detail;renderProfile();drawProgress();if(model.student){createCity();sceneApi?.progress();}});
  // Puesto de acceso: vista previa independiente del mapa de los alumnos.
  const gateway=$('welcome');
  let gatewayMode='register',gatewayScene=null,gatewayLoading=false,gatewayPaused=motionPreference.matches||read('ctf-city-gateway-paused','off')==='on';
  function gatewayTab(mode,focus=true){
    gatewayMode=mode;
    $('gateway-register').hidden=mode!=='register';
    $('gateway-resume').hidden=mode!=='resume';
    $('gateway-new').setAttribute('aria-pressed',String(mode==='register'));
    $('gateway-return').setAttribute('aria-pressed',String(mode==='resume'));
    if(focus)$(mode==='register'?'student-name':'resume-token').focus();
  }
  $('gateway-new').onclick=()=>gatewayTab('register');
  $('gateway-return').onclick=()=>gatewayTab('resume');
  // La navegación de identificación conserva el foco en el formulario visible.
  $('identify').addEventListener('click',()=>gatewayTab(gatewayMode));
  $('brand-home').addEventListener('click',()=>{if(!gateway.hidden)gatewayTab(gatewayMode);});
  function gatewayMotionUI(){
    $('gateway-motion').textContent=gatewayPaused?'Activar animación':'Pausar animación';
    $('gateway-motion').setAttribute('aria-pressed',String(gatewayPaused));
  }
  $('gateway-motion').onclick=()=>{gatewayPaused=!gatewayPaused;save('ctf-city-gateway-paused',gatewayPaused?'on':'off');gatewayMotionUI();gatewayScene?.draw();};
  motionPreference.addEventListener?.('change',e=>{if(e.matches){gatewayPaused=true;gatewayMotionUI();gatewayScene?.draw();}});
  gatewayMotionUI();
  async function createGateway(){
    if(gateway.hidden||gatewayLoading||gatewayScene)return;
    gatewayLoading=true;
    const host=$('gateway-scene'),fallback=$('gateway-fallback');
    let renderer=null,observer=null,scene=null;
    try{
      const T=await import('/vendor/three.module.js');
      if(gateway.hidden){gatewayLoading=false;return;}
      renderer=new T.WebGLRenderer({antialias:true,alpha:true});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
      renderer.outputColorSpace=T.SRGBColorSpace;
      renderer.setClearColor(0,0);
      scene=new T.Scene();
      const camera=new T.OrthographicCamera(-15,15,10,-10,.1,120);
      const city=new T.Group();scene.add(city);
      scene.add(new T.HemisphereLight(0xffffff,0x64748b,2.0));
      const sun=new T.DirectionalLight(0xffffff,2.5);sun.position.set(12,20,8);scene.add(sun);
      const material=(c)=>new T.MeshStandardMaterial({color:c});
      const ground=material(0x223348),road=material(0x101827),wall=material(0x3b526c),roof=material(0x526d88),line=material(0x8ba1b9);
      const geom=new T.BoxGeometry(1,1,1);
      function box(parent,w,h,d,x,y,z,mat){const m=new T.Mesh(geom,mat);m.scale.set(w,h,d);m.position.set(x,y,z);parent.add(m);return m;}
      box(city,23,.55,23,0,-.4,0,ground);
      for(const n of [-3.5,3.5]){
        box(city,1.3,.04,22.8,n,-.1,0,road);box(city,22.8,.04,1.3,0,-.09,n,road);
        for(let i=-10;i<=10;i+=2){box(city,.07,.02,.65,n,-.07,i,line);box(city,.65,.02,.07,i,-.06,n,line);}
      }
      for(const d of Object.values(districts)){
        const g=new T.Group();g.position.set(d.x,0,d.z);city.add(g);
        const accent=new T.MeshStandardMaterial({color:d.color,emissive:d.color,emissiveIntensity:.22});
        box(g,4.5,.12,4.5,0,.02,0,material(d.color));
        box(g,2.8,d.h,2.8,0,d.h/2,0,wall);
        box(g,3.05,.2,3.05,0,d.h+.08,0,accent);
        box(g,1.2,.5,1.2,0,d.h+.4,0,roof);
        for(let row=.6;row<d.h-.2;row+=.8){for(const n of [-.85,0,.85]){box(g,.52,.32,.035,n,row,1.42,accent);box(g,.52,.32,.035,n,row,-1.42,accent);box(g,.035,.32,.52,1.42,row,n,accent);box(g,.035,.32,.52,-1.42,row,n,accent);}}
      }
      const packetGeometry=new T.SphereGeometry(.14,8,6);
      const packetMaterials=[new T.MeshBasicMaterial({color:0xfbbf24}),new T.MeshBasicMaterial({color:0x2dd4bf})];
      const packets=Array.from({length:6},(_,i)=>{const p=new T.Mesh(packetGeometry,packetMaterials[i%2]);city.add(p);return p;});
      let angle=Math.PI/4,last=null,phase=0;
      function applyTheme(){const light=theme==='light';ground.color.set(light?0xc0cfdd:0x223348);road.color.set(light?0x8093a5:0x101827);wall.color.set(light?0x9db2c8:0x3b526c);roof.color.set(light?0xd1dce5:0x526d88);draw();}
      function draw(){camera.position.set(Math.sin(angle)*32,24,Math.cos(angle)*32);camera.lookAt(0,1,0);renderer.render(scene,camera);}
      function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);const a=w/h,half=Math.max(11.8,17/a);camera.left=-half*a;camera.right=half*a;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();draw();}
      function dispose(){renderer.setAnimationLoop(null);observer?.disconnect();scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});renderer.dispose();renderer.domElement.remove();gatewayScene=null;gatewayLoading=false;host.classList.remove('gateway-webgl-ready');fallback.removeAttribute('hidden');$('gateway-motion').hidden=true;}
      host.append(renderer.domElement);
      observer=new ResizeObserver(resize);observer.observe(host);
      gatewayScene={draw,theme:applyTheme,dispose};
      resize();applyTheme();
      fallback.setAttribute('hidden','');host.classList.add('gateway-webgl-ready');$('gateway-motion').hidden=false;
      renderer.setAnimationLoop(t=>{
        if(gateway.hidden||document.hidden||gatewayPaused){last=null;return;}
        const dt=last===null?0:Math.min(.05,(t-last)/1000);last=t;
        angle+=dt*.13;phase+=dt;
        packets.forEach((p,i)=>{const v=((phase*.22+i*.19)%1)*20-10;p.position.set(i%2?3.5:v,.19,i%2?v:-3.5);});
        draw();
      });
      renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();dispose();gatewayLoading=true;});
    }catch(e){observer?.disconnect();if(renderer){renderer.setAnimationLoop(null);renderer.dispose();renderer.domElement.remove();}gatewayScene=null;host.classList.remove('gateway-webgl-ready');fallback.removeAttribute('hidden');$('gateway-motion').hidden=true;console.warn('Cyber City acceso:',e);}
  }
  const gatewayObserver=new MutationObserver(()=>{if(gateway.hidden){gatewayScene?.dispose();}else createGateway();});
  gatewayObserver.observe(gateway,{attributes:true,attributeFilter:['hidden']});
  $('theme-toggle').addEventListener('click',()=>gatewayScene?.theme());
  if(!gateway.hidden)createGateway();
  themeApply();
})();
