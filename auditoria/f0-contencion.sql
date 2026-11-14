-- F0 · Contención en PRODUCCIÓN (ejecutar a mano contra la BD de Vercel).
--
-- 1) REVISIÓN (solo lectura). Cuentas que el código actual crea solo al
--    iniciar sesión (`ensureDefaultUsers` y `findUserByUsernameOrCi`).
SELECT id, ci, name, role, active, "createdAt"
FROM users
WHERE ci IN ('02091978927', '02031194852', '03080468489', '02111574920')
   OR email LIKE '%@estudiantes.cujae.edu.cu' AND role <> 'VOTER'
ORDER BY "createdAt";

-- Todas las cuentas privilegiadas existentes (deberían ser solo Adrian, Liz y Revisor).
SELECT ci, name, role, active, "createdAt" FROM users
WHERE role IN ('ADMIN', 'COMMISSION', 'OBSERVER') ORDER BY role, "createdAt";

-- Inicios de sesión registrados (quién entró y con qué rol).
SELECT "actorCi", "actorRole", "occurredAt" FROM audit_events
WHERE action = 'INICIO_SESION' ORDER BY "occurredAt" DESC LIMIT 50;

-- Estado y votos actuales del proceso.
SELECT status FROM electoral_processes;
SELECT count(*) AS boletas FROM ballots;

-- 2) DESACTIVACIÓN (descomentar SOLO si la revisión muestra esas cuentas).
-- Es reversible: pone active = false, no borra nada.
-- UPDATE users SET active = false
-- WHERE ci IN ('02091978927', '02031194852', '02111574920')
--   AND name NOT IN ('Adrian', 'Liz', 'Revisor');
