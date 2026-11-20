# BURP LAB — 10 retos CTF con Docker

Aplicación web **deliberadamente vulnerable**, en español, para practicar interceptación y edición de tráfico con **Burp Suite**. Cada ejercicio tiene una flag independiente, dos pistas y verificación de progreso (0/10). Se ejecuta de forma local, sin bases de datos externas y sin dependencias Python adicionales.

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
