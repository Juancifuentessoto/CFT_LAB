# CTF_LAB — hacking ético y ciberdefensa con Docker

Aplicación web **deliberadamente vulnerable**, en español, para practicar interceptación y edición de tráfico con **Burp Suite**. Cada ejercicio tiene una flag independiente, dos pistas y verificación de progreso (0/54 incluyendo las simulaciones). Se ejecuta de forma local, sin bases de datos externas y sin dependencias Python adicionales.

> **Advertencia de seguridad:** es una aplicación insegura por diseño. Úsala únicamente en tu propio equipo o en una máquina virtual controlada. No la publiques en Internet, no cambies el mapeo del puerto para exponerlo a `0.0.0.0`, y no la reutilices en producción.

## 1. Iniciar con Docker

Necesitas Docker Engine o Docker Desktop y el complemento **Docker Compose v2** (`docker compose version`).

En una terminal, entra a la carpeta descomprimida `burp-lab` (allí están `Dockerfile` y `compose.yaml`):

```bash
docker compose up --build -d
```

Comprueba el estado:

```bash
docker compose ps
docker compose logs -f
```

Abre la aplicación en **http://127.0.0.1:8000**.

Para detenerla:

```bash
docker compose down
```

Para reiniciar desde cero (incluye sesiones y flags):

```bash
docker compose down
docker compose up --build -d
```

La sesión/flags se guardan **en memoria** y se pierden si el contenedor se reinicia. Las flags se generan al arrancar y no se incluyen como texto en los archivos HTML/JS.

Si el puerto `8000` ya está ocupado, en `compose.yaml` cambia **solo el puerto del lado izquierdo**, por ejemplo:

```yaml
ports:
  - "127.0.0.1:8088:8000"
```

En ese caso abre **http://127.0.0.1:8088**.

## 2. Conectar con Burp Suite

1. Abre Burp Suite y ve a **Proxy → Open browser**.
2. Visita `http://127.0.0.1:8000` en ese navegador integrado.
3. En la pestaña **Proxy → HTTP history**, busca `/api/`.
4. Selecciona una solicitud y elige **Send to Repeater**.
5. Cambia el cuerpo JSON, la URL, cookies, método o cabeceras. Reenvía con **Send**.
6. Cuando una respuesta contenga `FLAG{...}`, cópiala en el validador de su ejercicio.

**Nota:** si trabajas desde Kali dentro de una máquina virtual, `127.0.0.1` hace referencia a la propia Kali. Ejecuta Docker y Burp en esa misma máquina para mantener el aislamiento de localhost. Si Docker corre en Windows y Burp en otra VM, necesitarás una configuración de red distinta; no abras el puerto a toda tu red sin controles de aislamiento.

## 3. Los diez retos

| Nº | Dificultad | Vulnerabilidad | Qué practicar |
|---|---|---|---|
| 01 | Básico | IDOR / Broken Object Level Authorization | Parámetros `id` y autorización de objeto |
| 02 | Básico | Manipulación de precio | Modificación de JSON y confianza en datos del cliente |
| 03 | Básico | Privilegios desde cookie | Edición de cabeceras `Cookie` |
| 04 | Medio | SQL Injection (SQLite en memoria) | Autenticación insegura y Repeater |
| 05 | Medio | Path Traversal virtual | Normalización de rutas y nombres de archivo |
| 06 | Medio | Suplantación de IP con HTTP header | `X-Forwarded-For` confiado indebidamente |
| 07 | Medio | Bypass por método HTTP | Autorización distinta por método |
| 08 | Experto | Mass Assignment | Campos extra de JSON, estados de aprobación, secuencia de API |
| 09 | Experto | JWT sin firma (`alg=none`) | Decoder, tokens Bearer y verificación criptográfica defectuosa |
| 10 | Experto | SSRF *simulada* + bypass de filtro | Representaciones de IPv4 y validación de destino |

Los ejemplos de clientes, cuentas, archivos, compras y redes internas son inventados. El reto 05 **no abre archivos reales** y el reto 10 **no realiza peticiones HTTP reales** a ningún destino; el servicio de destino está simulado en memoria. El resto del tráfico es HTTP real entre el navegador, Burp y el servidor del contenedor.

## 4. Archivos

- `index.html`: interfaz visual y retos.
- `app.js`: interacción con la API (no incluye flags).
- `server.py`: backend HTTP deliberadamente vulnerable; genera las flags aleatoriamente al inicio.
- `Dockerfile`: imagen Python ligera, usuario sin privilegios, con healthcheck.
- `compose.yaml`: servicio local con mapeo **solo** a `127.0.0.1`.
- `SOLUCIONES.md`: orientación y peticiones de solución. **Contiene spoilers.**

## 5. Diagnóstico

- **No abre la página:** comprueba `docker compose ps` y `docker compose logs`.
- **Error al construir:** verifica que Docker esté activo con `docker info`.
- **`docker-compose` no existe:** usa la sintaxis actual `docker compose` (espacio).
- **Puerto ocupado:** cambia el puerto local del mapeo como se indica arriba.
- **Una flag ya no valida:** si se reinició el contenedor, las flags cambiaron; vuelve a obtenerlas.

## 6. Ejecución sin Docker (alternativa)

```bash
python3 server.py
```

En este modo el servidor escucha en `127.0.0.1:8000` por defecto. La imagen Docker define `LAB_HOST=0.0.0.0` **únicamente dentro del contenedor**, mientras que Compose restringe la publicación en el anfitrión a `127.0.0.1`.

## 7. Portal y aprendizaje defensivo

El portal agrupa **54 laboratorios** en nueve módulos: Hacking de redes; Aplicaciones web; Credenciales y accesos; Criptografía; Ingeniería social; Reconocimiento y OSINT; Malware y análisis forense; Desafíos integradores; Blue Team y ciberdefensa. Los 10 retos HTTP originales conservan sus rutas y flags, y muestran una guía de corrección y verificación. Los 44 nuevos son **simulaciones guiadas**, no ataques ejecutables: cada uno presenta teoría, herramienta de referencia, evidencia ficticia, opciones de remediación y verificación. El servidor emite una flag tras una decisión correcta y el validador registra el progreso en la sesión. No hay escaneo externo, envío de correos, generación de tráfico de ataque ni ejecución de malware.

La interfaz usa un tema oscuro, tarjetas, filtros por módulo y un indicador de progreso. La pantalla de bienvenida solicita el nombre o alias del alumno y genera un token aleatorio individual para recuperar su progreso desde otro navegador conectado al mismo servidor. El botón Salir conserva el progreso; Reiniciar mi progreso borra los ejercicios resueltos sin cambiar la identidad ni el token. La sesión es local y en memoria: nombres, tokens y progreso se pierden si se reinicia el servidor. No hay panel docente, autenticación institucional ni flags individuales (las flags siguen siendo comunes al arranque del laboratorio). La identificación controla la navegación de la interfaz; los endpoints de práctica originales permanecen accesibles para Burp. Las herramientas indicadas no están instaladas en el contenedor. Las guías de defensa son educativas: no modifican el firewall, la red o el código del anfitrión.

### Comprobación rápida

Tras iniciar el servidor, visita /health y comprueba que challenges es 54. Abre el portal, verifica los nueve filtros, entra en el reto 01 y confirma que el endpoint original responde; abre un escenario nuevo, prueba una respuesta incorrecta y otra correcta, valida la flag y comprueba que el progreso aumenta. Reinicia el progreso y comprueba que vuelve a cero.

### Identificación de alumnos

Abre el portal en un navegador nuevo: introduce nombre o alias y pulsa Comenzar. Guarda el token mostrado en el portal. Pulsa Salir o usa otro navegador del mismo servidor, introduce el token en Retomar y comprueba que se conservan los retos resueltos. No compartas el token. No utilices información personal sensible ni expongas el servidor deliberadamente vulnerable a Internet.

## Cyber City 2.0

El portal incorpora una ciudad 3D Three.js (nueve distritos, selección por edificios, giro y zoom), gráficos D3.js con el progreso real y topologías conceptuales interactivas antes/después de la corrección. Las tarjetas permanecen disponibles si WebGL falla. Puedes pausar el movimiento y cambiar entre tema claro y oscuro. Los sonidos sintetizados son opcionales y están desactivados inicialmente. El avatar se guarda con el alumno en memoria; rangos y seis logros se calculan a partir de flags verificadas. Tema, sonido y preferencia de animación se guardan en el navegador.

Docker descarga las dependencias fijadas en package.json durante la construcción y copia los recursos locales a la imagen; no se usan CDN durante la ejecución. Primera construcción requiere Internet. Para iniciar sin Docker, ejecuta primero `npm install --ignore-scripts` y `npm run vendor` (Node.js 22 recomendado), luego `python3 server.py`. Sin recursos opcionales, las tarjetas y los retos HTTP siguen accesibles con fuentes del sistema. No se distribuyen herramientas externas de ataque ni se generan peticiones fuera del laboratorio. Los diagramas ilustran conceptos, no capturan tráfico real.

Rangos por número de retos resueltos: Explorador (0), Operador (5), Analista (15), Especialista (27), Arquitecto de seguridad (42), Guardián de Cyber City (54). No se cambian las flags ni los desafíos. Los nombres, avatar, tokens y progreso siguen en memoria y se pierden al reiniciar el servidor.

### Puesto de acceso Cyber City

La bienvenida utiliza una vista previa 3D animada de los nueve distritos, con una ilustración SVG local como alternativa si no hay WebGL. El movimiento se puede pausar y respeta la preferencia de movimiento reducido. Los formularios Nuevo alumno y Tengo un token conservan las mismas rutas de registro y recuperación. La escena se libera al abandonar la pantalla de acceso; el tema claro/oscuro también se aplica a esta vista.

### Rangos académicos automáticos

El servidor calcula los seis rangos a partir de misiones distintas resueltas (0, 5, 15, 27, 42 y 54). El selector cambia únicamente el icono cosmético; ningún campo de perfil permite asignarse rangos. Los rangos futuros se muestran bloqueados, los anteriores obtenidos y el actual destacado. Repetir una flag no suma otra misión; reiniciar el progreso devuelve a Explorador. Los datos siguen en memoria como antes.
