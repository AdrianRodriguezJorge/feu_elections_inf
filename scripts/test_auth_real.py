#!/usr/bin/env python3
"""
Prueba integral del nuevo sistema de autenticación real sin correos.
Reglas:
- Nombre como usuario
- Carnet de Identidad (11 dígitos) como contraseña
- MFA TOTP para roles oficiales (ADMIN, COMMISSION)
- Sin dependencia de correos electrónicos
"""

import sys
import json
import urllib.request
import urllib.error

BASE_URL = "http://localhost:3000"

def request_json(path, method="GET", data=None, cookies=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if cookies:
        headers["Cookie"] = cookies

    encoded_data = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            cookie_headers = resp.headers.get_all("Set-Cookie") or []
            cookie_str = "; ".join([c.split(";")[0] for c in cookie_headers])
            return resp.status, json.loads(body) if body else {}, cookie_str
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        cookie_headers = e.headers.get_all("Set-Cookie") or []
        cookie_str = "; ".join([c.split(";")[0] for c in cookie_headers])
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = {"raw": body}
        return e.code, parsed, cookie_str

def main():
    print("=" * 60)
    print("VERIFICACIÓN DEL SISTEMA DE LOGIN REAL (NOMBRE + CI)")
    print("=" * 60)

    # 1. Health check
    status, data, _ = request_json("/api/health")
    assert status == 200, f"Health check falló: {data}"
    print(f"✓ Servidor activo en PostgreSQL: {data.get('database')}")

    # 2. Login Elector base: Adán Adán Cabrera / 03080468489
    status, data, cookies = request_json("/api/auth/login", method="POST", data={
        "username": "Adán Adán Cabrera",
        "password": "03080468489",
    })
    assert status == 200 and data.get("ok") is True, f"Login de Adán falló: {data}"
    assert data["user"]["role"] == "VOTER"
    assert data["user"]["ci"] == "03080468489"
    print(f"✓ Login exitoso para Elector (Adán Adán Cabrera) con rol VOTER")

    # Verificar sesión de Adán
    status, session, _ = request_json("/api/auth/login", method="GET", cookies=cookies)
    assert status == 200 and session.get("authenticated") is True
    print(f"✓ Cookie de sesión verificada para Adán ({session['user']['name']})")

    # 3. Login Observador: Dayron Batista Díaz / 02111574920
    status, data, _ = request_json("/api/auth/login", method="POST", data={
        "username": "Dayron Batista Díaz",
        "password": "02111574920",
    })
    assert status == 200 and data.get("ok") is True, f"Login de Dayron falló: {data}"
    assert data["user"]["role"] == "OBSERVER"
    print(f"✓ Login exitoso para Observador (Dayron Batista Díaz) con rol OBSERVER")

    # 4. Login Admin (Requiere TOTP): Adrián Rodríguez Jorge / 02091978927
    status, data, _ = request_json("/api/auth/login", method="POST", data={
        "username": "Adrián Rodríguez Jorge",
        "password": "02091978927",
    })
    assert status == 200 and data.get("requireTotp") is True, f"Se esperaba requireTotp: {data}"
    print(f"✓ Admin detectado, solicitando segundo factor TOTP (MFA)")

    # Obtener token TOTP actual
    _, totp_data, _ = request_json("/api/auth/totp/current")
    token = totp_data.get("token")
    assert token, "No se pudo obtener token TOTP"

    status, data, admin_cookies = request_json("/api/auth/login", method="POST", data={
        "username": "Adrián Rodríguez Jorge",
        "password": "02091978927",
        "totpToken": token,
    })
    assert status == 200 and data.get("ok") is True, f"Login con TOTP falló: {data}"
    assert data["user"]["role"] == "ADMIN"
    print(f"✓ Login exitoso para Administrador con MFA TOTP confirmado")

    # 5. Login Presidente de Comisión: Elena García Méndez / 02031194852
    status, data, _ = request_json("/api/auth/login", method="POST", data={
        "username": "Elena García Méndez",
        "password": "02031194852",
        "totpToken": token,
    })
    assert status == 200 and data.get("ok") is True, f"Login de Elena falló: {data}"
    assert data["user"]["role"] == "COMMISSION"
    print(f"✓ Login exitoso para Presidenta de Comisión Electoral con rol COMMISSION")

    # 6. Login estudiante del listado general: Roxana Almaguer Sosa / 02052981315
    status, data, _ = request_json("/api/auth/login", method="POST", data={
        "username": "Roxana Almaguer Sosa",
        "password": "02052981315",
    })
    assert status == 200 and data.get("ok") is True, f"Login de Roxana falló: {data}"
    assert data["user"]["role"] == "VOTER"
    print(f"✓ Login exitoso para estudiante del listado general (Roxana Almaguer Sosa)")

    # 7. Rechazo con contraseña incorrecta
    status, data, _ = request_json("/api/auth/login", method="POST", data={
        "username": "Adán Adán Cabrera",
        "password": "contraseña_invalida",
    })
    assert status == 401, f"Se esperaba 401 para clave incorrecta: {status}"
    print(f"✓ Acceso rechazado correctamente con 401 ante CI/contraseña incorrecta")

    print("=" * 60)
    print("TODAS LAS PRUEBAS DE AUTENTICACIÓN Y ROLES PASARON CON ÉXITO")
    print("=" * 60)

if __name__ == "__main__":
    main()

