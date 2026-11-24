#!/usr/bin/env python3
"""Burp Suite CTF: servidor vulnerable de forma INTENCIONAL para localhost.

NO PUBLICAR EN REDES. Cada vulnerabilidad está limitada a recursos ficticios.
No hay accesos reales a archivos del host, redes internas ni servicios externos.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import ipaddress
import json
import os
import posixpath
import secrets
import sqlite3
import threading
import time
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
HOST = os.getenv('LAB_HOST', '127.0.0.1')
PORT = int(os.getenv('LAB_PORT', '8000'))
LEVELS = tuple(f'{number:02d}' for number in range(1, 55))
# Las flags son aleatorias por arranque: no se pueden leer del código fuente.
FLAGS = {level: f'FLAG{{LAB_{level}_{secrets.token_hex(6).upper()}}}' for level in LEVELS}
SIGNING_KEY = secrets.token_bytes(32)
# Respuestas de ejercicios de decisión; no se incluyen en app.js.
SCENARIO_ANSWERS = {"11":0,"12":1,"13":2,"14":0,"15":1,"16":2,"17":0,"18":1,"19":2,"20":0,"21":1,"22":2,"23":0,"24":1,"25":2,"26":0,"27":1,"28":2,"29":0,"30":1,"31":2,"32":0,"33":1,"34":2,"35":0,"36":1,"37":2,"38":0,"39":1,"40":2,"41":0,"42":1,"43":2,"44":0,"45":1,"46":2,"47":0,"48":1,"49":2,"50":0,"51":1,"52":2,"53":0,"54":1}

INVOICES = {
    '4101': {'id': 4101, 'owner': 'visitante', 'title': 'Recibo de laboratorio', 'total': 12990, 'detail': 'Documento público de demostración.'},
    '4102': {'id': 4102, 'owner': 'administracion', 'title': 'Informe restringido', 'total': 0, 'detail': FLAGS['01']},
}
# Sistema de archivos virtual: no existe ninguna lectura del disco del anfitrión.
VIRTUAL_FILES = {
    '/public/docs/manual.txt': 'Manual del portal: archivos públicos de ejemplo.',
    '/public/docs/ayuda.txt': 'Contacta al soporte para consultar documentos.',
    '/internal/key.txt': FLAGS['05'],
}

sessions: dict[str, dict] = {}
student_tokens: dict[str, str] = {}
requests_db: dict[str, dict] = {}
lock = threading.RLock()


def new_session():
    return {'username': None, 'role': 'guest', 'student': None, 'solved': {level: False for level in LEVELS}}


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode('ascii').rstrip('=')


def unb64(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + '=' * (-len(value) % 4))


def issue_token() -> str:
    header = b64url(json.dumps({'typ': 'JWT', 'alg': 'HS256'}, separators=(',', ':')).encode())
    payload = b64url(json.dumps({'sub': 'visitante', 'role': 'reader', 'iat': int(time.time())}, separators=(',', ':')).encode())
    signing_input = f'{header}.{payload}'
    signature = b64url(hmac.new(SIGNING_KEY, signing_input.encode(), hashlib.sha256).digest())
    return f'{signing_input}.{signature}'


def decode_vulnerable_token(token: str):
    try:
        if len(token) > 4096:
            return None
        part_header, part_payload, part_signature = token.split('.')
        header = json.loads(unb64(part_header))
        payload = json.loads(unb64(part_payload))
        if not isinstance(header, dict) or not isinstance(payload, dict):
            return None
        # RETO 09: implementación de JWT INSEGURA. Acepta alg=none sin firma.
        if header.get('alg') == 'none' and part_signature == '':
            return payload
        if header.get('alg') != 'HS256':
            return None
        signed = f'{part_header}.{part_payload}'.encode()
        expected = b64url(hmac.new(SIGNING_KEY, signed, hashlib.sha256).digest())
        if not hmac.compare_digest(part_signature, expected):
            return None
        return payload
    except (ValueError, TypeError, UnicodeError, KeyError):
        return None


def simulated_target(host: str) -> str:
    """Convierte formas no convencionales de IPv4 para simular un servicio interno."""
    host = host.lower().rstrip('.')
    try:
        if host.startswith('0x'):
            return str(ipaddress.IPv4Address(int(host, 16)))
        if host.isdecimal():
            return str(ipaddress.IPv4Address(int(host, 10)))
    except (ipaddress.AddressValueError, ValueError):
        pass
    return host


class LabHandler(BaseHTTPRequestHandler):
    server_version = 'BurpSuiteCTF/2.0'
    sys_version = ''

    def log_message(self, fmt, *args):
        print('[%s] %s' % (self.address_string(), fmt % args), flush=True)

    def _session(self):
        cookie = SimpleCookie()
        try:
            cookie.load(self.headers.get('Cookie', ''))
            sid = cookie['lab_session'].value if 'lab_session' in cookie else None
        except Exception:
            sid = None
        with lock:
            if not sid or sid not in sessions:
                sid = secrets.token_urlsafe(24)
                sessions[sid] = new_session()
                self._set_cookie = f'lab_session={sid}; HttpOnly; SameSite=Lax; Path=/'
            else:
                self._set_cookie = None
            return sid, sessions[sid]

    def _use_session(self, sid):
        self._set_cookie = f'lab_session={sid}; HttpOnly; SameSite=Lax; Path=/'

    def _headers(self, status=200, content_type='application/json; charset=utf-8', length=0):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(length))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'")
        if self._set_cookie:
            self.send_header('Set-Cookie', self._set_cookie)
        self.end_headers()

    def _json(self, data, status=200):
        payload = json.dumps(data, ensure_ascii=False, indent=2).encode('utf-8')
        self._headers(status, length=len(payload))
        self.wfile.write(payload)

    def _read_json(self):
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if size < 1 or size > 8192:
                return None
            data = json.loads(self.rfile.read(size))
            return data if isinstance(data, dict) else None
        except (ValueError, UnicodeDecodeError, json.JSONDecodeError):
            return None

    @staticmethod
    def _request_public(item):
        return {key: item.get(key) for key in ('request_id', 'state', 'scope', 'approved_by', 'comment')}

    def do_GET(self):
        sid, session = self._session()
        url = urlparse(self.path)
        path = url.path
        query = parse_qs(url.query)

        if path in ('/', '/index.html', '/app.js'):
            file = 'app.js' if path == '/app.js' else 'index.html'
            content = (ROOT / file).read_bytes()
            mime = 'application/javascript' if file == 'app.js' else 'text/html'
            self._headers(200, f'{mime}; charset=utf-8', len(content))
            self.wfile.write(content)
            return
        if path == '/health':
            self._json({'status': 'ok', 'challenges': len(LEVELS)})
            return
        if path == '/api/state':
            self._json({'player': 'visitante', 'student': session['student'], 'medium_user': session['username'], 'medium_role': session['role'], 'solved': session['solved']})
            return

        # 01: IDOR (no comprueba propietario del recurso).
        if path == '/api/basic/invoices':
            invoice = INVOICES.get(query.get('id', [''])[0])
            self._json({'document': invoice} if invoice else {'error': 'Documento no encontrado'}, 200 if invoice else 404)
            return

        # 03: confianza indebida en una cookie definida por el cliente.
        if path == '/api/basic/staff':
            raw_cookie = SimpleCookie()
            try:
                raw_cookie.load(self.headers.get('Cookie', ''))
                claimed_role = raw_cookie['lab_role'].value if 'lab_role' in raw_cookie else 'guest'
            except Exception:
                claimed_role = 'guest'
            if claimed_role == 'admin':
                self._json({'message': 'Panel interno', 'flag': FLAGS['03']})
            else:
                self._json({'error': 'Se requiere rol admin', 'role': claimed_role}, 403)
            return

        # 04: recurso administrativo tras una autenticación inyectable.
        if path == '/api/medium/portal':
            if session['role'] == 'admin':
                self._json({'message': 'Panel administrativo', 'flag': FLAGS['04']})
            else:
                self._json({'error': 'Solo administradores', 'role': session['role']}, 403)
            return

        # 05: traversal sobre archivos ficticios, sin acceso al sistema real.
        if path == '/api/medium/files':
            name = query.get('name', ['manual.txt'])[0]
            if not isinstance(name, str) or len(name) > 300:
                self._json({'error': 'Nombre inválido'}, 400)
                return
            resolved = posixpath.normpath(posixpath.join('/public/docs', name))
            content = VIRTUAL_FILES.get(resolved)
            if content is None:
                self._json({'error': 'Archivo no encontrado', 'name': name}, 404)
            else:
                self._json({'name': name, 'content': content})
            return

        # 06: toma X-Forwarded-For como fuente confiable (simulación).
        if path == '/api/medium/internal':
            claimed_ip = self.headers.get('X-Forwarded-For', '0.0.0.0').split(',')[0].strip()
            if claimed_ip == '127.0.0.1':
                self._json({'message': 'Tráfico interno aprobado', 'flag': FLAGS['06']})
            else:
                self._json({'error': 'IP no autorizada', 'seen_ip': claimed_ip}, 403)
            return

        # 07: permisos solo en GET; POST no usa la comprobación (ver do_POST).
        if path == '/api/medium/records':
            self._json({'error': 'Acceso restringido a personal interno'}, 403)
            return

        # 08: solicitudes de aprobación y exportación con mass assignment.
        if path == '/api/expert/requests':
            with lock:
                mine = [self._request_public(item) for item in requests_db.values() if item['owner_sid'] == sid]
            self._json({'requests': mine})
            return
        if path.startswith('/api/expert/requests/'):
            req_id = path.rsplit('/', 1)[-1]
            with lock:
                item = requests_db.get(req_id)
                if not item or item['owner_sid'] != sid:
                    self._json({'error': 'Solicitud no encontrada'}, 404)
                    return
                public = self._request_public(item)
            self._json({'request': public})
            return
        if path == '/api/expert/export':
            req_id = query.get('request_id', [''])[0]
            with lock:
                item = requests_db.get(req_id)
                if not item or item['owner_sid'] != sid:
                    self._json({'error': 'Solicitud no encontrada'}, 404)
                    return
                allowed = item['state'] == 'approved' and item['scope'] == 'restricted' and item['approved_by'] == 'audit-bot'
            if allowed:
                self._json({'message': 'Exportación aprobada', 'flag': FLAGS['08']})
            else:
                self._json({'error': 'Pendiente de aprobación', 'requirements': {'state': 'approved', 'scope': 'restricted', 'approved_by': 'audit-bot'}}, 403)
            return

        # 09: se entrega un JWT de usuario normal; solo el vault expone la flag.
        if path == '/api/expert/token':
            self._json({'token': issue_token(), 'scheme': 'Bearer', 'role': 'reader'})
            return
        if path == '/api/expert/vault':
            authorization = self.headers.get('Authorization', '')
            payload = decode_vulnerable_token(authorization[7:]) if authorization.startswith('Bearer ') else None
            if payload and payload.get('role') == 'admin':
                self._json({'message': 'Vault administrativo', 'flag': FLAGS['09']})
            else:
                self._json({'error': 'JWT inválido o rol insuficiente'}, 403)
            return

        self._json({'error': 'Ruta no encontrada'}, 404)

    def do_POST(self):
        sid, session = self._session()
        path = urlparse(self.path).path

        # 07: se omite el control de acceso al utilizar POST (sin cuerpo).
        if path == '/api/medium/records':
            self._json({'message': 'Exportación mediante POST', 'flag': FLAGS['07']})
            return

        body = self._read_json()
        if body is None:
            self._json({'error': 'Envía un objeto JSON válido (máximo 8 KiB)'}, 400)
            return

        if path == '/api/student/register':
            name = body.get('name')
            if not isinstance(name, str) or not name.strip() or len(name.strip()) > 100 or any(ord(c) < 32 for c in name):
                self._json({'error': 'Introduce un nombre válido de 1 a 100 caracteres.'}, 400)
                return
            with lock:
                new_sid = secrets.token_urlsafe(24)
                token = secrets.token_urlsafe(24)
                record = new_session()
                record['student'] = {'name': name.strip(), 'token': token}
                sessions[new_sid] = record
                student_tokens[token] = new_sid
                self._use_session(new_sid)
            self._json({'message': 'Alumno registrado.'}, 201)
            return

        if path == '/api/student/resume':
            token = body.get('token')
            if not isinstance(token, str) or not token or len(token) > 100:
                self._json({'error': 'Introduce un token válido.'}, 400)
                return
            with lock:
                target = student_tokens.get(token.strip())
                if not target or target not in sessions:
                    self._json({'error': 'Token no encontrado o caducado al reiniciar el laboratorio.'}, 404)
                    return
                self._use_session(target)
            self._json({'message': 'Sesión recuperada.'})
            return

        if path == '/api/student/logout':
            with lock:
                new_sid = secrets.token_urlsafe(24)
                sessions[new_sid] = new_session()
                self._use_session(new_sid)
            self._json({'message': 'Sesión cerrada. Puedes retomarla con tu token.'})
            return

        if path == '/api/scenario':
            level, choice = body.get('level'), body.get('choice')
            if not isinstance(level, str) or level not in SCENARIO_ANSWERS or type(choice) is not int or not 0 <= choice <= 2:
                self._json({'error': 'Escenario u opción inválida'}, 400)
                return
            if choice == SCENARIO_ANSWERS[level]:
                self._json({'correct': True, 'message': 'Decisión correcta. Copia la flag al validador.', 'flag': FLAGS[level]})
            else:
                self._json({'correct': False, 'message': 'Revisa la evidencia y la guía de remediación.'})
            return

        if path == '/api/verify':
            level, candidate = body.get('level', ''), body.get('flag', '')
            if not isinstance(level, str) or level not in FLAGS or not isinstance(candidate, str):
                self._json({'error': 'Nivel o flag inválido'}, 400)
                return
            success = hmac.compare_digest(candidate.strip(), FLAGS[level])
            if success:
                with lock:
                    session['solved'][level] = True
            self._json({'correct': success, 'solved': session['solved'], 'message': '¡Flag correcta!' if success else 'Flag incorrecta. Sigue investigando.'})
            return

        if path == '/api/reset':
            with lock:
                replacement = new_session()
                replacement['student'] = session['student']
                sessions[sid] = replacement
                for req_id in [k for k, request in requests_db.items() if request['owner_sid'] == sid]:
                    del requests_db[req_id]
            self._json({'message': 'Progreso y solicitudes reiniciados para esta sesión'})
            return

        # 02: el servidor cree el precio que indica el navegador.
        if path == '/api/basic/checkout':
            sku, price, qty = body.get('sku'), body.get('unit_price'), body.get('quantity')
            if sku != 'KIT-CTF' or type(price) not in (int, float) or type(qty) is not int or qty < 1 or qty > 5:
                self._json({'error': 'Producto, precio o cantidad inválidos'}, 400)
                return
            if not (-999999 <= price <= 999999):
                self._json({'error': 'Precio fuera de rango'}, 400)
                return
            total = round(price * qty, 2)
            result = {'sku': sku, 'quantity': qty, 'total': total, 'currency': 'CLP'}
            if total <= 0:
                result['message'] = 'Orden gratuita concedida por manipulación de precio'
                result['flag'] = FLAGS['02']
            else:
                result['message'] = 'Orden de prueba registrada; no se efectuó ningún cobro.'
            self._json(result)
            return

        # 04: consulta SQL intencionalmente vulnerable, solo a base en memoria.
        if path == '/api/medium/login':
            username, password = body.get('username', ''), body.get('password', '')
            if not isinstance(username, str) or not isinstance(password, str) or len(username) > 200 or len(password) > 200:
                self._json({'error': 'Credenciales inválidas'}, 400)
                return
            db = sqlite3.connect(':memory:')
            try:
                db.execute('CREATE TABLE users(username TEXT, password TEXT, role TEXT)')
                db.executemany('INSERT INTO users VALUES(?,?,?)', [('visitante', 'lab123', 'member'), ('admin', secrets.token_hex(16), 'admin')])
                # ADVERTENCIA: concatenación SQL INSEGURA para el reto 04.
                sql = f"SELECT username, role FROM users WHERE username = '{username}' AND password = '{password}' LIMIT 1"
                try:
                    record = db.execute(sql).fetchone()
                except sqlite3.Error:
                    record = None
            finally:
                db.close()
            if record is None:
                self._json({'error': 'Credenciales incorrectas'}, 401)
            else:
                with lock:
                    session['username'], session['role'] = record
                self._json({'message': 'Autenticado', 'username': record[0], 'role': record[1], 'next': '/api/medium/portal'})
            return

        # 08: nuevo objeto; los atributos protegidos deberían ser inmutables.
        if path == '/api/expert/requests':
            comment = body.get('comment', 'Necesito exportar un informe')
            if not isinstance(comment, str) or len(comment) > 500:
                self._json({'error': 'Comentario inválido'}, 400)
                return
            req_id = 'EX-' + secrets.token_hex(4).upper()
            item = {'request_id': req_id, 'owner_sid': sid, 'state': 'draft', 'scope': 'public', 'approved_by': None, 'comment': comment}
            with lock:
                requests_db[req_id] = item
            self._json({'message': 'Solicitud creada', 'request': self._request_public(item)}, 201)
            return

        # 10: SSRF *simulada*: jamás abre sockets ni realiza fetch de URLs.
        if path == '/api/expert/preview':
            target = body.get('url', '')
            if not isinstance(target, str) or len(target) > 1000:
                self._json({'error': 'URL inválida'}, 400)
                return
            parsed = urlparse(target)
            hostname = parsed.hostname or ''
            if parsed.scheme not in ('http', 'https') or not hostname:
                self._json({'error': 'Se requiere URL http(s) válida'}, 400)
                return
            # Filtro vulnerable: bloquea solo ciertas representaciones textuales.
            if hostname.lower() in ('localhost', '127.0.0.1', 'internal.lab'):
                self._json({'error': 'Host interno bloqueado por el filtro de texto'}, 403)
                return
            resolved = simulated_target(hostname)
            if resolved == '127.0.0.1' and parsed.path == '/internal/flag':
                self._json({'message': 'Servicio interno simulado respondió', 'flag': FLAGS['10'], 'resolved': resolved})
            else:
                self._json({'message': 'Previsualización ficticia: no se realizó una solicitud a Internet', 'host': hostname, 'path': parsed.path})
            return

        self._json({'error': 'Ruta no encontrada'}, 404)

    def do_PATCH(self):
        sid, _ = self._session()
        path = urlparse(self.path).path
        if not path.startswith('/api/expert/requests/'):
            self._json({'error': 'Ruta no encontrada'}, 404)
            return
        body = self._read_json()
        if body is None:
            self._json({'error': 'JSON inválido'}, 400)
            return
        req_id = path.rsplit('/', 1)[-1]
        with lock:
            item = requests_db.get(req_id)
            if not item or item['owner_sid'] != sid:
                self._json({'error': 'Solicitud no encontrada'}, 404)
                return
            # 08: MASS ASSIGNMENT deliberado: acepta campos protegidos.
            for field, value in body.items():
                if field not in {'request_id', 'owner_sid'}:
                    item[field] = value
            public = self._request_public(item)
        self._json({'message': 'Solicitud actualizada', 'request': public})


def main():
    httpd = ThreadingHTTPServer((HOST, PORT), LabHandler)
    print(f'Burp Suite CTF — http://{HOST}:{PORT} (54 laboratorios: 10 HTTP y 44 simulaciones)', flush=True)
    print('PELIGRO: servidor intencionalmente vulnerable; solo para localhost.', flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('Laboratorio detenido.', flush=True)
    finally:
        httpd.server_close()


if __name__ == '__main__':
    main()
