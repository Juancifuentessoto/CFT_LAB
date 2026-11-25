import json
import unittest
import threading
from http.cookiejar import CookieJar
from urllib.request import build_opener, HTTPCookieProcessor, Request
from urllib.error import HTTPError
from http.server import ThreadingHTTPServer
import server

class LabTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd = ThreadingHTTPServer(('127.0.0.1', 0), server.LabHandler)
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = 'http://127.0.0.1:' + str(cls.httpd.server_port)
    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()
        cls.thread.join()
    def setUp(self):
        self.opener = build_opener(HTTPCookieProcessor(CookieJar()))
    def get(self,path):
        with self.opener.open(self.url+path,timeout=3) as r:
            return json.load(r)
    def post(self,path,body):
        request=Request(self.url+path,data=json.dumps(body).encode(),headers={'Content-Type':'application/json'},method='POST')
        with self.opener.open(request,timeout=3) as r:
            return json.load(r)
    def test_catalog(self):
        self.assertEqual(self.get('/health')['challenges'],54)
        self.assertEqual(len(server.SCENARIO_ANSWERS),44)
        self.assertEqual(len(self.get('/api/state')['solved']),54)
    def test_scenario_and_reset(self):
        for level,choice in server.SCENARIO_ANSWERS.items():
            wrong=self.post('/api/scenario',{'level':level,'choice':(choice+1)%3})
            self.assertFalse(wrong['correct'])
            self.assertNotIn('flag',wrong)
            right=self.post('/api/scenario',{'level':level,'choice':choice})
            self.assertTrue(self.post('/api/verify',{'level':level,'flag':right['flag']})['correct'])
        self.assertEqual(sum(self.get('/api/state')['solved'].values()),44)
        self.post('/api/reset',{})
        self.assertFalse(any(self.get('/api/state')['solved'].values()))
    def test_invalid_scenario(self):
        with self.assertRaises(HTTPError) as ctx:
            self.post('/api/scenario',{'level':'01','choice':0})
        self.assertEqual(ctx.exception.code,400)
    def test_original_route(self):
        self.assertEqual(self.get('/api/basic/invoices?id=4101')['document']['owner'],'visitante')
    def test_student_registration_resume_and_logout(self):
        self.assertIsNone(self.get('/api/state')['student'])
        self.post('/api/student/register', {'name': ' Alumna de prueba '})
        state = self.get('/api/state')
        self.assertEqual(state['student']['name'], 'Alumna de prueba')
        token = state['student']['token']
        self.post('/api/student/avatar', {'avatar': 'shield'})
        choice = server.SCENARIO_ANSWERS['11']
        flag = self.post('/api/scenario', {'level': '11', 'choice': choice})['flag']
        self.assertTrue(self.post('/api/verify', {'level': '11', 'flag': flag})['correct'])
        self.post('/api/student/logout', {})
        self.assertIsNone(self.get('/api/state')['student'])
        self.opener = build_opener(HTTPCookieProcessor(CookieJar()))
        self.post('/api/student/resume', {'token': token})
        self.assertTrue(self.get('/api/state')['solved']['11'])
        self.assertEqual(self.get('/api/state')['student']['avatar'], 'shield')
        self.post('/api/reset', {})
        state = self.get('/api/state')
        self.assertEqual(state['student']['token'], token)
        self.assertFalse(any(state['solved'].values()))
        self.post('/api/student/register', {'name': 'Segundo alumno'})
        other = self.get('/api/state')
        self.assertNotEqual(other['student']['token'], token)
        self.assertFalse(any(other['solved'].values()))
    def test_invalid_student(self):
        for path,body,code in [('/api/student/register',{'name':' '},400),('/api/student/resume',{'token':'no-existe'},404)]:
            with self.assertRaises(HTTPError) as ctx:
                self.post(path,body)
            self.assertEqual(ctx.exception.code,code)
    def test_avatar_requires_student(self):
        with self.assertRaises(HTTPError) as ctx:
            self.post('/api/student/avatar', {'avatar': 'robot'})
        self.assertEqual(ctx.exception.code, 401)
        self.post('/api/student/register', {'name': 'Avatar test'})
        with self.assertRaises(HTTPError) as ctx:
            self.post('/api/student/avatar', {'avatar': 'invalid'})
        self.assertEqual(ctx.exception.code, 400)
    def test_frontend(self):
        with self.opener.open(self.url+'/',timeout=3) as r:
            html=r.read().decode()
        self.assertIn('id="cards"',html)
        self.assertIn('id="student-area" hidden',html)
        self.assertIn('id="register-form"',html)
        self.assertIn('id="resume-form"',html)
        self.assertIn('id="gateway-scene"',html)
        self.assertIn('id="gateway-fallback"',html)
        self.assertIn('id="gateway-new"',html)
        self.assertIn('id="gateway-return"',html)
        self.assertIn('id="city-viewport"',html)
        self.assertIn('id="progress-chart"',html)
        for asset in ('/city.js','/city.css'):
            with self.opener.open(self.url+asset,timeout=3) as r:
                self.assertEqual(r.status,200)
        with self.opener.open(self.url+'/app.js',timeout=3) as r:
            js=r.read().decode()
        self.assertIn('renderPortal',js)
        self.assertIn('Simulación guiada',js)

if __name__=='__main__':
    unittest.main()
