-- Restricciones que Prisma no expresa. La validación del servidor es la
-- autoridad; estas restricciones son la red de seguridad.

-- Art. 61: el presidente marcado también debe estar marcado como miembro.
ALTER TABLE "ballot_selections"
  ADD CONSTRAINT "ballot_selections_president_implies_member" CHECK (NOT "president" OR "member");

-- Una boleta tiene como mucho una marca de presidente.
CREATE UNIQUE INDEX "ballot_selections_single_president_uidx"
  ON "ballot_selections" ("ballotId") WHERE "president" = true;

-- Art. 59: los puestos derivan de los candidatos (N = C − 2).
ALTER TABLE "electoral_processes"
  ADD CONSTRAINT "electoral_processes_seats_derived" CHECK ("seats" = "candidatesCount" - 2);

-- Art. 38: quórum general entre 0 y 100; la excepción solo entre 80 y 85 (decisión F2).
ALTER TABLE "electoral_processes"
  ADD CONSTRAINT "electoral_processes_quorum_range" CHECK ("quorumPct" >= 0 AND "quorumPct" <= 100);
ALTER TABLE "electoral_processes"
  ADD CONSTRAINT "electoral_processes_quorum_exception_range"
  CHECK ("quorumExceptionPct" IS NULL OR ("quorumExceptionPct" >= 80 AND "quorumExceptionPct" <= 85));

-- La participación no puede superar el 100 %.
ALTER TABLE "results"
  ADD CONSTRAINT "results_participation_range" CHECK ("participation" >= 0 AND "participation" <= 100);

-- Una vacante resuelta tiene sucesor.
ALTER TABLE "vacancy_events"
  ADD CONSTRAINT "vacancy_events_successor_when_resolved" CHECK ("status" <> 'RESUELTA' OR "successorId" IS NOT NULL);
