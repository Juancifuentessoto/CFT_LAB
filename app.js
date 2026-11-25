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
  const curriculum = {"groups":{"NET":"Hacking de redes","WEB":"Aplicaciones web","AUTH":"Credenciales y accesos","CRYPTO":"Criptografía","SOC":"Ingeniería social","OSINT":"Reconocimiento y OSINT","FORENSIC":"Malware y análisis forense","CTF":"Desafíos integradores","DEF":"Blue Team y ciberdefensa"},"original":[["WEB"],["WEB"],["AUTH"],["WEB"],["WEB"],["NET"],["WEB"],["WEB"],["CRYPTO"],["WEB"]],"scenarios":[{"id":"11","group":"NET","title":"DoS y DDoS","tool":"k6 (solo carga local limitada) / Wireshark","theory":"La saturación de recursos provoca indisponibilidad; DDoS distribuye la carga entre múltiples orígenes.","evidence":"Registro ficticio: latencia 4 s, 503, 95 % CPU, numerosos orígenes.","options":["Limitar solicitudes por identidad y ruta; aplicar cuotas, caché y protección DDoS aguas arriba.","Cambiar el color del formulario","Desactivar todos los registros"],"tier":"Medio"},{"id":"12","group":"NET","title":"Man-in-the-Middle","tool":"Wireshark","theory":"Un intermediario puede observar o alterar comunicaciones sin autenticación y cifrado adecuados.","evidence":"Captura textual ficticia: petición HTTP con dato de prueba visible, conexión TLS con certificado no confiable.","options":["Aceptar cualquier certificado","Exigir HTTPS/TLS, validar cadena y nombre del certificado y habilitar HSTS en el sitio HTTPS.","Usar Base64 en los mensajes"],"tier":"Medio"},{"id":"13","group":"NET","title":"DNS Spoofing","tool":"dig / Wireshark","theory":"Respuestas DNS falsas pueden redirigir una consulta a un destino incorrecto.","evidence":"Resolución ficticia: portal.lab devuelve 192.0.2.20 en vez del registro autorizado 192.0.2.10.","options":["Eliminar TLS","Confiar en cualquier respuesta DNS","Usar resolutores confiables con validación DNSSEC donde esté firmado; verificar TLS del destino."],"tier":"Medio"},{"id":"14","group":"NET","title":"IP Spoofing","tool":"Wireshark / registros de firewall","theory":"Una dirección de origen falsificada no demuestra la identidad del remitente.","evidence":"Registro sintético: interfaz externa recibe origen reservado para la red interna.","options":["Aplicar filtrado de origen en el borde, uRPF cuando proceda y autenticación independiente de IP.","Autorizar todo origen privado","Eliminar la autenticación"],"tier":"Medio"},{"id":"15","group":"NET","title":"ARP Spoofing","tool":"Wireshark / tabla ARP","theory":"Mensajes ARP falsos pueden alterar la asociación IP-MAC de una red local.","evidence":"Tabla ficticia: la dirección del gateway cambia de MAC inesperadamente.","options":["Desactivar la segmentación","Activar DHCP snooping y Dynamic ARP Inspection en equipos compatibles; segmentar la red.","Confiar en todo anuncio ARP"],"tier":"Medio"},{"id":"16","group":"NET","title":"Wi-Fi Spoofing","tool":"Analizador Wi-Fi / registros WLAN","theory":"Un punto de acceso falso puede imitar el nombre de una red legítima.","evidence":"Inventario sintético: mismo SSID, BSSID desconocido y certificado distinto.","options":["Conectar por nombre SSID solamente","Desactivar validación del certificado","Usar WPA3-Enterprise cuando sea compatible, validar certificado del servidor y deshabilitar conexión automática a redes desconocidas."],"tier":"Medio"},{"id":"17","group":"WEB","title":"Cross-Site Scripting (XSS)","tool":"DevTools / Burp Suite","theory":"El navegador interpreta contenido no confiable como código cuando se inserta en un contexto inseguro.","evidence":"Plantilla ficticia: comentario de usuario renderizado como HTML sin codificar.","options":["Usar textContent o escape contextual; sanitizar HTML permitido y añadir CSP como defensa adicional.","Insertar todo comentario con innerHTML","Confiar solo en ocultar el formulario"],"tier":"Medio"},{"id":"18","group":"WEB","title":"CSRF","tool":"Burp Suite / DevTools","theory":"Una petición de otro origen puede aprovechar la sesión de un navegador autenticado.","evidence":"Registro ficticio: cambio de correo mediante POST sin token ni comprobación de origen.","options":["Permitir cambios por GET","Validar token CSRF ligado a sesión, comprobar origen cuando corresponda y usar SameSite apropiado.","Eliminar SameSite y los tokens"],"tier":"Medio"},{"id":"19","group":"WEB","title":"Command Injection","tool":"Revisión de código / Burp Suite","theory":"Concatenar entradas a comandos del sistema puede cambiar las instrucciones ejecutadas.","evidence":"Revisión ficticia: función construye una orden de shell con texto de usuario.","options":["Concatenar más texto a la orden","Ejecutar el servicio como administrador","Sustituir shell por API específica o argumentos separados sin shell; validar opciones y limitar privilegios."],"tier":"Medio"},{"id":"20","group":"WEB","title":"Carga de archivos insegura","tool":"DevTools / OWASP ZAP","theory":"Archivos no confiables pueden ejecutarse o quedar expuestos cuando se guardan sin controles.","evidence":"Inventario ficticio: archivos de usuarios dentro del directorio ejecutable del sitio.","options":["Limitar tipos y tamaño, comprobar contenido, generar nombres propios y guardar fuera del webroot sin ejecución.","Confiar únicamente en extensión","Otorgar permisos de ejecución a todos los archivos"],"tier":"Medio"},{"id":"21","group":"AUTH","title":"Fuerza bruta","tool":"Simulador local de registros","theory":"Los intentos repetidos de autenticación pueden descubrir contraseñas débiles.","evidence":"Eventos ficticios: 40 fallos de la misma cuenta en un minuto.","options":["Eliminar límites de intentos","Limitar intentos con retrasos progresivos, MFA y alertas; evitar bloqueos que faciliten DoS.","Mostrar si la contraseña es casi correcta"],"tier":"Medio"},{"id":"22","group":"AUTH","title":"Ataque de diccionario","tool":"CyberChef / análisis de política","theory":"Contraseñas frecuentes o predecibles son más fáciles de adivinar.","evidence":"Informe ficticio: política acepta claves comunes de una lista de demostración.","options":["Exigir solo una mayúscula","Permitir claves comunes si tienen un número","Bloquear contraseñas comunes o comprometidas y promover contraseñas largas, únicas y MFA."],"tier":"Medio"},{"id":"23","group":"AUTH","title":"Credential Stuffing","tool":"Simulador de registros / Wazuh","theory":"La reutilización de credenciales comprometidas permite intentos en otros servicios.","evidence":"Registro sintético: muchas cuentas reciben intentos desde varios orígenes.","options":["Usar passkeys o MFA, detección de anomalías y contraseñas únicas; limitar intentos por cuenta y origen.","Autorizar por coincidencia de correo","Reutilizar las claves entre servicios"],"tier":"Medio"},{"id":"24","group":"AUTH","title":"Usurpación de cuenta (ATO)","tool":"Revisión de sesiones / registros","theory":"Un atacante puede obtener acceso mediante credenciales o sesiones comprometidas.","evidence":"Registro ficticio: inicio desde ubicación nueva y cambio inmediato de correo de recuperación.","options":["Mantener activas todas las sesiones","Revocar sesiones sospechosas, exigir reautenticación para cambios sensibles y notificar al titular.","Permitir cambios sensibles sin verificación"],"tier":"Medio"},{"id":"25","group":"AUTH","title":"SIM Swapping","tool":"Simulador de incidentes de identidad","theory":"La transferencia no autorizada de un número puede afectar autenticación basada en SMS.","evidence":"Caso ficticio: se pierde cobertura y aparecen solicitudes de recuperación de cuenta.","options":["Depender exclusivamente de SMS","Enviar el código de recuperación a un tercero","Preferir passkeys o llave física, activar PIN de portabilidad si el operador lo permite y recuperar acceso por canales verificados."],"tier":"Medio"},{"id":"26","group":"CRYPTO","title":"Base64 no es cifrado","tool":"CyberChef","theory":"Base64 representa bytes como texto reversible y no aporta confidencialidad.","evidence":"Dato de práctica: un sistema guarda información sensible solo codificada en Base64.","options":["Eliminar secretos del cliente y usar cifrado autenticado con claves protegidas cuando se necesite confidencialidad.","Aplicar Base64 dos veces","Cambiar el alfabeto Base64"],"tier":"Medio"},{"id":"27","group":"CRYPTO","title":"Hashes débiles de contraseñas","tool":"CyberChef / revisión de configuración","theory":"Un hash rápido sin salt facilita la comprobación masiva de contraseñas si se filtra.","evidence":"Esquema ficticio: contraseñas almacenadas como SHA-256 sin salt.","options":["Usar MD5","Migrar a Argon2id con salt individual y parámetros ajustados; rehash al iniciar sesión y reset si hubo exposición.","Usar el mismo salt para todos"],"tier":"Medio"},{"id":"28","group":"CRYPTO","title":"XOR con clave expuesta","tool":"CyberChef / DevTools","theory":"Una operación XOR reversible con clave entregada al navegador no mantiene secretos frente al usuario.","evidence":"Revisión ficticia: datos y clave fija aparecen en el JavaScript público.","options":["Renombrar la variable de clave","Ofuscar la misma clave","Mantener los secretos en el servidor; usar cifrado autenticado con gestión de claves cuando sea necesario."],"tier":"Medio"},{"id":"29","group":"CRYPTO","title":"AES con clave expuesta","tool":"DevTools / revisión de secretos","theory":"Un algoritmo fuerte no protege información del usuario que recibe la clave.","evidence":"Inventario ficticio: clave AES incluida en un bundle de frontend.","options":["Retirar y rotar la clave expuesta; usar un gestor de secretos del servidor y AES-GCM con nonces únicos si aplica.","Aumentar longitud dejando la clave pública","Guardar la clave en un comentario"],"tier":"Medio"},{"id":"30","group":"CRYPTO","title":"PRNG predecible","tool":"Revisión de código Python","theory":"Un generador no criptográfico o una semilla conocida no es apropiado para códigos de seguridad.","evidence":"Código ficticio: tokens derivados de un generador sembrado con la hora.","options":["Usar la hora con más decimales","Usar secrets.token_urlsafe o CSPRNG equivalente; añadir caducidad, uso único y límites de intentos.","Reutilizar la semilla para todos"],"tier":"Medio"},{"id":"31","group":"SOC","title":"Phishing","tool":"Análisis de correo ficticio","theory":"Mensajes engañosos intentan inducir acciones o revelar datos.","evidence":"Correo simulado: enlace de dominio parecido, urgencia y remitente inconsistente.","options":["Responder con las credenciales","Desactivar filtros de correo","Reportar por canal oficial, verificar el dominio fuera del mensaje, aplicar SPF/DKIM/DMARC y MFA resistente al phishing."],"tier":"Básico"},{"id":"32","group":"SOC","title":"Spear Phishing","tool":"Análisis de correo ficticio","theory":"El engaño dirigido adapta el pretexto a un cargo o contexto.","evidence":"Correo sintético: supuesta jefatura solicita un pago urgente fuera del procedimiento.","options":["Verificar por un canal independiente y exigir doble aprobación para cambios de pago.","Aprobar por urgencia","Confiar en el nombre visible del remitente"],"tier":"Básico"},{"id":"33","group":"SOC","title":"Smishing","tool":"Análisis de mensajes ficticios","theory":"Un SMS engañoso puede dirigir a una página de suplantación.","evidence":"Mensaje simulado: aviso de entrega con enlace desconocido y solicitud de datos.","options":["Entregar datos por el enlace","No abrir el enlace; comprobar en la aplicación oficial y reportar el mensaje.","Confiar en cualquier SMS con nombre comercial"],"tier":"Básico"},{"id":"34","group":"SOC","title":"Vishing","tool":"Guion de incidente ficticio","theory":"Una llamada fraudulenta puede hacerse pasar por soporte o una entidad conocida.","evidence":"Caso simulado: interlocutor pide código de un solo uso para supuesta reparación.","options":["Compartir el código para agilizar","Confiar en el identificador de llamada","Cortar y devolver la llamada al número oficial; nunca compartir códigos de autenticación."],"tier":"Básico"},{"id":"35","group":"OSINT","title":"Escaneo de puertos","tool":"Nmap / inventario ficticio","theory":"Un inventario de puertos identifica servicios expuestos; no equivale por sí solo a una vulnerabilidad.","evidence":"Salida ficticia: 22 y 443 autorizados; 8080 de administración no previsto.","options":["Cerrar el servicio innecesario o restringirlo a una red administrativa; mantener inventario.","Abrir todos los puertos","Ocultar el banner sin restringir acceso"],"tier":"Básico"},{"id":"36","group":"OSINT","title":"Identificación de servicios","tool":"Nmap / inventario de versiones","theory":"Versiones y servicios expuestos ayudan a priorizar revisiones de seguridad.","evidence":"Inventario simulado: servicio sin soporte con versión obsoleta.","options":["Cambiar únicamente el nombre del host","Actualizar a versión soportada y restringir exposición; comprobar avisos del fabricante.","Deshabilitar actualizaciones"],"tier":"Básico"},{"id":"37","group":"OSINT","title":"Metadatos y exposición pública","tool":"ExifTool / documentos ficticios","theory":"Archivos publicados pueden incluir información no necesaria sobre personas o sistemas.","evidence":"Informe ficticio: documento contiene autor interno y ruta de trabajo.","options":["Renombrar la extensión","Publicar el archivo original sin revisar","Eliminar metadatos innecesarios antes de publicar y revisar el contenido por información sensible."],"tier":"Básico"},{"id":"38","group":"FORENSIC","title":"Ransomware simulado","tool":"Wazuh / registros ficticios","theory":"El ransomware puede bloquear datos y afectar la disponibilidad; aquí no se ejecuta malware.","evidence":"Eventos sintéticos: cambios masivos de extensiones y alertas EDR.","options":["Aislar el equipo, preservar evidencia, contener credenciales y recuperar desde respaldos verificados.","Borrar todos los registros","Conectar de inmediato el respaldo al equipo afectado"],"tier":"Experto"},{"id":"39","group":"FORENSIC","title":"Análisis de archivo sospechoso","tool":"Autopsy / hashes","theory":"El análisis estático ayuda a preservar y clasificar evidencia sin ejecutar archivos.","evidence":"Ficha ficticia: tipo real distinto de extensión, hash registrado.","options":["Ejecutar en el equipo de producción","Aislar la muestra inerte, calcular hash y analizar metadatos en entorno dedicado.","Modificar el archivo original"],"tier":"Experto"},{"id":"40","group":"FORENSIC","title":"Análisis de tráfico e incidentes","tool":"Wireshark / Wazuh","theory":"Correlacionar registros permite reconstruir un incidente y acotar su impacto.","evidence":"Eventos ficticios: sesión nueva, acceso fuera de horario y transferencia inusual.","options":["Descartar el evento por ser de noche","Eliminar logs antes de investigar","Correlacionar por tiempo e identidad, preservar logs, revocar sesión y limitar salida si corresponde."],"tier":"Experto"},{"id":"41","group":"CTF","title":"Comercio electrónico vulnerable","tool":"Burp Suite / revisión de arquitectura","theory":"La seguridad de una compra depende de validaciones de negocio y de autorización del servidor.","evidence":"Caso ficticio: precio y rol provienen del cliente y se aceptan sin comprobar.","options":["Recalcular importe desde catálogo del servidor y validar permisos por operación.","Confiar en campos readonly","Ocultar botones de administración"],"tier":"Experto"},{"id":"42","group":"CTF","title":"Incidente empresarial integrado","tool":"Wazuh / Wireshark / checklist","theory":"Un incidente puede combinar fallas de autenticación, red y gestión de parches.","evidence":"Caso ficticio: cuenta comprometida, servicio obsoleto y alertas de salida.","options":["Reinstalar todo sin evidencia","Contener la cuenta y el equipo, preservar evidencia, parchear y verificar antes de recuperar.","Desactivar las alertas"],"tier":"Experto"},{"id":"43","group":"DEF","title":"Firewall Linux","tool":"UFW / nftables","theory":"El filtrado de red limita conexiones según política y reduce exposición.","evidence":"Política ficticia: solo HTTPS público y SSH administrativo.","options":["Permitir todas las entradas","Bloquear toda salida sin evaluar servicios","Denegar entrada por defecto, permitir HTTPS y restringir SSH a la red administrativa; mantener acceso de recuperación."],"tier":"Medio"},{"id":"44","group":"DEF","title":"Firewall Windows","tool":"Windows Defender Firewall","theory":"Los perfiles y reglas controlan conexiones de aplicaciones y servicios.","evidence":"Registro ficticio: RDP accesible desde perfil público.","options":["Restringir RDP al perfil y origen administrativo, conservar firewall habilitado y auditar bloqueos.","Desactivar firewall público","Permitir RDP desde cualquier red"],"tier":"Medio"},{"id":"45","group":"DEF","title":"WAF","tool":"ModSecurity / OWASP CRS","theory":"Un WAF inspecciona HTTP y complementa la reparación de aplicaciones.","evidence":"Registro sintético: patrón de solicitud anómalo a una ruta de búsqueda.","options":["Confiar solo en el WAF sin corregir código","Aplicar reglas gestionadas, revisar falsos positivos y corregir la vulnerabilidad del backend.","Desactivar registros del WAF"],"tier":"Medio"},{"id":"46","group":"DEF","title":"IDS / IPS","tool":"Suricata / Snort","theory":"IDS alerta; IPS puede bloquear tráfico según reglas y ubicación.","evidence":"Evento ficticio: firma de tráfico anómalo detectada por IDS.","options":["Bloquear todas las alertas sin revisar","Eliminar reglas de detección","Ajustar reglas con tráfico de referencia, alertar al equipo y activar bloqueo solo tras validar falsos positivos."],"tier":"Medio"},{"id":"47","group":"DEF","title":"Monitoreo de seguridad","tool":"Wazuh","theory":"La telemetría centralizada facilita detección y respuesta.","evidence":"Inventario ficticio: servidor crítico sin enviar logs.","options":["Instalar o reparar agente, proteger transporte, sincronizar hora y definir alertas.","Deshabilitar auditoría local","Enviar logs sin control de acceso"],"tier":"Medio"},{"id":"48","group":"DEF","title":"Gestión de parches","tool":"Gestor de paquetes / Windows Update","theory":"Actualizar software reduce exposición a fallas conocidas.","evidence":"Inventario ficticio: dependencia con aviso de seguridad aplicable.","options":["Aplicar binarios de fuente desconocida","Verificar aviso y versión, respaldar, probar parche en staging, desplegar y validar; planificar reversión.","Ignorar la actualización"],"tier":"Medio"},{"id":"49","group":"DEF","title":"Hardening de servidores","tool":"OpenSSH / revisión de configuración","theory":"La configuración segura reduce privilegios y superficie de ataque.","evidence":"Auditoría ficticia: acceso root remoto y servicios innecesarios.","options":["Habilitar root para todos","Dar privilegios administrativos al servicio web","Deshabilitar root remoto, exigir claves según política, cerrar servicios innecesarios y probar acceso alternativo."],"tier":"Medio"},{"id":"50","group":"DEF","title":"Protección contra DDoS","tool":"Simulador / rate limiting","theory":"La capacidad local y la protección aguas arriba cumplen funciones diferentes.","evidence":"Métricas ficticias: enlace saturado antes de llegar a la aplicación.","options":["Activar mitigación del proveedor/CDN, cuotas por ruta y caché; preparar plan de respuesta.","Confiar solo en firewall del host","Eliminar límites de aplicación"],"tier":"Medio"},{"id":"51","group":"DEF","title":"Certificados y HTTPS","tool":"OpenSSL / navegador","theory":"TLS autentica el servicio y protege el tráfico cuando se valida correctamente.","evidence":"Informe ficticio: certificado expirado o nombre de host incorrecto.","options":["Ignorar advertencias del navegador","Renovar certificado confiable, instalar cadena completa, comprobar nombre y automatizar renovación.","Volver a HTTP sin cifrado"],"tier":"Medio"},{"id":"52","group":"DEF","title":"Análisis de registros","tool":"Wazuh / logs","theory":"Los logs necesitan integridad, contexto temporal y acceso restringido.","evidence":"Registro ficticio: marcas horarias inconsistentes y eventos faltantes.","options":["Borrar eventos antiguos sin política","Permitir edición por cualquier usuario","Sincronizar NTP, centralizar logs con retención y permisos, y alertar ante interrupciones."],"tier":"Medio"},{"id":"53","group":"DEF","title":"Respaldos y recuperación","tool":"Backup / Restore","theory":"Un respaldo solo es útil si puede restaurarse y se protege de alteraciones.","evidence":"Informe ficticio: copia única conectada y sin prueba de recuperación.","options":["Aplicar estrategia 3-2-1 con copia aislada o inmutable y pruebas periódicas de restauración.","Mantener solo una copia en el servidor","Dar escritura universal al respaldo"],"tier":"Medio"},{"id":"54","group":"DEF","title":"Respuesta a incidentes","tool":"Checklist / Wazuh","theory":"La respuesta combina identificación, contención, erradicación, recuperación y aprendizaje.","evidence":"Caso ficticio: alerta confirmada de acceso no autorizado.","options":["Apagar alertas y continuar","Preservar evidencia, delimitar impacto, contener, erradicar causa y recuperar con seguimiento.","Publicar evidencia sensible sin revisión"],"tier":"Medio"}]};
  levels.forEach((l,i)=>{const [group]=curriculum.original[i];Object.assign(l,{group,tool:'Burp Suite / Repeater',kind:'HTTP real local'});});
  curriculum.scenarios.forEach(s=>levels.push({...s,description:s.theory,category:curriculum.groups[s.group],objective:'Analiza la evidencia ficticia y selecciona la remediación correcta.',kind:'Simulación guiada',fields:[],actions:[],hints:['Revisa qué propiedad de seguridad se pierde.','Busca una corrección de la causa, no solo del síntoma.','Comprueba que el control preserve el uso legítimo.']}));
  const missionMeta = {"10":{"name":"El servidor detrás del filtro","brief":"Un previsualizador ficticio procesa destinos URL sin conectarse a Internet.","concept":"Una URL aceptada por texto puede representar un destino distinto tras normalización o resolución.","nodes":["URL","Filtro de destino","Servicio simulado"],"hint":"Distingue texto de una URL y destino efectivo; el ejercicio no realiza conexiones externas.","group":"WEB"},"11":{"name":"Ciudad bajo presión","brief":"El centro de datos registra latencia y errores 503 ficticios.","concept":"DoS agota recursos; DDoS distribuye la demanda entre orígenes y puede saturar el enlace.","nodes":["Orígenes","Control de carga","Servidor"],"hint":"Relaciona CPU, latencia y códigos 503; distingue carga de aplicación y saturación del enlace.","group":"NET"},"12":{"name":"El canal intervenido","brief":"Dos sistemas intercambian mensajes de prueba y uno presenta un certificado no confiable.","concept":"Un intermediario puede leer o modificar datos si el canal no autentica adecuadamente al otro extremo.","nodes":["Cliente","Canal inseguro","Servidor"],"hint":"Distingue confidencialidad del canal y autenticidad del certificado.","group":"NET"},"13":{"name":"El destino equivocado","brief":"El directorio de la ciudad devuelve una dirección que no coincide con el inventario autorizado.","concept":"La resolución DNS vincula nombres a destinos y una respuesta falsa puede redirigir al usuario.","nodes":["Consulta DNS","Resolutor","Destino"],"hint":"Compara el registro de referencia con la respuesta observada.","group":"NET"},"14":{"name":"La identidad de origen","brief":"El firewall registra un origen interno en una interfaz externa ficticia.","concept":"La IP de origen puede ser falsificada y no debe sustituir autenticación.","nodes":["Paquete","Borde de red","Servicio"],"hint":"Relaciona prefijo de origen con interfaz de recepción.","group":"NET"},"15":{"name":"El vecino inesperado","brief":"El inventario de red registra un cambio inesperado de la MAC del gateway.","concept":"ARP asocia direcciones IPv4 y MAC en la red local; anuncios no confiables alteran esa asociación.","nodes":["Equipo","Tabla ARP","Gateway"],"hint":"Compara la asociación de referencia con el cambio observado.","group":"NET"},"16":{"name":"La red impostora","brief":"El inventario inalámbrico muestra un SSID duplicado con identidad distinta.","concept":"Un SSID es un nombre, no una garantía de identidad del punto de acceso.","nodes":["Cliente Wi-Fi","Punto de acceso","Red"],"hint":"Distingue nombre, BSSID y certificado de autenticación.","group":"NET"},"17":{"name":"El comentario activo","brief":"Un tablón ficticio presenta comentarios como HTML.","concept":"XSS aparece cuando datos no confiables se interpretan como código en el navegador.","nodes":["Comentario","Renderizado HTML","Navegador"],"hint":"Identifica si el comentario se trata como texto o marcado.","group":"WEB"},"18":{"name":"La acción sin intención","brief":"Una aplicación ficticia cambia datos mediante una petición autenticada sin comprobación de origen.","concept":"CSRF aprovecha credenciales que el navegador adjunta automáticamente a una solicitud.","nodes":["Origen externo","Sesión del navegador","Cambio de cuenta"],"hint":"Distingue sesión válida de intención del usuario.","group":"WEB"},"19":{"name":"La orden mezclada","brief":"Un servicio ficticio construye una orden de sistema con una entrada externa.","concept":"Una shell puede interpretar metacaracteres como instrucciones en vez de datos.","nodes":["Entrada","Intérprete de órdenes","Sistema"],"hint":"Identifica dónde termina el dato y comienza la orden.","group":"WEB"},"20":{"name":"El archivo sin control","brief":"El portal almacena archivos aportados por usuarios dentro de un directorio ejecutable.","concept":"La carga insegura puede exponer contenido o permitir su interpretación como código.","nodes":["Archivo","Validador","Almacenamiento"],"hint":"Examina ubicación, tipo real, tamaño y permisos.","group":"WEB"},"21":{"name":"La puerta insistente","brief":"El centro de identidad detecta numerosos fallos sobre una cuenta ficticia.","concept":"La fuerza bruta prueba repetidamente credenciales; el riesgo aumenta con contraseñas débiles y ausencia de límites.","nodes":["Intentos","Autenticador","Cuenta"],"hint":"Observa frecuencia y concentración de fallos.","group":"AUTH"},"22":{"name":"El vocabulario predecible","brief":"Una auditoría muestra que la política acepta contraseñas comunes.","concept":"Un ataque de diccionario explota elecciones previsibles, no requiere probar todo el espacio posible.","nodes":["Política","Lista de claves","Cuenta"],"hint":"Evalúa previsibilidad en vez de solo reglas de composición.","group":"AUTH"},"23":{"name":"Las llaves reutilizadas","brief":"El registro ficticio muestra fallos distribuidos sobre muchas cuentas.","concept":"Credential stuffing explota reutilización de credenciales expuestas en otros servicios.","nodes":["Intentos dispersos","Identidad","Cuentas"],"hint":"Distingue muchos usuarios afectados de muchos intentos sobre un usuario.","group":"AUTH"},"24":{"name":"La cuenta desplazada","brief":"Una cuenta ficticia registra un inicio desconocido y cambio de recuperación.","concept":"ATO es el resultado de adquirir control de una cuenta mediante credenciales o sesiones comprometidas.","nodes":["Inicio nuevo","Gestión de sesión","Cuenta"],"hint":"Correlaciona el inicio con los cambios sensibles posteriores.","group":"AUTH"},"25":{"name":"El número perdido","brief":"Un titular ficticio pierde cobertura y observa intentos de recuperación.","concept":"SIM swapping desplaza el control de un número; SMS no garantiza identidad del titular.","nodes":["Número móvil","Recuperación SMS","Cuenta"],"hint":"Relaciona la pérdida de servicio con el riesgo de recuperación.","group":"AUTH"},"26":{"name":"El secreto disfrazado","brief":"Un sistema ficticio utiliza Base64 para guardar datos sensibles.","concept":"Base64 es codificación reversible, no cifrado ni protección de acceso.","nodes":["Datos","Codificación","Cliente"],"hint":"Distingue codificar, cifrar y controlar el acceso.","group":"CRYPTO"},"27":{"name":"La huella demasiado rápida","brief":"Una revisión identifica hashes SHA-256 sin salt para contraseñas.","concept":"Los hashes rápidos facilitan la comprobación masiva de candidatos tras una filtración.","nodes":["Contraseña","Hash rápido","Almacén"],"hint":"Evalúa coste de verificación y unicidad del salt.","group":"CRYPTO"},"28":{"name":"La clave en el escaparate","brief":"Un bundle ficticio contiene datos XOR y una clave fija.","concept":"Una clave entregada junto al texto cifrado no protege el secreto frente al receptor.","nodes":["Datos XOR","Clave pública","Navegador"],"hint":"Identifica quién recibe tanto los datos como la clave.","group":"CRYPTO"},"29":{"name":"La bóveda transparente","brief":"La aplicación distribuye una clave AES en su frontend ficticio.","concept":"AES puede ser fuerte, pero la seguridad depende de proteger la clave y usar correctamente el modo.","nodes":["Bundle","Clave AES","Datos"],"hint":"Distingue fortaleza del algoritmo de gestión de claves.","group":"CRYPTO"},"30":{"name":"El azar repetible","brief":"Un generador ficticio deriva tokens de una semilla temporal.","concept":"Un PRNG no criptográfico no ofrece imprevisibilidad suficiente para credenciales.","nodes":["Semilla","Generador","Token"],"hint":"Evalúa previsibilidad, caducidad y reutilización.","group":"CRYPTO"},"31":{"name":"El mensaje impostor","brief":"Un correo ficticio utiliza urgencia y un dominio parecido.","concept":"Phishing manipula decisiones humanas mediante suplantación y solicitudes engañosas.","nodes":["Correo","Decisión humana","Cuenta"],"hint":"Compara remitente, dominio y canal oficial.","group":"SOC"},"32":{"name":"La orden de la jefatura","brief":"Un correo ficticio solicita un pago fuera del procedimiento.","concept":"Spear phishing adapta el engaño a una persona o función específica.","nodes":["Mensaje dirigido","Aprobación","Pago ficticio"],"hint":"Detecta excepciones al proceso normal, no solo errores de ortografía.","group":"SOC"},"33":{"name":"El aviso de entrega","brief":"Un SMS de muestra solicita datos mediante un enlace desconocido.","concept":"Smishing traslada el engaño a mensajes móviles.","nodes":["SMS","Enlace ficticio","Usuario"],"hint":"Distingue el mensaje recibido de una notificación verificable en la app oficial.","group":"SOC"},"34":{"name":"La llamada de soporte","brief":"Una llamada ficticia solicita un código de un solo uso.","concept":"Vishing utiliza conversación y confianza aparente para inducir acciones.","nodes":["Llamada","Verificación","Cuenta"],"hint":"Evalúa si el interlocutor pide un secreto que el soporte no necesita.","group":"SOC"},"35":{"name":"La puerta expuesta","brief":"Un inventario ficticio incluye un puerto administrativo inesperado.","concept":"Un puerto abierto identifica un servicio accesible, pero no demuestra una vulnerabilidad por sí solo.","nodes":["Inventario","Puertos","Servicio"],"hint":"Compara la exposición observada con los servicios autorizados.","group":"OSINT"},"36":{"name":"El servicio olvidado","brief":"Un inventario ficticio detecta software fuera de soporte.","concept":"Una versión obsoleta puede carecer de actualizaciones; verifica avisos antes de concluir exposición.","nodes":["Inventario","Versión","Activo"],"hint":"Distingue versión instalada, soporte y aviso aplicable.","group":"OSINT"},"37":{"name":"Las huellas del documento","brief":"Un documento de prueba incluye autor y ruta interna.","concept":"Los metadatos pueden revelar información innecesaria aunque el contenido visible parezca seguro.","nodes":["Documento","Metadatos","Publicación"],"hint":"Separa contenido visible de propiedades embebidas.","group":"OSINT"},"38":{"name":"La ciudad secuestrada","brief":"El SOC registra modificaciones masivas y alertas EDR ficticias.","concept":"Ransomware afecta disponibilidad; una alerta no sustituye análisis de alcance y preservación de evidencia.","nodes":["Estación","Alerta EDR","Respaldo"],"hint":"Relaciona cambios de archivos con alertas; distingue evidencia de recuperación.","group":"FORENSIC"},"39":{"name":"La muestra desconocida","brief":"El laboratorio recibe una ficha inerte con extensión y tipo real distintos.","concept":"Análisis estático permite identificar propiedades sin ejecutar el archivo.","nodes":["Muestra inerte","Hash y metadatos","Evidencia"],"hint":"Distingue extensión declarada, tipo real y huella de integridad.","group":"FORENSIC"},"40":{"name":"El rastro disperso","brief":"Varios eventos ficticios sugieren una sesión anómala.","concept":"Correlacionar tiempos, identidades y fuentes permite evaluar alcance sin asumir causalidad.","nodes":["Logs","Correlación","Incidente"],"hint":"Ordena eventos y busca evidencia independiente que respalde la hipótesis.","group":"FORENSIC"},"41":{"name":"La tienda bajo auditoría","brief":"Un comercio ficticio acepta precio y rol desde el cliente.","concept":"Las reglas de negocio y la autorización deben decidirse en el servidor, incluso si la interfaz oculta campos.","nodes":["Carrito","API de negocio","Orden"],"hint":"Identifica qué valores pertenecen al catálogo y a la identidad del servidor.","group":"CTF"},"42":{"name":"El incidente encadenado","brief":"Una empresa ficticia combina una cuenta comprometida, software obsoleto y alertas de salida.","concept":"La respuesta coordinada trata identidad, activo, evidencia y causa raíz.","nodes":["Identidad","Equipo afectado","Salida de red"],"hint":"Prioriza contención y preservación antes de recuperar.","group":"CTF"},"43":{"name":"La frontera Linux","brief":"La política ficticia solo permite HTTPS público y SSH administrativo.","concept":"Un firewall aplica reglas por dirección, interfaz, protocolo y puerto; no corrige defectos de la aplicación.","nodes":["Red","Firewall Linux","Servicios"],"hint":"Contrasta exposición requerida con la regla de entrada.","group":"DEF"},"44":{"name":"La frontera Windows","brief":"Un inventario ficticio muestra RDP accesible desde perfil público.","concept":"Windows Firewall separa perfiles y reglas; alcance y origen importan.","nodes":["Red pública","Firewall Windows","RDP"],"hint":"Revisa perfil de red, servicio y alcance remoto.","group":"DEF"},"45":{"name":"El escudo de la aplicación","brief":"Un registro ficticio muestra solicitudes HTTP anómalas.","concept":"Un WAF inspecciona HTTP y puede reducir exposición, pero no elimina la causa en el código.","nodes":["Petición","WAF","Aplicación"],"hint":"Distingue detección de patrones y reparación de la aplicación.","group":"DEF"},"46":{"name":"El radar defensivo","brief":"Un IDS ficticio alerta sobre una firma de tráfico.","concept":"IDS detecta; IPS puede impedir tráfico si está ubicado y configurado adecuadamente.","nodes":["Tráfico","IDS / IPS","SOC"],"hint":"Distingue una alerta de un bloqueo confirmado.","group":"DEF"},"47":{"name":"El sensor silencioso","brief":"Un servidor ficticio deja de enviar registros al sistema central.","concept":"La ausencia de telemetría también puede ser una señal de fallo o incidente.","nodes":["Agente","Colector","SOC"],"hint":"Comprueba continuidad, identidad del agente y marcas horarias.","group":"DEF"},"48":{"name":"La ventana de actualización","brief":"Un inventario de dependencias ficticio contiene un aviso aplicable.","concept":"El parche debe corresponder a la versión afectada y validarse antes de producción.","nodes":["Inventario","Parche","Servicio"],"hint":"Distingue aviso aplicable de coincidencia de nombre.","group":"DEF"},"49":{"name":"La torre endurecida","brief":"Una revisión ficticia encuentra acceso root remoto y servicios innecesarios.","concept":"Hardening reduce exposición y privilegios mediante configuraciones seguras.","nodes":["Administración","SSH y servicios","Servidor"],"hint":"Prioriza accesos privilegiados y servicios innecesarios.","group":"DEF"},"50":{"name":"El enlace al límite","brief":"El proveedor ficticio informa saturación antes de llegar al servidor.","concept":"Un control del host no puede recuperar ancho de banda ya saturado aguas arriba.","nodes":["Internet simulado","Proveedor / CDN","Aplicación"],"hint":"Identifica si el cuello de botella está en el enlace o en el backend.","group":"DEF"},"51":{"name":"El certificado vencido","brief":"Un informe ficticio detecta un certificado expirado o nombre incorrecto.","concept":"TLS protege y autentica solo cuando la cadena, nombre y vigencia se validan.","nodes":["Navegador","Certificado TLS","Servicio"],"hint":"Revisa vigencia, SAN, cadena y confianza.","group":"DEF"},"52":{"name":"El reloj desordenado","brief":"Los logs ficticios contienen tiempos inconsistentes y faltantes.","concept":"Sin integridad y sincronización, la correlación de eventos pierde fiabilidad.","nodes":["Fuentes","Colector de logs","Investigación"],"hint":"Distingue desfase de reloj y ausencia de eventos.","group":"DEF"},"53":{"name":"La copia de emergencia","brief":"Una auditoría ficticia encuentra una única copia conectada sin prueba de restauración.","concept":"Un respaldo debe ser recuperable y resistente a alteración; copiar no equivale a probar recuperación.","nodes":["Datos","Respaldo","Restauración"],"hint":"Evalúa independencia y evidencia de restauración.","group":"DEF"},"54":{"name":"El último protocolo","brief":"El SOC confirma un acceso no autorizado en una organización ficticia.","concept":"Respuesta a incidentes combina identificación, contención, erradicación, recuperación y aprendizaje.","nodes":["Alerta","Respuesta","Recuperación"],"hint":"Separa hechos confirmados, hipótesis y alcance.","group":"DEF"},"01":{"name":"El recibo ajeno","brief":"Tesorería municipal: un visitante consulta recibos de demostración.","concept":"Conocer el identificador de un objeto no acredita permiso para leerlo.","nodes":["Visitante","API de recibos","Documento ajeno"],"hint":"Distingue identidad, propiedad y autorización en la respuesta.","group":"WEB"},"02":{"name":"El precio que pone el cliente","brief":"Una tienda ficticia recibe pedidos de material informático.","concept":"Los campos readonly son controles de presentación, no garantías de integridad.","nodes":["Carrito","Motor de precios","Orden"],"hint":"Compara los datos que controla el navegador con los que debe decidir el catálogo.","group":"WEB"},"03":{"name":"La cookie de administrador","brief":"El centro de personal tiene una zona restringida para administradores.","concept":"Una cookie modificable por el cliente no constituye una prueba de autorización.","nodes":["Navegador","Cookie de rol","Panel interno"],"hint":"Separa el identificador de sesión de los permisos que el servidor asigna.","group":"AUTH"},"04":{"name":"El acceso heredado","brief":"Una intranet antigua consulta SQLite para identificar usuarios.","concept":"La concatenación mezcla datos externos con instrucciones de base de datos.","nodes":["Formulario","Consulta SQL","SQLite"],"hint":"Compara el tratamiento de texto con el de instrucciones; revisa diferencias entre respuestas.","group":"WEB"},"05":{"name":"El archivo fuera del directorio","brief":"La biblioteca digital publica manuales virtuales y conserva documentos internos.","concept":"Una ruta no es una autorización: su interpretación puede superar el directorio previsto.","nodes":["Lector","Resolución de ruta","Archivos virtuales"],"hint":"Identifica el límite entre el catálogo público y el espacio interno.","group":"WEB"},"06":{"name":"La IP que no es tuya","brief":"Un servicio municipal cree estar disponible solo para peticiones internas.","concept":"Una cabecera HTTP aportada por el cliente no demuestra el origen de red.","nodes":["Cliente","Proxy HTTP","Servicio interno"],"hint":"Distingue la dirección de conexión de una cabecera que la aplicación interpreta.","group":"NET"},"07":{"name":"La puerta del otro verbo","brief":"Una API de informes aplica políticas distintas según el método HTTP.","concept":"La autorización debe acompañar al recurso y a la acción, no únicamente a una ruta GET.","nodes":["Cliente HTTP","Control por método","Reportes"],"hint":"Compara qué política se aplica a cada método del mismo recurso.","group":"WEB"},"08":{"name":"La aprobación fantasma","brief":"Una oficina permite editar comentarios de solicitudes, pero reserva las aprobaciones.","concept":"Asignar automáticamente atributos enviados por un cliente puede alterar estados internos.","nodes":["Solicitud JSON","Asignación de campos","Aprobación"],"hint":"Distingue campos editables y campos reservados al flujo administrativo.","group":"WEB"},"09":{"name":"El token sin firma","brief":"Una bóveda ficticia recibe credenciales JWT de lectura.","concept":"La firma autentica las declaraciones del token; decodificar no equivale a verificar.","nodes":["JWT","Verificador de firma","Bóveda"],"hint":"Distingue representación, autenticidad y permisos de un token.","group":"CRYPTO"}};
  levels.forEach(l=>{l.mission=missionMeta[l.id];l.hints=l.kind==='Simulación guiada'?[l.mission.hint,'Contrasta las opciones con la evidencia concreta: '+l.evidence,'Elige el control que atienda la propiedad de seguridad afectada sin impedir el uso legítimo.']:[l.mission.hint,...l.hints];});
  const $ = id => document.getElementById(id);
  let reportEpoch=0;
  const districtVisual={NET:'◈',WEB:'▣',AUTH:'⌁',CRYPTO:'◇',SOC:'✉',OSINT:'◎',FORENSIC:'▤',CTF:'⚑',DEF:'⬡'};
  function missionHeader(l){
    const m=l.mission;
    return `<header class="mission-hero" data-district="${l.group}"><div><div class="eyebrow">CYBER CITY / ${curriculum.groups[l.group]} / ${l.group}-${l.id}</div><h2>${m.name}</h2><p>${l.title} · ${l.tier} · ${l.kind}</p></div><span class="mission-symbol" aria-hidden="true">${districtVisual[l.group]}</span></header><div class="mission-steps"><a href="#challenge-content">01 Briefing</a><a href="#mission-practice">02 Práctica</a><a href="#mission-validation">03 Flag</a><a href="#mission-defense">04 Defensa</a></div><section class="mission-brief"><div class="box"><h3>Briefing de misión</h3><p>${m.brief}</p><h3>Inteligencia técnica</h3><p>${m.concept}</p><p>${l.description}</p></div><div class="box"><h3>Objetivo</h3><p>${l.objective}</p><h3>Herramientas</h3><p>${l.tool}</p><p>${l.kind==='HTTP real local'?'Configura Burp para el puerto del laboratorio, genera una solicitud desde el panel y revisa HTTP history y Repeater. Usa solo localhost.':'Examina los datos ficticios del ejercicio. La herramienta se indica como referencia; no se ejecuta desde este portal.'}</p></div></section>`;
  }
  function showDefenseLocked(){
    reportEpoch++;
    $('mission-defense').innerHTML='<h2>🔒 Informe de remediación</h2><p>Valida la flag de esta misión para desbloquear la causa raíz, la corrección y las pruebas defensivas.</p>';
    document.dispatchEvent(new CustomEvent('city:defense',{detail:null}));
  }
  async function loadDefense(){
    const id=current.id,epoch=++reportEpoch;
    if(!solvedState[id]){showDefenseLocked();return;}
    const host=$('mission-defense');
    host.textContent='Cargando informe defensivo…';
    try{
      const r=await fetch('/api/remediation?level='+encodeURIComponent(id),{cache:'no-store',credentials:'same-origin'});
      if(epoch!==reportEpoch||current.id!==id)return;
      if(!r.ok){showDefenseLocked();return;}
      const data=await r.json();if(epoch!==reportEpoch||current.id!==id)return;
      host.replaceChildren();
      const add=(tag,value,parent=host)=>{const el=document.createElement(tag);el.textContent=value;parent.append(el);return el;};
      add('div','BLUE TEAM / MISIÓN COMPLETADA').className='eyebrow';
      add('h2','✓ Informe de remediación desbloqueado');
      [['Causa raíz',data.cause],['Corrección recomendada',data.fix],['Aplicación práctica',data.implementation]].forEach(([label,value])=>{const section=document.createElement('section');section.className='box remediation-section';host.append(section);add('h3',label,section);add('p',value,section);});
      add('h3','Verificación de seguridad');
      add('p','Marca las comprobaciones después de realizarlas en un entorno de prueba. No modifican el estado del laboratorio.');
      data.verify.forEach(value=>{const label=document.createElement('label');label.className='choice';const box=document.createElement('input');box.type='checkbox';label.append(box);add('span',value,label);host.append(label);});
      const link=add('a',data.referenceLabel);link.href=data.reference;link.target='_blank';link.rel='noopener noreferrer';
      document.dispatchEvent(new CustomEvent('city:defense',{detail:data}));
    }catch(e){if(epoch===reportEpoch){host.textContent='No se pudo cargar el informe. Vuelve a abrir la misión para reintentar.';}}
  }
  function missionNav(){
    const group=levels.filter(l=>l.group===current.group),i=group.indexOf(current);
    $('mission-prev').disabled=i===0;$('mission-next').disabled=i===group.length-1;
    $('mission-position').textContent=(i+1)+' / '+group.length+' en '+curriculum.groups[current.group];
  }
  function stepMission(delta){const list=levels.filter(l=>l.group===current.group),next=list[list.indexOf(current)+delta];if(next)openLab(next.id);}

  let solvedState = {};
  let rankProgress = null;
  let student = null;
  let groupFilter = 'ALL';
  function renderPortal(){
    const selected=levels.filter(l=>groupFilter==='ALL'||l.group===groupFilter);
    $('modules').innerHTML=Object.entries(curriculum.groups).map(([key,name])=>{
      const list=levels.filter(l=>l.group===key);
      return `<button class="module-filter ${groupFilter===key?'active':''}" data-group="${key}" aria-pressed="${groupFilter===key}"><strong>${name}</strong><span>${list.filter(l=>solvedState[l.id]).length}/${list.length} completados</span></button>`;
    }).join('');
    $('cards').innerHTML=selected.map(l=>`<article class="lab-card"><div class="card-top"><code>${l.group}-${l.id}</code><span>${solvedState[l.id]?'✓ Completado':'□ Pendiente'}</span></div><h3>${l.title}</h3><div class="tags"><span class="tag ${l.tier==='Básico'?'easy':l.tier==='Medio'?'medium':'hard'}">${l.tier}</span><span class="kind">${l.kind}</span></div><p>${l.description}</p><div class="card-foot"><span>${l.hints.length} pistas disponibles</span><button class="btn" data-open="${l.id}">Entrar →</button></div></article>`).join('');
    $('all-groups').setAttribute('aria-pressed',String(groupFilter==='ALL'));
    $('portal-title').textContent=groupFilter==='ALL'?'Todos los laboratorios':curriculum.groups[groupFilter];
    document.dispatchEvent(new CustomEvent('city:progress',{detail:{groups:Object.entries(curriculum.groups).map(([key,name])=>({key,name,total:levels.filter(l=>l.group===key).length,done:levels.filter(l=>l.group===key&&solvedState[l.id]).length})),selected:groupFilter,rankProgress,student:student?{name:student.name,avatar:student.avatar||'explorer'}:null}}));
  }
  function openPortal(){ if(!student){$('welcome').hidden=false;$('student-name').focus();return;} $('portal').hidden=false;$('detail').hidden=true;renderPortal();window.scrollTo(0,0); }
  function openLab(id){if(!student)return;$('portal').hidden=true;$('detail').hidden=false;selectLevel(id);document.dispatchEvent(new CustomEvent('city:lab',{detail:{id:current.id,group:current.group,title:current.mission.name,nodes:current.mission.nodes,description:current.mission.concept}}));missionNav();loadDefense();window.scrollTo(0,0); }
  function renderScenario(l){
    const tier=l.tier==='Básico'?'easy':l.tier==='Medio'?'medium':'hard';
    $('challenge-content').innerHTML=missionHeader(l)+`<section class="box scenario" id="mission-practice"><div class="eyebrow">EVIDENCIA SINTÉTICA / ${l.group}-${l.id}</div><h3>Analiza el incidente</h3><div class="mission-evidence"><p>${l.evidence}</p></div><fieldset><legend>¿Qué decisión aplicarías?</legend>${l.options.map((option,i)=>`<label class="choice"><input type="radio" name="scenario-choice" value="${i}"> <span>${option}</span></label>`).join('')}</fieldset><button class="btn" data-action="scenario">Comprobar decisión</button><p id="scenario-feedback" role="status"></p></section>`;
  }
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
      if(!response.ok) throw new Error('No se pudo consultar la sesión.');
      const data = await response.json();
      const previous = student;
      student = data.student || null;
      $('initial-status').hidden=true;
      $('welcome').hidden=!!student;
      $('student-area').hidden=!student;
      $('identify').hidden=!!student;
      $('nav-portal').hidden=!student;
      $('nav-profile').hidden=!student;
      $('logout').hidden=!student;
      $('student-name-header').hidden=!student;
      $('student-name-header').textContent=student? '👤 '+student.name : '';
      $('student-token').textContent=student?student.token:'';
      if(!student){$('portal').hidden=true;$('detail').hidden=true;return;}
      if(!previous){$('portal').hidden=false;$('detail').hidden=true;}
      const solved = data.solved || {};
      solvedState = solved;
      rankProgress = data.rank_progress || null;
      const count = levels.filter(l => solved[l.id]).length;
      $('score').textContent = String(count);
      $('bar').style.width = `${count / levels.length * 100}%`;
      renderPortal();
      levels.forEach(l => {
        const check = $('check-' + l.id);
        if (check) check.textContent = solved[l.id] ? '✓' : '';
      });
    } catch (_) {
      if(!student){$('initial-status').hidden=false;$('initial-status').textContent='No se pudo conectar con el servidor. Comprueba Docker y recarga la página.';}
    }
  }
  function selectLevel(id) {
    current = levels.find(l => l.id === id) || levels[0];
    showDefenseLocked();
    document.querySelectorAll('.navbtn').forEach(btn => btn.classList.toggle('active',btn.dataset.level === id));
    const content = $('challenge-content');
    const className = current.tier === 'Básico' ? 'easy' : current.tier === 'Medio' ? 'medium' : 'hard';
    if(current.kind==='Simulación guiada'){
      renderScenario(current);
      $('hints').innerHTML=current.hints.map((hint,i)=>`<details class="hint"><summary>Pista ${i+1}</summary><p>${hint}</p></details>`).join('');
      $('flag-input').value='';$('flag-result').textContent='';
      showResponse('SIMULACIÓN','Analiza la evidencia y comprueba tu decisión para obtener una flag.');
      return;
    }
    // Solo se incrusta metadata estática incluida en este JavaScript, nunca respuestas del servidor.
    content.innerHTML = missionHeader(current)+`
      <div class="workspace" id="mission-practice"><section class="box">
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
      case 'scenario': {
        const choice=document.querySelector('input[name="scenario-choice"]:checked');
        const feedback=$('scenario-feedback');
        if(!choice){feedback.textContent='Selecciona una opción.';return;}
        const id=current.id;
        const {data}=await send('/api/scenario','POST',{level:id,choice:Number(choice.value)});
        if(current.id===id && feedback.isConnected){feedback.textContent=data?.message||data?.error||'No se pudo comprobar.';if(data?.correct&&data.flag){$('flag-input').value=data.flag;feedback.textContent+=' La flag se ha copiado al validador; confírmala para registrar la misión.';}}
        return;
      }
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
  $('modules').addEventListener('click',e=>{const b=e.target.closest('[data-group]');if(b){groupFilter=b.dataset.group;renderPortal();}});
  $('all-groups').addEventListener('click',()=>{groupFilter='ALL';renderPortal();});
  document.addEventListener('city:select',e=>{if(student&&Object.hasOwn(curriculum.groups,e.detail)){groupFilter=e.detail;renderPortal();$('portal-title').scrollIntoView({block:'start',behavior:'instant'});}});
  $('cards').addEventListener('click',e=>{const b=e.target.closest('[data-open]');if(b)openLab(b.dataset.open);});
  $('back-portal').addEventListener('click',openPortal);
  $('mission-prev').onclick=()=>stepMission(-1);
  $('mission-next').onclick=()=>stepMission(1);
  $('brand-home').addEventListener('click',()=>{if(student)openPortal();else if(!$('welcome').hidden)$('student-name').focus();});
  $('nav-portal').addEventListener('click',openPortal);
  $('identify').addEventListener('click',()=> $('student-name').focus());
  $('guide-link').addEventListener('click',()=>{$('guia').hidden=false;});
  async function identityRequest(path, body){
    const response=await fetch(path,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'No se pudo completar la solicitud.');
    return data;
  }
  function identityForm(formId,statusId,path,body){
    $(formId).addEventListener('submit',async e=>{
      e.preventDefault();
      const button=$(formId).querySelector('button[type="submit"]');
      button.disabled=true;$(statusId).textContent='';
      try{await identityRequest(path,body());window.location.reload();}
      catch(error){$(statusId).textContent=error.message;button.disabled=false;}
    });
  }
  identityForm('register-form','register-status','/api/student/register',()=>({name:$('student-name').value.trim()}));
  identityForm('resume-form','resume-status','/api/student/resume',()=>({token:$('resume-token').value.trim()}));
  $('logout').addEventListener('click',async()=>{
    $('logout').disabled=true;
    try{await identityRequest('/api/student/logout',{});window.location.reload();}
    catch(error){$('logout').disabled=false;window.alert(error.message);}
  });
  $('copy-token').addEventListener('click',async()=>{
    if(!student)return;
    try{await navigator.clipboard.writeText(student.token);$('copy-status').textContent='Token copiado.';}
    catch(_){$('copy-status').textContent='Selecciona el token y cópialo manualmente.';}
  });
  $('reset-portal').addEventListener('click',()=>$('reset').click());
  $('challenge-content').addEventListener('click', e=>{
    const button = e.target.closest('button[data-action]');
    if(button) act(button.dataset.action);
  });
  $('verify').addEventListener('click', async()=>{
    const id=current.id;
    const {response,data}=await send('/api/verify','POST',{level:id,flag:$('flag-input').value});
    if(!response) return;
    if(current.id!==id){if(data.correct)await refresh();return;}
    $('flag-result').textContent = data.message || data.error;
    $('flag-result').classList.toggle('success-text',!!data.correct); $('flag-result').classList.toggle('error-text',!data.correct);
    if(data.correct){document.dispatchEvent(new CustomEvent('city:success'));await refresh();if(current.id===id)await loadDefense();}
  });
  $('flag-input').addEventListener('keydown',e=>{if(e.key==='Enter') $('verify').click();});
  $('reset').addEventListener('click',async()=>{
    if(!window.confirm('¿Borrar el progreso y las solicitudes de esta sesión?')) return;
    const {response}=await send('/api/reset','POST',{});
    if(response?.ok){activeRequest=null;activeToken=null;selectLevel(current.id);await refresh();if(!$('detail').hidden)loadDefense();}
  });
  refresh();
})();
