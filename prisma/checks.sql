-- Restricciones que Prisma no expresa y que el dominio sí valida.
--
-- Aplicar DESPUÉS de `npm run db:push`:
--   psql "$DATABASE_URL" -f prisma/checks.sql
--
-- Motivo: Prisma no soporta CHECK constraints en el esquema. La regla del
-- Art. 61 ("el presidente debe ser uno de los marcados como miembro") se
-- valida en dos capas: la base de datos (esta sentencia) y el dominio
-- (`src/domain/ballot.ts` → validateBallot). La validación del servidor es
-- la autoridad; el CHECK es la red de seguridad.

BEGIN;

-- El presidente solo puede estar marcado si también está marcado como miembro.
ALTER TABLE ballot_selections
  ADD CONSTRAINT ballot_selections_president_implies_member
  CHECK (NOT president OR member);

-- Una boleta no puede tener más de una marca de presidente (índice único parcial).
-- Nota: PostgreSQL no admite subconsultas en CHECK constraints.
CREATE UNIQUE INDEX IF NOT EXISTS ballot_selections_single_president_uidx
  ON ballot_selections (ballot_id)
  WHERE president = true;

-- Los puestos derivan de los candidatos: seats = candidatesCount - 2.
ALTER TABLE electoral_processes
  ADD CONSTRAINT electoral_processes_seats_derived
  CHECK (seats = candidates_count - 2);

-- El quórum no puede ser negativo ni superar 100.
ALTER TABLE electoral_processes
  ADD CONSTRAINT electoral_processes_quorum_range
  CHECK (quorum_pct >= 0 AND quorum_pct <= 100);

-- La participación no puede exceder el 100 %.
ALTER TABLE results
  ADD CONSTRAINT results_participation_range
  CHECK (participation >= 0 AND participation <= 100);

-- Una vacante debe tener un sucesor si ya fue resuelta.
ALTER TABLE vacancy_events
  ADD CONSTRAINT vacancy_events_successor_when_resolved
  CHECK (status <> 'RESUELTA' OR successor_id IS NOT NULL);

-- La designación del vicepresidente debe registrar el acto y su fecha.
ALTER TABLE vice_president_designations
  ADD CONSTRAINT vice_president_designations_acta_required
  CHECK (acta IS NOT NULL AND length(trim(acta)) > 0);

COMMIT;
