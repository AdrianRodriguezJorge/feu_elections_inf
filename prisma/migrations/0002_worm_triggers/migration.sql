-- Blindaje WORM (Art. 66 / RGF-33): las boletas, sus selecciones, las
-- participaciones y la cadena de auditoría no se modifican ni se borran.
--
-- TRUNCATE (que no dispara triggers de fila) solo se permite mientras la urna
-- está vacía: así el seed puede reiniciar una base en pruebas, pero nadie puede
-- vaciar una elección con votos.

CREATE OR REPLACE FUNCTION fn_worm_block() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Violación WORM (Art. 66): % sobre % no está permitido.', TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_worm_truncate_guard() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ballots") THEN
    RAISE EXCEPTION 'Violación WORM (Art. 66): no se puede vaciar % con boletas emitidas.', TG_TABLE_NAME;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_worm_ballots BEFORE UPDATE OR DELETE ON "ballots"
  FOR EACH ROW EXECUTE FUNCTION fn_worm_block();
CREATE TRIGGER trg_worm_ballot_selections BEFORE UPDATE OR DELETE ON "ballot_selections"
  FOR EACH ROW EXECUTE FUNCTION fn_worm_block();
CREATE TRIGGER trg_worm_participations BEFORE UPDATE OR DELETE ON "participations"
  FOR EACH ROW EXECUTE FUNCTION fn_worm_block();
CREATE TRIGGER trg_worm_audit_events BEFORE UPDATE OR DELETE ON "audit_events"
  FOR EACH ROW EXECUTE FUNCTION fn_worm_block();

CREATE TRIGGER trg_worm_truncate_ballots BEFORE TRUNCATE ON "ballots"
  FOR EACH STATEMENT EXECUTE FUNCTION fn_worm_truncate_guard();
CREATE TRIGGER trg_worm_truncate_ballot_selections BEFORE TRUNCATE ON "ballot_selections"
  FOR EACH STATEMENT EXECUTE FUNCTION fn_worm_truncate_guard();
CREATE TRIGGER trg_worm_truncate_participations BEFORE TRUNCATE ON "participations"
  FOR EACH STATEMENT EXECUTE FUNCTION fn_worm_truncate_guard();
CREATE TRIGGER trg_worm_truncate_audit_events BEFORE TRUNCATE ON "audit_events"
  FOR EACH STATEMENT EXECUTE FUNCTION fn_worm_truncate_guard();
