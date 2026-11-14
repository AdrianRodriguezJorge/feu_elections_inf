import { PrismaClient, StructureType, ProcessType, ProcessStatus, UserRole as PrismaUserRole, Office } from "@prisma/client";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateMfaSecret, hashPassword } from "../src/domain/auth";
import { createGenesisAuditEntry } from "../src/domain/audit";
import { buildCandidacySnapshot, CandidateInput } from "../src/domain/candidates";

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

// Cada autoridad recibe su propio secreto TOTP. En desarrollo local el código vigente
// se consulta en /api/auth/totp/current?id=<nombre o carnet> (no existe en producción).

/** Códigos de brigada reales de la Facultad de Ingeniería Informática. */
const BRIGADE_CODES = ["11", "12", "22", "32", "41"];

/** 10 candidatos oficiales de la Facultad (siglo XX). */
const CANDIDATES: Array<{
  id: string;
  firstSurname: string;
  secondSurname: string | null;
  name: string;
  ci: string;
  brigade: string;
  year: number;
  biographyMd: string;
}> = [
  { id: "can-01", firstSurname: "Mendoza", secondSurname: "Ramos", name: "Carlos", ci: "98021411223", brigade: "41", year: 4, biographyMd: "Estudiante de 4to año. Promedio: 4.85. Miembro activo de la FEU." },
  { id: "can-02", firstSurname: "Navarro", secondSurname: "Pino", name: "Beatriz", ci: "98052122334", brigade: "41", year: 4, biographyMd: "Estudiante de 4to año. Delegada deportiva de la facultad." },
  { id: "can-03", firstSurname: "Gómez", secondSurname: "Herrera", name: "Daniel", ci: "98081533445", brigade: "22", year: 3, biographyMd: "Estudiante de 3er año. Presidente de brigada 22." },
  { id: "can-04", firstSurname: "Castillo", secondSurname: "Vargas", name: "Elena", ci: "98110344556", brigade: "22", year: 3, biographyMd: "Estudiante de 3er año. Activista de extensión universitaria." },
  { id: "can-05", firstSurname: "Iglesias", secondSurname: "Morales", name: "Fernando", ci: "99031255667", brigade: "12", year: 2, biographyMd: "Estudiante de 2do año. Secretario de docencia de brigada." },
  { id: "can-06", firstSurname: "Ortega", secondSurname: "Serrano", name: "Gabriela", ci: "99062566778", brigade: "12", year: 2, biographyMd: "Estudiante de 2do año. Coordinadora cultural." },
  { id: "can-07", firstSurname: "Paredes", secondSurname: "Fuentes", name: "Héctor", ci: "99090877889", brigade: "11", year: 1, biographyMd: "Estudiante de 1er año. Delegado de brigada 11." },
  { id: "can-08", firstSurname: "Romero", secondSurname: "Cruz", name: "Isabel", ci: "99101988990", brigade: "11", year: 1, biographyMd: "Estudiante de 1er año. Organizadora estudiantil." },
  { id: "can-09", firstSurname: "Soto", secondSurname: "Delgado", name: "Javier", ci: "99120499001", brigade: "32", year: 3, biographyMd: "Estudiante de 3er año. Ayudante de cátedra." },
  { id: "can-10", firstSurname: "Molina", secondSurname: "Reyes", name: "Katia", ci: "97070710293", brigade: "32", year: 4, biographyMd: "Estudiante de 4to año. Vanguardia integral." },
];

/** 10 electores estudiantes base del padrón (siglo XX). */
const ELECTORS: Array<{
  ci: string;
  firstName: string;
  firstSurname: string;
  secondSurname: string | null;
  fullName: string;
  brigadeCode: string;
}> = [
  { ci: "98021411223", firstName: "Carlos", firstSurname: "Mendoza", secondSurname: "Ramos", fullName: "Carlos Mendoza Ramos", brigadeCode: "41" },
  { ci: "98052122334", firstName: "Beatriz", firstSurname: "Navarro", secondSurname: "Pino", fullName: "Beatriz Navarro Pino", brigadeCode: "41" },
  { ci: "98081533445", firstName: "Daniel", firstSurname: "Gómez", secondSurname: "Herrera", fullName: "Daniel Gómez Herrera", brigadeCode: "22" },
  { ci: "98110344556", firstName: "Elena", firstSurname: "Castillo", secondSurname: "Vargas", fullName: "Elena Castillo Vargas", brigadeCode: "22" },
  { ci: "99031255667", firstName: "Fernando", firstSurname: "Iglesias", secondSurname: "Morales", fullName: "Fernando Iglesias Morales", brigadeCode: "12" },
  { ci: "99062566778", firstName: "Gabriela", firstSurname: "Ortega", secondSurname: "Serrano", fullName: "Gabriela Ortega Serrano", brigadeCode: "12" },
  { ci: "99090877889", firstName: "Héctor", firstSurname: "Paredes", secondSurname: "Fuentes", fullName: "Héctor Paredes Fuentes", brigadeCode: "11" },
  { ci: "99101988990", firstName: "Isabel", firstSurname: "Romero", secondSurname: "Cruz", fullName: "Isabel Romero Cruz", brigadeCode: "11" },
  { ci: "99120499001", firstName: "Javier", firstSurname: "Soto", secondSurname: "Delgado", fullName: "Javier Soto Delgado", brigadeCode: "32" },
  { ci: "97070710293", firstName: "Katia", firstSurname: "Molina", secondSurname: "Reyes", fullName: "Katia Molina Reyes", brigadeCode: "32" },
];

async function dropWormTriggers() {
  try {
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trg_prevent_ballot_update ON ballots;`);
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trg_prevent_ballot_delete ON ballots;`);
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trg_prevent_audit_update ON audit_events;`);
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trg_prevent_audit_delete ON audit_events;`);
  } catch (e) {
    console.warn("Aviso al remover triggers:", e);
  }
}

async function applyWormTriggers() {
  // Triggers PL/pgSQL para garantizar WORM a nivel de motor de PostgreSQL
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION fn_prevent_ballot_mutation()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Violacion WORM (Art. 66 / RGF-33): Prohibido modificar boletas emitidas.';
      ELSIF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Violacion WORM (Art. 66 / RGF-33): Prohibido eliminar boletas de la urna ciega.';
      END IF;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION fn_prevent_audit_mutation()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Violacion WORM (Art. 66 / RGF-33): Prohibido modificar eventos de la cadena de auditoria.';
      ELSIF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Violacion WORM (Art. 66 / RGF-33): Prohibido eliminar eventos de la cadena de auditoria.';
      END IF;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_prevent_ballot_update
    BEFORE UPDATE ON ballots
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_ballot_mutation();
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_prevent_ballot_delete
    BEFORE DELETE ON ballots
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_ballot_mutation();
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_prevent_audit_update
    BEFORE UPDATE ON audit_events
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_audit_mutation();
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_prevent_audit_delete
    BEFORE DELETE ON audit_events
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_audit_mutation();
  `);
}

async function main() {
  console.log("Iniciando sembrado completo en PostgreSQL (FEU)...");

  // 1. Deshabilitar triggers temporalmente para permitir limpieza
  await dropWormTriggers();

  // 2. Limpieza en orden
  await prisma.ballotSelection.deleteMany();
  await prisma.ballot.deleteMany();
  await prisma.participation.deleteMany();
  await prisma.resultCandidate.deleteMany();
  await prisma.result.deleteMany();
  await prisma.processCandidate.deleteMany();
  await prisma.candidacy.deleteMany();
  await prisma.vicePresidentDesignation.deleteMany();
  await prisma.vacancyEvent.deleteMany();
  await prisma.act.deleteMany();
  await prisma.claim.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.importError.deleteMany();
  await prisma.importBatch.deleteMany();
  await prisma.regulationArticle.deleteMany();
  await prisma.commissionSeat.deleteMany();
  await prisma.commission.deleteMany();
  await prisma.electoralProcess.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.brigade.deleteMany();
  await prisma.structure.deleteMany();
  await prisma.user.deleteMany();

  // 3. Estructura y Brigadas
  const faculty = await prisma.structure.create({
    data: { type: StructureType.FACULTAD, name: "Facultad de Ingeniería Informática", level: 2 },
  });

  const brigades = new Map<string, string>();
  for (const code of BRIGADE_CODES) {
    const brigade = await prisma.brigade.create({
      data: { structureId: faculty.id, code, name: `Brigada ${code}` },
    });
    brigades.set(code, brigade.id);
  }

  // 4. Usuarios Persona Oficiales (F2 / F7)
  const adminUser = await prisma.user.create({
    data: {
      ci: "99091978927",
      email: "adrian@estudiantes.cujae.edu.cu",
      name: "Adrian",
      passwordHash: hashPassword("99091978927"),
      mfaSecret: generateMfaSecret(),
      role: PrismaUserRole.ADMIN,
      active: true,
    },
  });

  const commissionPresident = await prisma.user.create({
    data: {
      ci: "06091668099",
      email: "liz@estudiantes.cujae.edu.cu",
      name: "Liz",
      passwordHash: hashPassword("06091668099"),
      mfaSecret: generateMfaSecret(),
      role: PrismaUserRole.COMMISSION,
      active: true,
    },
  });

  const commissionSecond = await prisma.user.create({
    data: {
      ci: "11111111111",
      email: "revisor@estudiantes.cujae.edu.cu",
      name: "Revisor",
      passwordHash: hashPassword("11111111111"),
      mfaSecret: generateMfaSecret(),
      role: PrismaUserRole.COMMISSION,
      active: true,
    },
  });

  // 5. Candidatos de la Facultad
  const candidateInputs: CandidateInput[] = CANDIDATES.map((c) => ({
    id: c.id,
    studentId: `CAN-${c.ci.slice(-6)}`,
    name: c.name,
    firstSurname: c.firstSurname,
    secondSurname: c.secondSurname ?? undefined,
    ci: c.ci,
    brigadeCode: c.brigade,
    biographyMd: c.biographyMd,
  }));

  const snapshotOutcome = buildCandidacySnapshot(candidateInputs);
  const seats = CANDIDATES.length - 2; // 9 puestos (RGF-08)

  const candidateMap = new Map<string, string>();
  for (const c of CANDIDATES) {
    const candRecord = await prisma.candidate.create({
      data: {
        studentId: `CAN-${c.ci.slice(-6)}`,
        firstSurname: c.firstSurname,
        secondSurname: c.secondSurname,
        name: c.name,
        ci: c.ci,
        facultyId: faculty.id,
        brigadeId: brigades.get(c.brigade) ?? null,
        year: c.year,
        biographyMd: c.biographyMd,
        brigadeValidated: true,
      },
    });
    candidateMap.set(c.ci, candRecord.id);
  }

  // 6. Proceso Electoral en CONVOCADO
  const process = await prisma.electoralProcess.create({
    data: {
      structureId: faculty.id,
      type: ProcessType.SECRETARIADO,
      academicYear: "2026-2027",
      status: ProcessStatus.CONVOCADO,
      candidatesCount: CANDIDATES.length,
      seats,
      proposalSlots: 0,
      votingMode: "SECRET",
      quorumPct: 85,
      majorityRule: "TOP_N",
      tieRule: "PRESIDENT_VOTES_THEN_RUNOFF",
      columns: ["NAME", "BRIGADE", "MEMBER", "PRESIDENT"],
      snapshotHash: snapshotOutcome.candidacyHash,
    },
  });

  await prisma.candidacy.create({
    data: {
      processId: process.id,
      status: "CONGELADA",
      totalCandidates: CANDIDATES.length,
      hash: snapshotOutcome.candidacyHash,
    },
  });

  // 7. Asociar Candidatos al Proceso con Posición Inmutable
  let pos = 1;
  for (const snap of snapshotOutcome.snapshot) {
    const candDbId = candidateMap.get(snap.ci);
    if (!candDbId) continue;
    await prisma.processCandidate.create({
      data: {
        id: snap.candidateId,
        processId: process.id,
        candidateId: candDbId,
        ballotPosition: pos++,
        status: "ACTIVO",
        office: Office.NO_ELECTO,
      },
    });
  }

  // 8. Listado de Electores (Padrón)
  // Incluye el administrador, las autoridades electorales y los 10 estudiantes
  const allElectors = [
    { ci: adminUser.ci!, firstName: "Adrian", firstSurname: "", secondSurname: null, fullName: "Adrian", brigadeCode: "41" },
    { ci: commissionPresident.ci!, firstName: "Liz", firstSurname: "", secondSurname: null, fullName: "Liz", brigadeCode: "41" },
    { ci: commissionSecond.ci!, firstName: "Revisor", firstSurname: "", secondSurname: null, fullName: "Revisor", brigadeCode: "41" },
    ...ELECTORS,
  ];

  for (const elector of allElectors) {
    const userMatch =
      elector.ci === adminUser.ci
        ? adminUser
        : elector.ci === commissionPresident.ci
        ? commissionPresident
        : elector.ci === commissionSecond.ci
        ? commissionSecond
        : null;

    // Los electores se siembran SIN activar: cada uno activa su cuenta con su carnet
    // y elige su contraseña (decisión F1). Las autoridades llegan activadas.
    let userRecord = userMatch;
    if (!userRecord) {
      userRecord = await prisma.user.create({
        data: {
          ci: elector.ci,
          email: `${elector.ci}@sin-correo.invalid`,
          name: elector.fullName,
          passwordHash: null,
          mfaSecret: null,
          role: PrismaUserRole.VOTER,
          active: true,
        },
      });
    }

    await prisma.membership.create({
      data: {
        structureId: faculty.id,
        studentId: elector.ci,
        fullName: elector.fullName,
        firstName: elector.firstName,
        lastName: elector.firstSurname || elector.firstName,
        userId: userRecord.id,
        brigadeId: brigades.get(elector.brigadeCode) ?? null,
        eligible: true,
      },
    });
  }

  // 9. Comisión Electoral
  const commission = await prisma.commission.create({
    data: {
      processId: process.id,
      presidentId: commissionPresident.id,
      vicePresidentId: commissionSecond.id,
      members: BRIGADE_CODES,
      acta: "Acta de constitución de la Comisión Electoral (Facultad de Ingeniería Informática).",
    },
  });

  await prisma.commissionSeat.create({
    data: { commissionId: commission.id, userId: commissionPresident.id, role: "PRESIDENTE" },
  });
  await prisma.commissionSeat.create({
    data: { commissionId: commission.id, userId: commissionSecond.id, role: "SECRETARIO" },
  });

  // 10. Reglamento Oficial
  try {
    const regFile = readFileSync(resolve(__dirname, "regulation.seed.json"), "utf8");
    const regulation = JSON.parse(regFile) as {
      document: string;
      articles: Array<{
        part: string;
        article: string;
        page: number | null;
        literalText: string;
      }>;
    };

    for (const item of regulation.articles) {
      await prisma.regulationArticle.create({
        data: {
          document: regulation.document,
          part: item.part,
          article: item.article,
          page: item.page,
          literalText: item.literalText,
          sourceHash: "ABC-FEU-2019.pdf",
        },
      });
    }
  } catch (regErr) {
    console.warn("Aviso: no se encontró regulation.seed.json, continuando...", regErr);
  }

  // 11. Evento Génesis WORM
  const genesis = createGenesisAuditEntry({
    process: "Elección del Secretariado - Facultad de Ingeniería Informática",
    seats,
    candidacyHash: snapshotOutcome.candidacyHash,
    eligibleMembers: allElectors.length,
  });

  await prisma.auditEvent.create({
    data: {
      processId: process.id,
      sequence: genesis.sequence,
      actorCi: genesis.actorCi,
      actorRole: genesis.actorRole,
      action: genesis.eventType,
      entity: "PROCESO",
      details: JSON.parse(JSON.stringify(genesis.details)),
      prevHash: genesis.prevHash,
      hash: genesis.hash,
      occurredAt: new Date(genesis.timestamp),
      payloadHash: genesis.hash,
    },
  });

  // 12. Activar Blindaje WORM
  await applyWormTriggers();

  console.log(
    `[SEED] PostgreSQL sembrado exitosamente: ` +
    `${CANDIDATES.length} candidatos, ${seats} puestos, ` +
    `${allElectors.length} electores en padrón (sin activar), 3 autoridades con TOTP propio, ` +
    `cadena WORM con génesis, y triggers PL/pgSQL activos.`,
  );
}

main()
  .catch((e) => {
    console.error("Error en el seed de PostgreSQL:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
