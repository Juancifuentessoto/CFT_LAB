(() => {
  'use strict';
  const levels = [
    {id:'01',tier:'Básico',category:'CONTROL DE ACCESO',title:'El recibo ajeno',
      description:'Un usuario visitante puede consultar su recibo. Un segundo documento pertenece a administración.',
      objective:'Encuentra un recibo de otro propietario. Comprueba qué valida realmente el servidor.',
      endpoint:'GET /api/basic/invoices?id=4101',
      fields:[{name:'invoice',label:'ID del documento',value:'4101'}],
      actions:[['invoice','Consultar recibo']],
      hints:['Inspecciona la solicitud y el parámetro id.','Prueba en Repeater un identificador cercano al recibo propio.']},
    {id:'02',tier:'Básico',category:'MANIPULACIÓN DE PARÁMETROS',title:'El precio que pone el cliente',
      description:'La tienda toma el precio unitario enviado por el navegador sin recalcularlo en el servidor. No hay compras reales.',
      objective:'Consigue una orden de laboratorio con total igual a cero, modificando el cuerpo HTTP.',
      endpoint:'POST /api/basic/checkout',
      fields:[{name:'sku',label:'Producto',value:'KIT-CTF',readonly:true},{name:'price',label:'Precio enviado (CLP)',value:'12990',readonly:true},{name:'qty',label:'Cantidad',value:'1',readonly:true}],
      actions:[['checkout','Crear orden de prueba']],
      hints:['Captura la petición POST en Proxy o Repeater.','El servidor acepta unit_price como si fuera una fuente confiable.']},
    {id:'03',tier:'Básico',category:'COOKIES / ROLES',title:'La cookie de administrador',
      description:'El panel de personal confía en una cookie suministrada por el cliente para decidir qué rol tiene.',
      objective:'Visita el panel interno engañando al servidor respecto al rol del usuario.',
      endpoint:'GET /api/basic/staff', fields:[], actions:[['staff','Intentar acceder']],
      hints:['En Repeater, observa el encabezado Cookie de la petición.','Experimenta agregando la cookie lab_role con un valor privilegiado.']},
    {id:'04',tier:'Medio',category:'INYECCIÓN SQL',title:'El acceso heredado',
      description:'La autenticación de un sitio antiguo concatena campos de usuario y contraseña en una consulta SQL.',
      objective:'Accede al panel de administración sin conocer la contraseña de admin.',
      endpoint:'POST /api/medium/login → GET /api/medium/portal',
      fields:[{name:'username',label:'Usuario',value:'visitante'},{name:'password',label:'Contraseña',value:'lab123'}],
      actions:[['login','Iniciar sesión'],['portal','Abrir panel admin']],
      hints:['Considera cómo afecta una comilla simple a una consulta SQL.','El operador de comentario -- puede omitir la comprobación del password.']},
    {id:'05',tier:'Medio',category:'PATH TRAVERSAL',title:'El archivo fuera del directorio',
      description:'Una API abre nombres de archivos en una carpeta pública, pero no comprueba si la ruta escapa al directorio. Todos los archivos son virtuales.',
      objective:'Recupera el archivo interno key.txt del directorio /internal.',
      endpoint:'GET /api/medium/files?name=manual.txt',
      fields:[{name:'filename',label:'Nombre de archivo',value:'manual.txt'}],
      actions:[['files','Leer documento']],
      hints:['La carpeta inicial es /public/docs.','Las secuencias ../ permiten ascender en la ruta de archivos.']},
    {id:'06',tier:'Medio',category:'CONFIANZA EN CABECERAS',title:'La IP que no es tuya',
      description:'Un endpoint supuestamente interno decide el acceso por una cabecera HTTP controlable.',
      objective:'Haz que la aplicación crea que tu petición proviene de la dirección loopback.',
      endpoint:'GET /api/medium/internal', fields:[], actions:[['internal','Consultar servicio interno']],
      hints:['Inspecciona las cabeceras HTTP de la petición en Repeater.','Prueba con X-Forwarded-For e investiga qué IP se reserva para localhost.']},
    {id:'07',tier:'Medio',category:'CONTROL DE ACCESO POR MÉTODO',title:'La puerta del otro verbo',
      description:'El servidor protege una ruta de reportes en GET, pero olvidó aplicar el control en otro método.',
      objective:'Obtener la exportación cambiando únicamente el método HTTP.',
      endpoint:'GET /api/medium/records', fields:[], actions:[['records','Intentar ver reportes']],
      hints:['Envía la petición al Repeater y cambia el método.','Prueba POST en la misma ruta; el ejercicio no necesita cuerpo JSON.']},
    {id:'08',tier:'Experto',category:'MASS ASSIGNMENT / API',title:'La aprobación fantasma',
      description:'Los usuarios pueden crear solicitudes y cambiar un comentario. El backend guarda además otros campos enviados en el JSON.',
      objective:'Crea una solicitud, modifica los atributos internos en PATCH y exporta el informe restringido.',
      endpoint:'POST /api/expert/requests → PATCH /api/expert/requests/{id} → GET /api/expert/export',
      fields:[{name:'comment',label:'Comentario',value:'Revisión del informe trimestral'}],
      actions:[['create','1. Crear solicitud'],['patch','2. Guardar comentario'],['export','3. Exportar']],
      hints:['Captura el PATCH generado al guardar comentario.','Observa state, scope y approved_by en las respuestas. ¿Qué valores pide la exportación?']},
    {id:'09',tier:'Experto',category:'JWT / FIRMA',title:'El token sin firma',
      description:'El servidor entrega un JWT firmado con permisos de lectura. La verificación admite un algoritmo que no debería aceptar.',
      objective:'Forja un JWT de administrador y entra al vault modificando Authorization en Repeater.',
      endpoint:'GET /api/expert/token → GET /api/expert/vault', fields:[],
      actions:[['token','1. Obtener JWT'],['vault','2. Consultar vault']],
      hints:['Inspecciona las tres partes del JWT; usa Burp Decoder con Base64URL.','Prueba cambiando el encabezado alg a none, el rol a admin y dejando vacía la firma.']},
    {id:'10',tier:'Experto',category:'SSRF / NORMALIZACIÓN DE IP',title:'El servidor detrás del filtro',
      description:'El previsualizador simula solicitudes a URLs, pero el filtro bloquea solo determinadas representaciones textuales de la IP interna.',
      objective:'Consulta /internal/flag en el servicio interno simulado sin usar literalmente 127.0.0.1 en la URL.',
      endpoint:'POST /api/expert/preview',
      fields:[{name:'url',label:'URL para previsualizar',value:'https://assets.training.test/welcome'}],
      actions:[['preview','Previsualizar URL']],
      hints:['Una misma IPv4 puede escribirse de distintas formas.','Convierte 127.0.0.1 a una sola cifra decimal de 32 bits y mantén /internal/flag.']}
  ];
  const $ = id => document.getElementById(id);
  let current = levels[0];
  let activeRequest = null;
  let activeToken = null;

  function showResponse(status, message) {
    $('http-status').textContent = status;
    $('response').textContent = message;
  }
  async function api(path, options={}) {
    try {
      const response = await fetch(path, {credentials:'same-origin',cache:'no-store',...options});
      const data = await response.json();
      showResponse(`HTTP ${response.status} ${response.statusText}`, JSON.stringify(data,null,2));
      return {response, data};
    } catch (error) {
      showResponse('ERROR DE CONEXIÓN', `No se puede contactar el servidor. Levanta Docker con: docker compose up --build -d\n\n${error.message}`);
      return {response:null,data:null};
    }
  }
  function send(path, method, body) {
    return api(path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  }
  async function refresh() {
    try {
      const response = await fetch('/api/state',{cache:'no-store'});
      const data = await response.json();
      const solved = data.solved || {};
      const count = levels.filter(l => solved[l.id]).length;
      $('score').textContent = String(count);
      $('bar').style.width = `${count / levels.length * 100}%`;
      levels.forEach(l => {
        const check = $('check-' + l.id);
        if (check) check.textContent = solved[l.id] ? '✓' : '';
      });
    } catch (_) { /* Errores visibles al intentar una petición */ }
  }
  function selectLevel(id) {
    current = levels.find(l => l.id === id) || levels[0];
    document.querySelectorAll('.navbtn').forEach(btn => btn.classList.toggle('active',btn.dataset.level === id));
    const content = $('challenge-content');
    const className = current.tier === 'Básico' ? 'easy' : current.tier === 'Medio' ? 'medium' : 'hard';
    // Solo se incrusta metadata estática incluida en este JavaScript, nunca respuestas del servidor.
    content.innerHTML = `
      <div class="topline"><span class="tag ${className}">Nivel ${current.id} · ${current.tier}</span><span class="smallcaps">${current.category}</span></div>
      <h2>${current.title}</h2><p class="desc">${current.description}</p>
      <div class="quest"><b>OBJETIVO</b> — ${current.objective}</div>
      <div class="workspace"><section class="box">
        <h3>Panel de pruebas</h3>
        ${current.fields.map(f => `<label class="label" for="field-${f.name}">${f.label}</label><input class="field" id="field-${f.name}" value="${f.value}" autocomplete="off" spellcheck="false" ${f.readonly ? 'readonly title="Modifica este valor en Burp Repeater"' : ''}>`).join('')}
        ${current.fields.length === 0 ? '<p>Este desafío se resuelve modificando la petición HTTP con Burp Suite.</p>' : ''}
        <div class="buttons">${current.actions.map(([action,title],i)=>`<button class="btn ${i ? 'secondary':''}" data-action="${action}">${title}</button>`).join('')}</div>
        ${current.id === '08' ? `<p class="muted" id="request-ref">Solicitud activa: ${activeRequest || 'ninguna'}</p>`:''}
        ${current.id === '09' ? `<p class="muted" id="token-ref">Token activo: ${activeToken ? 'obtenido' : 'ninguno'}</p>`:''}
      </section><section class="box"><h3>Briefing técnico</h3><p><span class="endpoint">${current.endpoint}</span></p>
      <p>Herramientas: <b>Proxy → HTTP history → Repeater</b>.</p><p>Intercepta una petición y modifica sus parámetros, método, cookies, cabeceras o JSON, según el reto.</p>
      </section></div>`;
    $('hints').innerHTML = current.hints.map((hint,i)=>`<details class="hint"><summary>Pista ${i+1}</summary><p>${hint}</p></details>`).join('');
    $('flag-input').value='';
    $('flag-result').textContent='';
    showResponse('SIN SOLICITUD',`Nivel ${current.id} seleccionado. Intercepta el tráfico con Burp Suite.`);
  }
  const field = name => $('field-' + name)?.value || '';
  async function act(action) {
    switch(action) {
      case 'invoice': return api('/api/basic/invoices?id='+encodeURIComponent(field('invoice')));
      case 'checkout': return send('/api/basic/checkout','POST',{sku:field('sku'),unit_price:Number(field('price')),quantity:Number(field('qty'))});
      case 'staff': return api('/api/basic/staff');
      case 'login': return send('/api/medium/login','POST',{username:field('username'),password:field('password')});
      case 'portal': return api('/api/medium/portal');
      case 'files': return api('/api/medium/files?name='+encodeURIComponent(field('filename')));
      case 'internal': return api('/api/medium/internal');
      case 'records': return api('/api/medium/records');
      case 'create': {
        const {response,data} = await send('/api/expert/requests','POST',{comment:field('comment')});
        if(response?.ok) {
          activeRequest=data.request.request_id;
          if($('request-ref')) $('request-ref').textContent='Solicitud activa: '+activeRequest;
        }
        return;
      }
      case 'patch': {
        if(!activeRequest) return showResponse('FALTA SOLICITUD','Primero crea una solicitud de exportación.');
        return send('/api/expert/requests/'+encodeURIComponent(activeRequest),'PATCH',{comment:field('comment')});
      }
      case 'export': {
        if(!activeRequest) return showResponse('FALTA SOLICITUD','Primero crea una solicitud de exportación.');
        return api('/api/expert/export?request_id='+encodeURIComponent(activeRequest));
      }
      case 'token': {
        const {response,data} = await api('/api/expert/token');
        if(response?.ok) {
          activeToken=data.token;
          if($('token-ref')) $('token-ref').textContent='Token activo: obtenido';
        }
        return;
      }
      case 'vault': {
        if(!activeToken) return showResponse('FALTA TOKEN','Primero solicita un JWT de lectura.');
        return api('/api/expert/vault',{headers:{Authorization:'Bearer '+activeToken}});
      }
      case 'preview': return send('/api/expert/preview','POST',{url:field('url')});
    }
  }
  document.querySelectorAll('.navbtn').forEach(btn=>btn.addEventListener('click',()=>selectLevel(btn.dataset.level)));
  $('challenge-content').addEventListener('click', e=>{
    const button = e.target.closest('button[data-action]');
    if(button) act(button.dataset.action);
  });
  $('verify').addEventListener('click', async()=>{
    const {response,data}=await send('/api/verify','POST',{level:current.id,flag:$('flag-input').value});
    if(!response) return;
    $('flag-result').textContent = data.message || data.error;
    $('flag-result').style.color = data.correct ? '#5eead4' : '#ff9da9';
    if(data.correct) refresh();
  });
  $('flag-input').addEventListener('keydown',e=>{if(e.key==='Enter') $('verify').click();});
  $('reset').addEventListener('click',async()=>{
    if(!window.confirm('¿Borrar el progreso y las solicitudes de esta sesión?')) return;
    const {response}=await send('/api/reset','POST',{});
    if(response?.ok){activeRequest=null;activeToken=null;selectLevel(current.id);refresh();}
  });
  selectLevel('01');
  refresh();
})();
