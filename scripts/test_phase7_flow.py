import json
import urllib.request
import urllib.error
import http.cookiejar
import sys

BASE_URL = "http://localhost:3000"

def request_json(path, method="GET", data=None, cookie_opener=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"} if data is not None else {}
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    
    opener = cookie_opener or urllib.request.build_opener()
    try:
        with opener.open(req) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            return e.code, json.loads(content)
        except Exception:
            return e.code, {"raw": content}

def main():
    print("=== TEST E2E FASE 7: Persistencia Relacional, Auth MFA y Blindaje WORM ===")
    
    # 1. Health check
    status, res = request_json("/api/health")
    print(f"1. Health check: HTTP {status} -> status={res.get('status')}")
    assert status == 200 and res.get("status") == "ok"

    # 2. Consultar TOTP actual para la cuenta ADMIN
    admin_ci = "02091978927"
    status, totp_data = request_json(f"/api/auth/totp/current?ci={admin_ci}")
    print(f"2. Consulta de TOTP para ADMIN: HTTP {status} -> token={totp_data.get('token')}")
    assert status == 200 and "token" in totp_data
    token = totp_data["token"]

    # 3. Intentar Login como ADMIN sin código TOTP
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

    status, res = request_json("/api/auth/login", method="POST", data={
        "ci": admin_ci,
        "password": "Admin1234!"
    }, cookie_opener=opener)
    print(f"3. Login ADMIN sin TOTP: HTTP {status} -> requireTotp={res.get('requireTotp')}")
    assert res.get("requireTotp") is True

    # 4. Login como ADMIN con código TOTP válido
    status, res = request_json("/api/auth/login", method="POST", data={
        "ci": admin_ci,
        "password": "Admin1234!",
        "totpToken": token
    }, cookie_opener=opener)
    print(f"4. Login ADMIN con TOTP: HTTP {status} -> ok={res.get('ok')}, role={res.get('user', {}).get('role')}")
    assert status == 200 and res.get("ok") is True
    assert res.get("user", {}).get("role") == "ADMIN"

    # 5. Verificar sesión activa persistida por cookie
    status, session_res = request_json("/api/auth/login", method="GET", cookie_opener=opener)
    print(f"5. Verificación de sesión: authenticated={session_res.get('authenticated')}")
    assert session_res.get("authenticated") is True
    assert session_res.get("user", {}).get("ci") == admin_ci

    # 6. Activación de cuenta de votante a partir del listado de electores
    status, act_res = request_json("/api/auth/activar", method="POST", data={
        "ci": "02052981315",
        "email": "roxana@estudiantes.cujae.edu.cu",
        "password": "VotanteSeguro123!"
    })
    print(f"6. Activación de cuenta electoral: HTTP {status} -> ok={act_res.get('ok')}")
    assert status in (200, 422) # Puede ser 422 si ya fue activada previamente

    # 7. Verificación de la cadena WORM de Auditoría (Art. 66 / RGF-33)
    status, audit_res = request_json("/api/auditoria")
    print(f"7. Auditoría WORM: HTTP {status} -> integrity={audit_res.get('chainIntegrity')}, totalEvents={audit_res.get('totalEvents')}")
    print("Recent events:", json.dumps(audit_res.get("recentEvents"), indent=2))
    assert status == 200 and audit_res.get("chainIntegrity", {}).get("valid") is True

    # 8. Emisión de voto con transacción ACID y urna ciega (INV-04)
    # Consultar estado para obtener un votante que no haya votado
    status, state = request_json("/api/eleccion/estado")
    electors = state.get("electors", [])
    candidates = state.get("candidates", [])
    seats = state.get("summary", {}).get("seats", 9)
    available_voters = [e for e in electors if not e.get("hasVoted")]

    if available_voters and candidates:
        voter = available_voters[0]
        selected_cand = candidates[0]
        selections = [{
            "processCandidateId": selected_cand["candidateId"],
            "member": True,
            "president": True
        }]
        for c in candidates[1:seats]:
            selections.append({
                "processCandidateId": c["candidateId"],
                "member": True,
                "president": False
            })

        status, vote_res = request_json("/api/voto/emitir", method="POST", data={
            "voterCi": voter["ci"],
            "role": "VOTER",
            "selections": selections,
            "isAnnulled": False
        })
        print(f"8. Emisión ACID de boleta para CI {voter['ci']}: HTTP {status} -> {vote_res}")
        assert status == 200 and vote_res.get("ok") is True
        receipt = vote_res["receiptHash"]
        print(f"Receipt: {receipt[:16]}...")

        # 9. Verificación de la boleta inmutable por comprobante (INV-04)
        status, bal_res = request_json(f"/api/voto/comprobante?hash={receipt}")
        ballot = bal_res.get("ballot", {})
        print(f"9. Comprobante anónimo en Urna Ciega: HTTP {status} -> status={ballot.get('status')}")
        assert status == 200 and ballot.get("status") == "VALIDA"

    print("=== TODOS LOS TESTS DE LA FASE 7 COMPLETADOS CON ÉXITO ===")

if __name__ == "__main__":
    main()
