/**
 * Seed de la elección del Secretariado (Facultad de Ingeniería Informática).
 *
 * Deja la base en estado inicial limpio: estructura, brigadas, autoridades y una
 * candidatura de demostración, con el proceso en CONVOCADO.
 *
 *  - Se niega a ejecutarse si hay boletas emitidas: una elección con votos nunca
 *    se reinicia (además, los triggers WORM impiden vaciar la urna).
 *  - Nadie recibe contraseña: autoridades y electores activan su cuenta con su
 *    carnet y eligen la suya (decisión F3).
 *  - Cada autoridad recibe su propio secreto TOTP (el segundo factor está
 *    desactivado por ahora; se activa con AUTH_MFA_ENABLED=true).
 *  - Carnets de prueba válidos (validateCI) y sin correos electrónicos.
 */

import { CommissionRole, Office, PrismaClient, ProcessStatus, ProcessType, StructureType, UserRole } from "@prisma/client";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createGenesisAuditEntry } from "../src/domain/audit";
import { generateMfaSecret } from "../src/domain/auth";
import { buildCandidacySnapshot, CandidateInput } from "../src/domain/candidates";
import { validateCI } from "../src/domain/ci";

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const FACULTY_NAME = "Facultad de Ingeniería Informática";
const BRIGADE_CODES = ["11", "12", "22", "32", "41"];

interface Person {
  ci: string;
  name: string;
  firstSurname: string;
  secondSurname: string | null;
  brigade: string;
}

/** Autoridades del sistema (carnets de prueba válidos). */
const AUTHORITIES: Array<Person & { role: UserRole; commissionRole: CommissionRole | null }> = [
  { ci: "99091978927", name: "Adrian", firstSurname: "", secondSurname: null, brigade: "41", role: UserRole.ADMIN, commissionRole: null },
  { ci: "06091668099", name: "Liz", firstSurname: "", secondSurname: null, brigade: "41", role: UserRole.COMMISSION, commissionRole: CommissionRole.PRESIDENTE },
  { ci: "04021514560", name: "Revisor", firstSurname: "", secondSurname: null, brigade: "41", role: UserRole.COMMISSION, commissionRole: CommissionRole.MIEMBRO },
];

/** Candidatura de demostración: también son electores del padrón. */
const CANDIDATES: Array<Person & { year: number; biographyMd: string }> = [
  { ci: "98021411223", name: "Carlos", firstSurname: "Mendoza", secondSurname: "Ramos", brigade: "41", year: 4, biographyMd: "Estudiante de 4to año. Miembro activo de la FEU." },
  { ci: "98052122334", name: "Beatriz", firstSurname: "Navarro", secondSurname: "Pino", brigade: "41", year: 4, biographyMd: "Estudiante de 4to año. Delegada deportiva de la facultad." },
  { ci: "98081533445", name: "Daniel", firstSurname: "Gómez", secondSurname: "Herrera", brigade: "22", year: 3, biographyMd: "Estudiante de 3er año. Presidente de la brigada 22." },
  { ci: "98110344556", name: "Elena", firstSurname: "Castillo", secondSurname: "Vargas", brigade: "22", year: 3, biographyMd: "Estudiante de 3er año. Activista de extensión universitaria." },
  { ci: "99031255667", name: "Fernando", firstSurname: "Iglesias", secondSurname: "Morales", brigade: "12", year: 2, biographyMd: "Estudiante de 2do año. Secretario de docencia de brigada." },
  { ci: "99062566778", name: "Gabriela", firstSurname: "Ortega", secondSurname: "Serrano", brigade: "12", year: 2, biographyMd: "Estudiante de 2do año. Coordinadora cultural." },
  { ci: "99090877889", name: "Héctor", firstSurname: "Paredes", secondSurname: "Fuentes", brigade: "11", year: 1, biographyMd: "Estudiante de 1er año. Delegado de la brigada 11." },
  { ci: "99101988990", name: "Isabel", firstSurname: "Romero", secondSurname: "Cruz", brigade: "11", year: 1, biographyMd: "Estudiante de 1er año. Organizadora estudiantil." },
  { ci: "99120499001", name: "Javier", firstSurname: "Soto", secondSurname: "Delgado", brigade: "32", year: 3, biographyMd: "Estudiante de 3er año. Ayudante de cátedra." },
  { ci: "97070710293", name: "Katia", firstSurname: "Molina", secondSurname: "Reyes", brigade: "32", year: 4, biographyMd: "Estudiante de 4to año. Vanguardia integral." },
];

const fullName = (p: Person) => [p.name, p.firstSurname, p.secondSurname].filter(Boolean).join(" ");

/** Todas las tablas de la aplicación (TRUNCATE ... CASCADE en un solo comando). */
const TABLES = [
  "ballot_selections", "ballots", "participations", "results", "vice_president_designations",
  "vacancy_events", "acts", "audit_events", "commission_seats", "commissions", "process_candidates",
  "candidacies", "candidates", "electoral_processes", "memberships", "users", "brigades", "structures",
  "regulation_articles",
];

async function main() {
  // 0. Validación de los datos de prueba
  for (const p of [...AUTHORITIES, ...CANDIDATES]) {
    const check = validateCI(p.ci);
    if (!check.valid) throw new Error(`Carnet de prueba inválido (${p.ci}): ${check.error}`);
  }

  // 1. Nunca reiniciar una elección con votos
  const ballots = await prisma.ballot.count();
  if (ballots > 0) {
    throw new Error(
      `La base tiene ${ballots} boleta(s) emitida(s): el seed no reinicia elecciones con votos (Art. 66).`,
    );
  }

  // 2. Limpieza total (permitida por los triggers WORM solo con la urna vacía)
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`);

  // 3. Estructura y brigadas
  const faculty = await prisma.structure.create({
    data: { type: StructureType.FACULTAD, name: FACULTY_NAME, level: 2 },
  });
  const brigades = new Map<string, string>();
  for (const code of BRIGADE_CODES) {
    const b = await prisma.brigade.create({ data: { structureId: faculty.id, code, name: `Brigada ${code}` } });
    brigades.set(code, b.id);
  }

  // 4. Candidatura (snapshot ordenado y hasheado, INV-17)
  const candidateInputs: CandidateInput[] = CANDIDATES.map((c) => ({
    id: c.ci,
    studentId: c.ci,
    name: c.name,
    firstSurname: c.firstSurname,
    secondSurname: c.secondSurname ?? undefined,
    ci: c.ci,
    brigadeCode: c.brigade,
    biographyMd: c.biographyMd,
  }));
  const snapshot = buildCandidacySnapshot(candidateInputs);
  if (!snapshot.valid) throw new Error("La candidatura de demostración no es válida.");

  const process = await prisma.electoralProcess.create({
    data: {
      structureId: faculty.id,
      type: ProcessType.SECRETARIADO,
      academicYear: "2026-2027",
      status: ProcessStatus.CONVOCADO,
      candidatesCount: CANDIDATES.length,
      seats: snapshot.seats,
      quorumPct: 85,
      snapshotHash: snapshot.candidacyHash,
    },
  });
  await prisma.candidacy.create({
    data: { processId: process.id, status: "CONGELADA", totalCandidates: CANDIDATES.length, hash: snapshot.candidacyHash },
  });

  const candidateIds = new Map<string, string>();
  for (const c of CANDIDATES) {
    const row = await prisma.candidate.create({
      data: {
        studentId: c.ci,
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
    candidateIds.set(c.ci, row.id);
  }
  let position = 1;
  for (const entry of snapshot.snapshot) {
    await prisma.processCandidate.create({
      data: {
        processId: process.id,
        candidateId: candidateIds.get(entry.ci)!,
        ballotPosition: position++,
        office: Office.NO_ELECTO,
      },
    });
  }

  // 5. Usuarios y padrón: autoridades y electores, todos SIN contraseña
  const userIds = new Map<string, string>();
  for (const person of [...AUTHORITIES, ...CANDIDATES]) {
    const authority = AUTHORITIES.find((a) => a.ci === person.ci);
    const user = await prisma.user.create({
      data: {
        ci: person.ci,
        name: fullName(person),
        passwordHash: null,
        role: authority?.role ?? UserRole.VOTER,
        mfaSecret: authority && authority.role !== UserRole.VOTER ? generateMfaSecret() : null,
        active: true,
      },
    });
    userIds.set(person.ci, user.id);
    await prisma.membership.create({
      data: {
        structureId: faculty.id,
        studentId: person.ci,
        fullName: fullName(person),
        firstName: person.name,
        lastName: [person.firstSurname, person.secondSurname].filter(Boolean).join(" ") || null,
        brigadeId: brigades.get(person.brigade) ?? null,
        userId: user.id,
        eligible: true,
      },
    });
  }

  // 6. Comisión Electoral (Art. 47)
  const commissionMembers = AUTHORITIES.filter((a) => a.commissionRole);
  const commission = await prisma.commission.create({
    data: {
      processId: process.id,
      presidentId: userIds.get(commissionMembers.find((a) => a.commissionRole === CommissionRole.PRESIDENTE)!.ci) ?? null,
      acta: "Acta de constitución de la Comisión Electoral de la Facultad.",
    },
  });
  for (const member of commissionMembers) {
    await prisma.commissionSeat.create({
      data: { commissionId: commission.id, userId: userIds.get(member.ci)!, role: member.commissionRole! },
    });
  }

  // 7. Reglamento (texto literal del PDF)
  const regulation = JSON.parse(readFileSync(resolve(__dirname, "regulation.seed.json"), "utf8")) as {
    document: string;
    articles: Array<{ part: string; article: string; page: number | null; literalText: string }>;
  };
  await prisma.regulationArticle.createMany({
    data: regulation.articles.map((a) => ({
      document: regulation.document,
      part: a.part,
      article: a.article,
      page: a.page,
      literalText: a.literalText,
      sourceHash: "ABC-FEU-2019.pdf",
    })),
  });

  // 8. Génesis de la cadena de auditoría
  const electors = AUTHORITIES.length + CANDIDATES.length;
  const genesis = createGenesisAuditEntry({
    process: `Elección del Secretariado - ${FACULTY_NAME}`,
    seats: snapshot.seats,
    candidacyHash: snapshot.candidacyHash,
    eligibleMembers: electors,
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

  console.log(
    `[SEED] Base reiniciada: ${CANDIDATES.length} candidatos, ${snapshot.seats} puestos, ${electors} electores ` +
      `(sin activar), ${AUTHORITIES.length} autoridades, ${regulation.articles.length} artículos. Proceso en CONVOCADO.`,
  );
}

main()
  .catch((e) => {
    console.error("[SEED] Error:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
