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
  const curriculum = {"groups":{"NET":"Hacking de redes","WEB":"Aplicaciones web","AUTH":"Credenciales y accesos","CRYPTO":"Criptografía","SOC":"Ingeniería social","OSINT":"Reconocimiento y OSINT","FORENSIC":"Malware y análisis forense","CTF":"Desafíos integradores","DEF":"Blue Team y ciberdefensa"},"original":[["WEB","IDOR: verificar autorización de objeto y propiedad en cada consulta; no confiar en identificadores del cliente.","Repetir con documento propio y ajeno: el primero funciona y el segundo devuelve 403 o 404."],["WEB","Obtener precio desde el catálogo en el servidor y recalcular el total; validar cantidad y aplicar reglas de descuentos del servidor.","Comparar compra válida con precio alterado: el importe se mantiene según catálogo."],["AUTH","Guardar roles en sesión del servidor; usar cookies opacas HttpOnly, SameSite y Secure bajo HTTPS; validar permisos por operación.","Una cookie de rol modificada no concede acceso; un administrador autorizado sí."],["WEB","Parametrizar consultas SQLite con placeholders y verificar contraseñas mediante Argon2id; usar privilegios mínimos y WAF como complemento.","Probar entradas con caracteres especiales y confirmar que no alteran la consulta; acceso válido sigue operativo."],["WEB","Usar lista permitida de documentos o resolver ruta canónica dentro de la carpeta autorizada, sin seguir enlaces que escapen; limitar permisos.","Solicitar un documento permitido y una ruta fuera de carpeta: solo se entrega el permitido."],["NET","Esta es suplantación de cabecera HTTP, no de paquetes IP: eliminar cabeceras entrantes no confiables en el proxy y aceptar datos solo de proxies autorizados; exigir autorización.","Cabeceras aportadas por el cliente no cambian privilegios y la ruta interna exige permisos."],["WEB","Centralizar controles de autorización para todos los métodos HTTP y rechazar métodos no implementados.","Probar GET y POST sin permisos: ambos se rechazan."],["WEB","Definir un esquema de campos modificables y permitir solo comentario; cambiar estado mediante operación autorizada y auditada.","Enviar campos no permitidos y comprobar rechazo o ausencia de cambios en estado."],["CRYPTO","Verificar JWT mediante biblioteca mantenida, algoritmo permitido fijo, firma, expiración, emisor y audiencia; rechazar tokens sin firma.","Token válido se acepta con su rol; firma inválida o ausente se rechaza."],["WEB","Permitir solo destinos aprobados, normalizar y validar IP resuelta, bloquear rangos internos y redirecciones no permitidas; aplicar firewall de salida.","Probar destinos aprobados y distintas representaciones de destinos internos: solo los aprobados se aceptan."]],"scenarios":[{"id":"11","group":"NET","title":"DoS y DDoS","tool":"k6 (solo carga local limitada) / Wireshark","theory":"La saturación de recursos provoca indisponibilidad; DDoS distribuye la carga entre múltiples orígenes.","evidence":"Registro ficticio: latencia 4 s, 503, 95 % CPU, numerosos orígenes.","fix":"Limitar solicitudes por identidad y ruta; aplicar cuotas, caché y protección DDoS aguas arriba.","verify":"Comparar latencia, tasa de errores y solicitudes legítimas admitidas con el límite activo.","options":["Limitar solicitudes por identidad y ruta; aplicar cuotas, caché y protección DDoS aguas arriba.","Cambiar el color del formulario","Desactivar todos los registros"],"tier":"Medio"},{"id":"12","group":"NET","title":"Man-in-the-Middle","tool":"Wireshark","theory":"Un intermediario puede observar o alterar comunicaciones sin autenticación y cifrado adecuados.","evidence":"Captura textual ficticia: petición HTTP con dato de prueba visible, conexión TLS con certificado no confiable.","fix":"Exigir HTTPS/TLS, validar cadena y nombre del certificado y habilitar HSTS en el sitio HTTPS.","verify":"Confirmar que los datos no aparecen en claro y que un certificado no válido se rechaza.","options":["Aceptar cualquier certificado","Exigir HTTPS/TLS, validar cadena y nombre del certificado y habilitar HSTS en el sitio HTTPS.","Usar Base64 en los mensajes"],"tier":"Medio"},{"id":"13","group":"NET","title":"DNS Spoofing","tool":"dig / Wireshark","theory":"Respuestas DNS falsas pueden redirigir una consulta a un destino incorrecto.","evidence":"Resolución ficticia: portal.lab devuelve 192.0.2.20 en vez del registro autorizado 192.0.2.10.","fix":"Usar resolutores confiables con validación DNSSEC donde esté firmado; verificar TLS del destino.","verify":"Comparar respuestas del resolutor autorizado y comprobar que una firma inválida se rechaza.","options":["Eliminar TLS","Confiar en cualquier respuesta DNS","Usar resolutores confiables con validación DNSSEC donde esté firmado; verificar TLS del destino."],"tier":"Medio"},{"id":"14","group":"NET","title":"IP Spoofing","tool":"Wireshark / registros de firewall","theory":"Una dirección de origen falsificada no demuestra la identidad del remitente.","evidence":"Registro sintético: interfaz externa recibe origen reservado para la red interna.","fix":"Aplicar filtrado de origen en el borde, uRPF cuando proceda y autenticación independiente de IP.","verify":"Confirmar que los orígenes incompatibles con la interfaz se descartan y registrar el evento.","options":["Aplicar filtrado de origen en el borde, uRPF cuando proceda y autenticación independiente de IP.","Autorizar todo origen privado","Eliminar la autenticación"],"tier":"Medio"},{"id":"15","group":"NET","title":"ARP Spoofing","tool":"Wireshark / tabla ARP","theory":"Mensajes ARP falsos pueden alterar la asociación IP-MAC de una red local.","evidence":"Tabla ficticia: la dirección del gateway cambia de MAC inesperadamente.","fix":"Activar DHCP snooping y Dynamic ARP Inspection en equipos compatibles; segmentar la red.","verify":"Comprobar que cambios no autorizados de asociaciones generan rechazo o alerta.","options":["Desactivar la segmentación","Activar DHCP snooping y Dynamic ARP Inspection en equipos compatibles; segmentar la red.","Confiar en todo anuncio ARP"],"tier":"Medio"},{"id":"16","group":"NET","title":"Wi-Fi Spoofing","tool":"Analizador Wi-Fi / registros WLAN","theory":"Un punto de acceso falso puede imitar el nombre de una red legítima.","evidence":"Inventario sintético: mismo SSID, BSSID desconocido y certificado distinto.","fix":"Usar WPA3-Enterprise cuando sea compatible, validar certificado del servidor y deshabilitar conexión automática a redes desconocidas.","verify":"Verificar que los clientes rechazan el perfil no autorizado.","options":["Conectar por nombre SSID solamente","Desactivar validación del certificado","Usar WPA3-Enterprise cuando sea compatible, validar certificado del servidor y deshabilitar conexión automática a redes desconocidas."],"tier":"Medio"},{"id":"17","group":"WEB","title":"Cross-Site Scripting (XSS)","tool":"DevTools / Burp Suite","theory":"El navegador interpreta contenido no confiable como código cuando se inserta en un contexto inseguro.","evidence":"Plantilla ficticia: comentario de usuario renderizado como HTML sin codificar.","fix":"Usar textContent o escape contextual; sanitizar HTML permitido y añadir CSP como defensa adicional.","verify":"Probar que texto con caracteres HTML se muestra como texto y que la función legítima sigue operativa.","options":["Usar textContent o escape contextual; sanitizar HTML permitido y añadir CSP como defensa adicional.","Insertar todo comentario con innerHTML","Confiar solo en ocultar el formulario"],"tier":"Medio"},{"id":"18","group":"WEB","title":"CSRF","tool":"Burp Suite / DevTools","theory":"Una petición de otro origen puede aprovechar la sesión de un navegador autenticado.","evidence":"Registro ficticio: cambio de correo mediante POST sin token ni comprobación de origen.","fix":"Validar token CSRF ligado a sesión, comprobar origen cuando corresponda y usar SameSite apropiado.","verify":"Una petición sin token válido debe fallar; una operación legítima debe funcionar.","options":["Permitir cambios por GET","Validar token CSRF ligado a sesión, comprobar origen cuando corresponda y usar SameSite apropiado.","Eliminar SameSite y los tokens"],"tier":"Medio"},{"id":"19","group":"WEB","title":"Command Injection","tool":"Revisión de código / Burp Suite","theory":"Concatenar entradas a comandos del sistema puede cambiar las instrucciones ejecutadas.","evidence":"Revisión ficticia: función construye una orden de shell con texto de usuario.","fix":"Sustituir shell por API específica o argumentos separados sin shell; validar opciones y limitar privilegios.","verify":"Comprobar que entradas inesperadas no modifican la operación y que no se invoca una shell.","options":["Concatenar más texto a la orden","Ejecutar el servicio como administrador","Sustituir shell por API específica o argumentos separados sin shell; validar opciones y limitar privilegios."],"tier":"Medio"},{"id":"20","group":"WEB","title":"Carga de archivos insegura","tool":"DevTools / OWASP ZAP","theory":"Archivos no confiables pueden ejecutarse o quedar expuestos cuando se guardan sin controles.","evidence":"Inventario ficticio: archivos de usuarios dentro del directorio ejecutable del sitio.","fix":"Limitar tipos y tamaño, comprobar contenido, generar nombres propios y guardar fuera del webroot sin ejecución.","verify":"Verificar rechazo de tipos no permitidos y que los aceptados se descargan sin ejecutarse.","options":["Limitar tipos y tamaño, comprobar contenido, generar nombres propios y guardar fuera del webroot sin ejecución.","Confiar únicamente en extensión","Otorgar permisos de ejecución a todos los archivos"],"tier":"Medio"},{"id":"21","group":"AUTH","title":"Fuerza bruta","tool":"Simulador local de registros","theory":"Los intentos repetidos de autenticación pueden descubrir contraseñas débiles.","evidence":"Eventos ficticios: 40 fallos de la misma cuenta en un minuto.","fix":"Limitar intentos con retrasos progresivos, MFA y alertas; evitar bloqueos que faciliten DoS.","verify":"Revisar que el límite reduce intentos y que una cuenta legítima puede recuperarse.","options":["Eliminar límites de intentos","Limitar intentos con retrasos progresivos, MFA y alertas; evitar bloqueos que faciliten DoS.","Mostrar si la contraseña es casi correcta"],"tier":"Medio"},{"id":"22","group":"AUTH","title":"Ataque de diccionario","tool":"CyberChef / análisis de política","theory":"Contraseñas frecuentes o predecibles son más fáciles de adivinar.","evidence":"Informe ficticio: política acepta claves comunes de una lista de demostración.","fix":"Bloquear contraseñas comunes o comprometidas y promover contraseñas largas, únicas y MFA.","verify":"Confirmar que las claves de prueba débiles se rechazan y las fuertes se admiten.","options":["Exigir solo una mayúscula","Permitir claves comunes si tienen un número","Bloquear contraseñas comunes o comprometidas y promover contraseñas largas, únicas y MFA."],"tier":"Medio"},{"id":"23","group":"AUTH","title":"Credential Stuffing","tool":"Simulador de registros / Wazuh","theory":"La reutilización de credenciales comprometidas permite intentos en otros servicios.","evidence":"Registro sintético: muchas cuentas reciben intentos desde varios orígenes.","fix":"Usar passkeys o MFA, detección de anomalías y contraseñas únicas; limitar intentos por cuenta y origen.","verify":"Simular el patrón de fallos y comprobar alertas, límites y segundo factor.","options":["Usar passkeys o MFA, detección de anomalías y contraseñas únicas; limitar intentos por cuenta y origen.","Autorizar por coincidencia de correo","Reutilizar las claves entre servicios"],"tier":"Medio"},{"id":"24","group":"AUTH","title":"Usurpación de cuenta (ATO)","tool":"Revisión de sesiones / registros","theory":"Un atacante puede obtener acceso mediante credenciales o sesiones comprometidas.","evidence":"Registro ficticio: inicio desde ubicación nueva y cambio inmediato de correo de recuperación.","fix":"Revocar sesiones sospechosas, exigir reautenticación para cambios sensibles y notificar al titular.","verify":"Comprobar que el token revocado falla y que un cambio sensible requiere verificación.","options":["Mantener activas todas las sesiones","Revocar sesiones sospechosas, exigir reautenticación para cambios sensibles y notificar al titular.","Permitir cambios sensibles sin verificación"],"tier":"Medio"},{"id":"25","group":"AUTH","title":"SIM Swapping","tool":"Simulador de incidentes de identidad","theory":"La transferencia no autorizada de un número puede afectar autenticación basada en SMS.","evidence":"Caso ficticio: se pierde cobertura y aparecen solicitudes de recuperación de cuenta.","fix":"Preferir passkeys o llave física, activar PIN de portabilidad si el operador lo permite y recuperar acceso por canales verificados.","verify":"Confirmar que la recuperación no depende únicamente del número y que los cambios quedan auditados.","options":["Depender exclusivamente de SMS","Enviar el código de recuperación a un tercero","Preferir passkeys o llave física, activar PIN de portabilidad si el operador lo permite y recuperar acceso por canales verificados."],"tier":"Medio"},{"id":"26","group":"CRYPTO","title":"Base64 no es cifrado","tool":"CyberChef","theory":"Base64 representa bytes como texto reversible y no aporta confidencialidad.","evidence":"Dato de práctica: un sistema guarda información sensible solo codificada en Base64.","fix":"Eliminar secretos del cliente y usar cifrado autenticado con claves protegidas cuando se necesite confidencialidad.","verify":"Verificar que ningún secreto viaja en recursos del cliente y que se requiere clave para descifrar.","options":["Eliminar secretos del cliente y usar cifrado autenticado con claves protegidas cuando se necesite confidencialidad.","Aplicar Base64 dos veces","Cambiar el alfabeto Base64"],"tier":"Medio"},{"id":"27","group":"CRYPTO","title":"Hashes débiles de contraseñas","tool":"CyberChef / revisión de configuración","theory":"Un hash rápido sin salt facilita la comprobación masiva de contraseñas si se filtra.","evidence":"Esquema ficticio: contraseñas almacenadas como SHA-256 sin salt.","fix":"Migrar a Argon2id con salt individual y parámetros ajustados; rehash al iniciar sesión y reset si hubo exposición.","verify":"Revisar que hashes de una misma contraseña difieren y que el inicio legítimo sigue funcionando.","options":["Usar MD5","Migrar a Argon2id con salt individual y parámetros ajustados; rehash al iniciar sesión y reset si hubo exposición.","Usar el mismo salt para todos"],"tier":"Medio"},{"id":"28","group":"CRYPTO","title":"XOR con clave expuesta","tool":"CyberChef / DevTools","theory":"Una operación XOR reversible con clave entregada al navegador no mantiene secretos frente al usuario.","evidence":"Revisión ficticia: datos y clave fija aparecen en el JavaScript público.","fix":"Mantener los secretos en el servidor; usar cifrado autenticado con gestión de claves cuando sea necesario.","verify":"Confirmar que los recursos públicos ya no contienen la clave y que la autorización es del servidor.","options":["Renombrar la variable de clave","Ofuscar la misma clave","Mantener los secretos en el servidor; usar cifrado autenticado con gestión de claves cuando sea necesario."],"tier":"Medio"},{"id":"29","group":"CRYPTO","title":"AES con clave expuesta","tool":"DevTools / revisión de secretos","theory":"Un algoritmo fuerte no protege información del usuario que recibe la clave.","evidence":"Inventario ficticio: clave AES incluida en un bundle de frontend.","fix":"Retirar y rotar la clave expuesta; usar un gestor de secretos del servidor y AES-GCM con nonces únicos si aplica.","verify":"Revisar los bundles, rotar la clave y comprobar que el cliente solo recibe datos autorizados.","options":["Retirar y rotar la clave expuesta; usar un gestor de secretos del servidor y AES-GCM con nonces únicos si aplica.","Aumentar longitud dejando la clave pública","Guardar la clave en un comentario"],"tier":"Medio"},{"id":"30","group":"CRYPTO","title":"PRNG predecible","tool":"Revisión de código Python","theory":"Un generador no criptográfico o una semilla conocida no es apropiado para códigos de seguridad.","evidence":"Código ficticio: tokens derivados de un generador sembrado con la hora.","fix":"Usar secrets.token_urlsafe o CSPRNG equivalente; añadir caducidad, uso único y límites de intentos.","verify":"Verificar el uso de CSPRNG y que tokens caducados o usados se rechazan.","options":["Usar la hora con más decimales","Usar secrets.token_urlsafe o CSPRNG equivalente; añadir caducidad, uso único y límites de intentos.","Reutilizar la semilla para todos"],"tier":"Medio"},{"id":"31","group":"SOC","title":"Phishing","tool":"Análisis de correo ficticio","theory":"Mensajes engañosos intentan inducir acciones o revelar datos.","evidence":"Correo simulado: enlace de dominio parecido, urgencia y remitente inconsistente.","fix":"Reportar por canal oficial, verificar el dominio fuera del mensaje, aplicar SPF/DKIM/DMARC y MFA resistente al phishing.","verify":"Comprobar flujo de reporte y rechazo de autenticación en dominios ajenos.","options":["Responder con las credenciales","Desactivar filtros de correo","Reportar por canal oficial, verificar el dominio fuera del mensaje, aplicar SPF/DKIM/DMARC y MFA resistente al phishing."],"tier":"Básico"},{"id":"32","group":"SOC","title":"Spear Phishing","tool":"Análisis de correo ficticio","theory":"El engaño dirigido adapta el pretexto a un cargo o contexto.","evidence":"Correo sintético: supuesta jefatura solicita un pago urgente fuera del procedimiento.","fix":"Verificar por un canal independiente y exigir doble aprobación para cambios de pago.","verify":"Simular una solicitud irregular y confirmar que la segunda aprobación la detiene.","options":["Verificar por un canal independiente y exigir doble aprobación para cambios de pago.","Aprobar por urgencia","Confiar en el nombre visible del remitente"],"tier":"Básico"},{"id":"33","group":"SOC","title":"Smishing","tool":"Análisis de mensajes ficticios","theory":"Un SMS engañoso puede dirigir a una página de suplantación.","evidence":"Mensaje simulado: aviso de entrega con enlace desconocido y solicitud de datos.","fix":"No abrir el enlace; comprobar en la aplicación oficial y reportar el mensaje.","verify":"Verificar que el procedimiento de soporte no solicita claves mediante SMS.","options":["Entregar datos por el enlace","No abrir el enlace; comprobar en la aplicación oficial y reportar el mensaje.","Confiar en cualquier SMS con nombre comercial"],"tier":"Básico"},{"id":"34","group":"SOC","title":"Vishing","tool":"Guion de incidente ficticio","theory":"Una llamada fraudulenta puede hacerse pasar por soporte o una entidad conocida.","evidence":"Caso simulado: interlocutor pide código de un solo uso para supuesta reparación.","fix":"Cortar y devolver la llamada al número oficial; nunca compartir códigos de autenticación.","verify":"Comprobar que el personal sabe reportar y verificar llamadas por canales oficiales.","options":["Compartir el código para agilizar","Confiar en el identificador de llamada","Cortar y devolver la llamada al número oficial; nunca compartir códigos de autenticación."],"tier":"Básico"},{"id":"35","group":"OSINT","title":"Escaneo de puertos","tool":"Nmap / inventario ficticio","theory":"Un inventario de puertos identifica servicios expuestos; no equivale por sí solo a una vulnerabilidad.","evidence":"Salida ficticia: 22 y 443 autorizados; 8080 de administración no previsto.","fix":"Cerrar el servicio innecesario o restringirlo a una red administrativa; mantener inventario.","verify":"Comparar el inventario autorizado con una nueva revisión local.","options":["Cerrar el servicio innecesario o restringirlo a una red administrativa; mantener inventario.","Abrir todos los puertos","Ocultar el banner sin restringir acceso"],"tier":"Básico"},{"id":"36","group":"OSINT","title":"Identificación de servicios","tool":"Nmap / inventario de versiones","theory":"Versiones y servicios expuestos ayudan a priorizar revisiones de seguridad.","evidence":"Inventario simulado: servicio sin soporte con versión obsoleta.","fix":"Actualizar a versión soportada y restringir exposición; comprobar avisos del fabricante.","verify":"Verificar versión instalada, servicio operativo y superficie de red reducida.","options":["Cambiar únicamente el nombre del host","Actualizar a versión soportada y restringir exposición; comprobar avisos del fabricante.","Deshabilitar actualizaciones"],"tier":"Básico"},{"id":"37","group":"OSINT","title":"Metadatos y exposición pública","tool":"ExifTool / documentos ficticios","theory":"Archivos publicados pueden incluir información no necesaria sobre personas o sistemas.","evidence":"Informe ficticio: documento contiene autor interno y ruta de trabajo.","fix":"Eliminar metadatos innecesarios antes de publicar y revisar el contenido por información sensible.","verify":"Inspeccionar una copia limpia y comprobar ausencia de campos sensibles.","options":["Renombrar la extensión","Publicar el archivo original sin revisar","Eliminar metadatos innecesarios antes de publicar y revisar el contenido por información sensible."],"tier":"Básico"},{"id":"38","group":"FORENSIC","title":"Ransomware simulado","tool":"Wazuh / registros ficticios","theory":"El ransomware puede bloquear datos y afectar la disponibilidad; aquí no se ejecuta malware.","evidence":"Eventos sintéticos: cambios masivos de extensiones y alertas EDR.","fix":"Aislar el equipo, preservar evidencia, contener credenciales y recuperar desde respaldos verificados.","verify":"Verificar restauración aislada, integridad y ausencia de actividad anómala.","options":["Aislar el equipo, preservar evidencia, contener credenciales y recuperar desde respaldos verificados.","Borrar todos los registros","Conectar de inmediato el respaldo al equipo afectado"],"tier":"Experto"},{"id":"39","group":"FORENSIC","title":"Análisis de archivo sospechoso","tool":"Autopsy / hashes","theory":"El análisis estático ayuda a preservar y clasificar evidencia sin ejecutar archivos.","evidence":"Ficha ficticia: tipo real distinto de extensión, hash registrado.","fix":"Aislar la muestra inerte, calcular hash y analizar metadatos en entorno dedicado.","verify":"Confirmar coincidencia de hashes de evidencia y registrar cadena de custodia.","options":["Ejecutar en el equipo de producción","Aislar la muestra inerte, calcular hash y analizar metadatos en entorno dedicado.","Modificar el archivo original"],"tier":"Experto"},{"id":"40","group":"FORENSIC","title":"Análisis de tráfico e incidentes","tool":"Wireshark / Wazuh","theory":"Correlacionar registros permite reconstruir un incidente y acotar su impacto.","evidence":"Eventos ficticios: sesión nueva, acceso fuera de horario y transferencia inusual.","fix":"Correlacionar por tiempo e identidad, preservar logs, revocar sesión y limitar salida si corresponde.","verify":"Confirmar cronología, contención y que no continúan eventos anómalos.","options":["Descartar el evento por ser de noche","Eliminar logs antes de investigar","Correlacionar por tiempo e identidad, preservar logs, revocar sesión y limitar salida si corresponde."],"tier":"Experto"},{"id":"41","group":"CTF","title":"Comercio electrónico vulnerable","tool":"Burp Suite / revisión de arquitectura","theory":"La seguridad de una compra depende de validaciones de negocio y de autorización del servidor.","evidence":"Caso ficticio: precio y rol provienen del cliente y se aceptan sin comprobar.","fix":"Recalcular importe desde catálogo del servidor y validar permisos por operación.","verify":"Comprobar que se rechazan importes manipulados y roles sin permiso.","options":["Recalcular importe desde catálogo del servidor y validar permisos por operación.","Confiar en campos readonly","Ocultar botones de administración"],"tier":"Experto"},{"id":"42","group":"CTF","title":"Incidente empresarial integrado","tool":"Wazuh / Wireshark / checklist","theory":"Un incidente puede combinar fallas de autenticación, red y gestión de parches.","evidence":"Caso ficticio: cuenta comprometida, servicio obsoleto y alertas de salida.","fix":"Contener la cuenta y el equipo, preservar evidencia, parchear y verificar antes de recuperar.","verify":"Confirmar credenciales revocadas, versión actualizada y ausencia de conexiones anómalas.","options":["Reinstalar todo sin evidencia","Contener la cuenta y el equipo, preservar evidencia, parchear y verificar antes de recuperar.","Desactivar las alertas"],"tier":"Experto"},{"id":"43","group":"DEF","title":"Firewall Linux","tool":"UFW / nftables","theory":"El filtrado de red limita conexiones según política y reduce exposición.","evidence":"Política ficticia: solo HTTPS público y SSH administrativo.","fix":"Denegar entrada por defecto, permitir HTTPS y restringir SSH a la red administrativa; mantener acceso de recuperación.","verify":"Probar conexiones permitidas y denegadas desde los segmentos de prueba.","options":["Permitir todas las entradas","Bloquear toda salida sin evaluar servicios","Denegar entrada por defecto, permitir HTTPS y restringir SSH a la red administrativa; mantener acceso de recuperación."],"tier":"Medio"},{"id":"44","group":"DEF","title":"Firewall Windows","tool":"Windows Defender Firewall","theory":"Los perfiles y reglas controlan conexiones de aplicaciones y servicios.","evidence":"Registro ficticio: RDP accesible desde perfil público.","fix":"Restringir RDP al perfil y origen administrativo, conservar firewall habilitado y auditar bloqueos.","verify":"Verificar que RDP no responde desde perfil público y sí desde el origen aprobado.","options":["Restringir RDP al perfil y origen administrativo, conservar firewall habilitado y auditar bloqueos.","Desactivar firewall público","Permitir RDP desde cualquier red"],"tier":"Medio"},{"id":"45","group":"DEF","title":"WAF","tool":"ModSecurity / OWASP CRS","theory":"Un WAF inspecciona HTTP y complementa la reparación de aplicaciones.","evidence":"Registro sintético: patrón de solicitud anómalo a una ruta de búsqueda.","fix":"Aplicar reglas gestionadas, revisar falsos positivos y corregir la vulnerabilidad del backend.","verify":"Validar rechazo de la prueba anómala y éxito de solicitudes normales.","options":["Confiar solo en el WAF sin corregir código","Aplicar reglas gestionadas, revisar falsos positivos y corregir la vulnerabilidad del backend.","Desactivar registros del WAF"],"tier":"Medio"},{"id":"46","group":"DEF","title":"IDS / IPS","tool":"Suricata / Snort","theory":"IDS alerta; IPS puede bloquear tráfico según reglas y ubicación.","evidence":"Evento ficticio: firma de tráfico anómalo detectada por IDS.","fix":"Ajustar reglas con tráfico de referencia, alertar al equipo y activar bloqueo solo tras validar falsos positivos.","verify":"Reproducir un evento sintético y comprobar alerta sin afectar tráfico legítimo.","options":["Bloquear todas las alertas sin revisar","Eliminar reglas de detección","Ajustar reglas con tráfico de referencia, alertar al equipo y activar bloqueo solo tras validar falsos positivos."],"tier":"Medio"},{"id":"47","group":"DEF","title":"Monitoreo de seguridad","tool":"Wazuh","theory":"La telemetría centralizada facilita detección y respuesta.","evidence":"Inventario ficticio: servidor crítico sin enviar logs.","fix":"Instalar o reparar agente, proteger transporte, sincronizar hora y definir alertas.","verify":"Generar evento benigno de prueba y confirmar recepción, alerta y hora correcta.","options":["Instalar o reparar agente, proteger transporte, sincronizar hora y definir alertas.","Deshabilitar auditoría local","Enviar logs sin control de acceso"],"tier":"Medio"},{"id":"48","group":"DEF","title":"Gestión de parches","tool":"Gestor de paquetes / Windows Update","theory":"Actualizar software reduce exposición a fallas conocidas.","evidence":"Inventario ficticio: dependencia con aviso de seguridad aplicable.","fix":"Verificar aviso y versión, respaldar, probar parche en staging, desplegar y validar; planificar reversión.","verify":"Confirmar versión corregida y repetir pruebas funcionales.","options":["Aplicar binarios de fuente desconocida","Verificar aviso y versión, respaldar, probar parche en staging, desplegar y validar; planificar reversión.","Ignorar la actualización"],"tier":"Medio"},{"id":"49","group":"DEF","title":"Hardening de servidores","tool":"OpenSSH / revisión de configuración","theory":"La configuración segura reduce privilegios y superficie de ataque.","evidence":"Auditoría ficticia: acceso root remoto y servicios innecesarios.","fix":"Deshabilitar root remoto, exigir claves según política, cerrar servicios innecesarios y probar acceso alternativo.","verify":"Confirmar que acceso legítimo funciona y que root remoto y servicios no requeridos están bloqueados.","options":["Habilitar root para todos","Dar privilegios administrativos al servicio web","Deshabilitar root remoto, exigir claves según política, cerrar servicios innecesarios y probar acceso alternativo."],"tier":"Medio"},{"id":"50","group":"DEF","title":"Protección contra DDoS","tool":"Simulador / rate limiting","theory":"La capacidad local y la protección aguas arriba cumplen funciones diferentes.","evidence":"Métricas ficticias: enlace saturado antes de llegar a la aplicación.","fix":"Activar mitigación del proveedor/CDN, cuotas por ruta y caché; preparar plan de respuesta.","verify":"Validar métricas de disponibilidad bajo carga sintética acotada.","options":["Activar mitigación del proveedor/CDN, cuotas por ruta y caché; preparar plan de respuesta.","Confiar solo en firewall del host","Eliminar límites de aplicación"],"tier":"Medio"},{"id":"51","group":"DEF","title":"Certificados y HTTPS","tool":"OpenSSL / navegador","theory":"TLS autentica el servicio y protege el tráfico cuando se valida correctamente.","evidence":"Informe ficticio: certificado expirado o nombre de host incorrecto.","fix":"Renovar certificado confiable, instalar cadena completa, comprobar nombre y automatizar renovación.","verify":"Comprobar cadena, nombre, vigencia y redirección HTTPS.","options":["Ignorar advertencias del navegador","Renovar certificado confiable, instalar cadena completa, comprobar nombre y automatizar renovación.","Volver a HTTP sin cifrado"],"tier":"Medio"},{"id":"52","group":"DEF","title":"Análisis de registros","tool":"Wazuh / logs","theory":"Los logs necesitan integridad, contexto temporal y acceso restringido.","evidence":"Registro ficticio: marcas horarias inconsistentes y eventos faltantes.","fix":"Sincronizar NTP, centralizar logs con retención y permisos, y alertar ante interrupciones.","verify":"Correlacionar eventos de prueba y confirmar integridad y retención.","options":["Borrar eventos antiguos sin política","Permitir edición por cualquier usuario","Sincronizar NTP, centralizar logs con retención y permisos, y alertar ante interrupciones."],"tier":"Medio"},{"id":"53","group":"DEF","title":"Respaldos y recuperación","tool":"Backup / Restore","theory":"Un respaldo solo es útil si puede restaurarse y se protege de alteraciones.","evidence":"Informe ficticio: copia única conectada y sin prueba de recuperación.","fix":"Aplicar estrategia 3-2-1 con copia aislada o inmutable y pruebas periódicas de restauración.","verify":"Restaurar en entorno separado y comprobar integridad y tiempos de recuperación.","options":["Aplicar estrategia 3-2-1 con copia aislada o inmutable y pruebas periódicas de restauración.","Mantener solo una copia en el servidor","Dar escritura universal al respaldo"],"tier":"Medio"},{"id":"54","group":"DEF","title":"Respuesta a incidentes","tool":"Checklist / Wazuh","theory":"La respuesta combina identificación, contención, erradicación, recuperación y aprendizaje.","evidence":"Caso ficticio: alerta confirmada de acceso no autorizado.","fix":"Preservar evidencia, delimitar impacto, contener, erradicar causa y recuperar con seguimiento.","verify":"Documentar cronología, controles aplicados, verificación y acciones posteriores.","options":["Apagar alertas y continuar","Preservar evidencia, delimitar impacto, contener, erradicar causa y recuperar con seguimiento.","Publicar evidencia sensible sin revisión"],"tier":"Medio"}]};
  levels.forEach((l,i)=>{const [group,fix,verify]=curriculum.original[i];Object.assign(l,{group,fix,verify,tool:'Burp Suite / Repeater',kind:'HTTP real local'});});
  curriculum.scenarios.forEach(s=>levels.push({...s,description:s.theory,category:curriculum.groups[s.group],objective:'Analiza la evidencia ficticia y selecciona la remediación correcta.',kind:'Simulación guiada',fields:[],actions:[],hints:['Revisa qué propiedad de seguridad se pierde.','Busca una corrección de la causa, no solo del síntoma.','Comprueba que el control preserve el uso legítimo.']}));
  const $ = id => document.getElementById(id);
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
  function openLab(id){if(!student)return;$('portal').hidden=true;$('detail').hidden=false;selectLevel(id);document.dispatchEvent(new CustomEvent('city:lab',{detail:{id:current.id,group:current.group,title:current.title,fix:current.fix,description:current.description}}));window.scrollTo(0,0); }
  function defense(l){return `<section class="box defense"><h3>Blue Team · Corrección y protección</h3><p><strong>Remediación:</strong> ${l.fix}</p><p><strong>Verificación:</strong> ${l.verify}</p><p>Prioriza corregir la causa; un firewall o WAF es una capa adicional cuando corresponde.</p></section>`;}
  function renderScenario(l){
    const tier=l.tier==='Básico'?'easy':l.tier==='Medio'?'medium':'hard';
    $('challenge-content').innerHTML=`<div class="topline"><span class="tag ${tier}">${l.group}-${l.id} · ${l.tier}</span><span class="kind">Simulación guiada</span></div><h2>${l.title}</h2><section class="box"><h3>¿Qué es y cómo funciona?</h3><p>${l.theory}</p><h3>Herramienta adecuada</h3><p>${l.tool}. En este ejercicio se analiza evidencia ficticia; no se ejecutan ataques ni se contactan destinos externos.</p></section><section class="box scenario"><h3>Práctica · Evidencia de laboratorio</h3><p>${l.evidence}</p><fieldset><legend>¿Qué remediación aplicarías?</legend>${l.options.map((option,i)=>`<label class="choice"><input type="radio" name="scenario-choice" value="${i}"> <span>${option}</span></label>`).join('')}</fieldset><button class="btn" data-action="scenario">Comprobar decisión</button><p id="scenario-feedback" role="status"></p></section><details class="hint"><summary>Guía de corrección y verificación</summary>${defense(l)}</details>`;
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
      </section></div>${defense(current)}`;
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
        if(current.id===id && feedback.isConnected) feedback.textContent=data?.message||data?.error||'No se pudo comprobar.';
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
    const {response,data}=await send('/api/verify','POST',{level:current.id,flag:$('flag-input').value});
    if(!response) return;
    $('flag-result').textContent = data.message || data.error;
    $('flag-result').classList.toggle('success-text',!!data.correct); $('flag-result').classList.toggle('error-text',!data.correct);
    if(data.correct){document.dispatchEvent(new CustomEvent('city:success'));refresh();}
  });
  $('flag-input').addEventListener('keydown',e=>{if(e.key==='Enter') $('verify').click();});
  $('reset').addEventListener('click',async()=>{
    if(!window.confirm('¿Borrar el progreso y las solicitudes de esta sesión?')) return;
    const {response}=await send('/api/reset','POST',{});
    if(response?.ok){activeRequest=null;activeToken=null;selectLevel(current.id);await refresh();}
  });
  refresh();
})();
