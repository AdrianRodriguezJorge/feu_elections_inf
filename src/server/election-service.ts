/**
 * Servicio electoral sin estado (F2).
 *
 * La base de datos es la única fuente de verdad: cada operación lee y escribe
 * en PostgreSQL dentro de una transacción que bloquea la fila del proceso
 * (`SELECT … FOR UPDATE`). Así las transiciones, el voto y la cadena de
 * auditoría quedan serializados aunque haya varias instancias (Vercel).
 *
 * Si la base de datos no responde, las operaciones fallan: nunca se sirven
 * datos de demostración (fallar cerrado).
 */

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { BallotState, Prisma, StructureType } from "@prisma/client";
import { calculateEventHash, AuditEventType, AuditLogEntry, canonicalJsonStringify, verifyAuditChainIntegrity } from "@/domain/audit";
import { validateBallot } from "@/domain/ballot";
import type { ProcessCandidateSnapshot } from "@/domain/candidates";
import { canCastBallot } from "@/domain/permissions";
import { computeQuorum, QuorumResult } from "@/domain/quorum";
import { canTransition } from "@/domain/states";
import { recommendVicePresident, resolveTie, tally, TallyResult, TieChoice } from "@/domain/tally";
import type { BallotSelection, ProcessStatus, UserRole } from "@/domain/types";
import {
  createInitialComposition,
  designateSuccessorVicePresident,
  processPresidentialVacancy,
  SecretariatComposition,
  VacancyReason,
} from "@/domain/vacancies";
import { prisma } from "@/server/db";

type Tx = Prisma.TransactionClient;

/** Autor de una acción, tomado de la sesión. */
export interface Actor {
  ci: string;
  role: UserRole;
}

/** Error de negocio con código HTTP y mensaje para la interfaz. */
export class ServiceError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Quórum de Facultad fijado por el Art. 38 (más del 85 %). */
export const FACULTY_QUORUM_PCT = 85;
/** Límite inferior de la excepción de quórum que puede aprobar el Administrador. */
export const MIN_QUORUM_EXCEPTION_PCT = 80;

const GENESIS_HASH = "0".repeat(64);

// ---------------------------------------------------------------------------
// Proceso
// ---------------------------------------------------------------------------

async function findProcessId(db: Tx | typeof prisma): Promise<string> {
  const process = await db.electoralProcess.findFirst({
    where: { structure: { type: StructureType.FACULTAD } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!process) throw new ServiceError(503, "No hay ningún proceso electoral configurado.");
  return process.id;
}

/** Bloquea la fila del proceso hasta el final de la transacción. */
async function lockProcess(tx: Tx) {
  const id = await findProcessId(tx);
  await tx.$queryRaw`SELECT id FROM electoral_processes WHERE id = ${id} FOR UPDATE`;
  return tx.electoralProcess.findUniqueOrThrow({ where: { id } });
}

function effectiveQuorumPct(process: { quorumPct: Prisma.Decimal; quorumExceptionPct: Prisma.Decimal | null }) {
  return process.quorumExceptionPct !== null ? Number(process.quorumExceptionPct) : Number(process.quorumPct);
}

export async function getProcessStatus(): Promise<ProcessStatus> {
  const process = await prisma.electoralProcess.findFirst({
    where: { structure: { type: StructureType.FACULTAD } },
    orderBy: { createdAt: "desc" },
    select: { status: true },
  });
  if (!process) throw new ServiceError(503, "No hay ningún proceso electoral configurado.");
  return process.status as ProcessStatus;
}

async function loadSnapshot(db: Tx | typeof prisma, processId: string): Promise<ProcessCandidateSnapshot[]> {
  const rows = await db.processCandidate.findMany({
    where: { processId },
    orderBy: { ballotPosition: "asc" },
    include: { candidate: { include: { brigade: true } } },
  });
  return rows.map((c) => ({
    candidateId: c.id,
    studentId: c.candidate.studentId || c.candidate.ci,
    ballotPosition: c.ballotPosition,
    fullName: [c.candidate.name, c.candidate.firstSurname, c.candidate.secondSurname].filter(Boolean).join(" "),
    firstSurname: c.candidate.firstSurname,
    secondSurname: c.candidate.secondSurname,
    name: c.candidate.name,
    ci: c.candidate.ci,
    brigadeCode: c.candidate.brigade?.code ?? "",
    biographyMd: c.candidate.biographyMd ?? "",
    biographyHash: c.candidate.biographyHash ?? "",
    brigadeValidated: c.candidate.brigadeValidated,
    councilApproved: true,
  }));
}

// ---------------------------------------------------------------------------
// Auditoría encadenada
// ---------------------------------------------------------------------------

/**
 * Añade un evento a la cadena. Debe llamarse con la fila del proceso
 * bloqueada para que la secuencia y el `prevHash` no colisionen.
 */
async function appendAudit(
  tx: Tx,
  processId: string,
  actorCi: string,
  actorRole: string,
  eventType: AuditEventType,
  details: Record<string, unknown>,
): Promise<void> {
  const last = await tx.auditEvent.findFirst({
    where: { processId },
    orderBy: { sequence: "desc" },
    select: { sequence: true, hash: true },
  });
  const sequence = (last?.sequence ?? 0) + 1;
  const prevHash = last?.hash ?? GENESIS_HASH;
  const timestamp = new Date().toISOString();
  const hash = calculateEventHash(sequence, timestamp, actorCi, actorRole, eventType, prevHash, details);

  await tx.auditEvent.create({
    data: {
      processId,
      sequence,
      actorCi,
      actorRole,
      action: eventType,
      entity: eventType === "BOLETA_EMITIDA" ? "BOLETA" : "PROCESO",
      details: details as Prisma.InputJsonValue,
      prevHash,
      hash,
      occurredAt: new Date(timestamp),
      payloadHash: hash,
    },
  });
}

/** Registra un evento de auditoría en su propia transacción. */
export async function recordAudit(
  actorCi: string,
  actorRole: string,
  eventType: AuditEventType,
  details: Record<string, unknown>,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const process = await lockProcess(tx);
    await appendAudit(tx, process.id, actorCi, actorRole, eventType, details);
  });
}

export async function getAuditStatus() {
  const processId = await findProcessId(prisma);
  const rows = await prisma.auditEvent.findMany({ where: { processId }, orderBy: { sequence: "asc" } });
  const chain: AuditLogEntry[] = rows.map((r) => ({
    sequence: r.sequence,
    timestamp: r.occurredAt.toISOString(),
    actorCi: r.actorCi ?? "",
    actorRole: r.actorRole ?? "",
    eventType: r.action as AuditEventType,
    details: (r.details as Record<string, unknown>) ?? {},
    prevHash: r.prevHash ?? "",
    hash: r.hash ?? "",
  }));
  return {
    entriesCount: chain.length,
    integrity: verifyAuditChainIntegrity(chain),
    latestHash: chain.at(-1)?.hash ?? null,
    recent: chain.slice(-15),
  };
}

// ---------------------------------------------------------------------------
// Vista de la elección
// ---------------------------------------------------------------------------

export interface QuorumException {
  pct: number;
  justification: string;
  acta: string;
  appliedBy: string;
  appliedAt: string;
}

export interface ElectionView {
  status: ProcessStatus;
  seats: number;
  candidates: ProcessCandidateSnapshot[];
  quorumBasePct: number;
  quorumPct: number;
  quorumException: QuorumException | null;
  electors: Map<string, { name: string; brigadeCode: string; hasVoted: boolean }>;
  validBallots: number;
  annulledBallots: number;
  commission: Array<{ ci: string; name: string; office: "PRESIDENT" | "VICE_PRESIDENT" | "SECRETARY" | "MEMBER"; brigadeCode: string }>;
  tallyResult: TallyResult | null;
  quorum: QuorumResult | null;
  tieResolution: { justification: string; acta: string; decidedBy: string } | null;
  composition: SecretariatComposition | null;
}

async function latestAct<T>(db: Tx | typeof prisma, processId: string, type: string): Promise<{ content: T; createdAt: Date } | null> {
  const act = await db.act.findFirst({ where: { processId, type }, orderBy: { createdAt: "desc" } });
  return act ? { content: act.content as unknown as T, createdAt: act.createdAt } : null;
}

export async function getElectionView(): Promise<ElectionView> {
  const processId = await findProcessId(prisma);
  const process = await prisma.electoralProcess.findUniqueOrThrow({ where: { id: processId } });

  const [candidates, members, ballotCounts, commissionRow, latestResult, exceptionAct, tieAct, compositionAct] =
    await Promise.all([
      loadSnapshot(prisma, processId),
      prisma.membership.findMany({
        where: { structureId: process.structureId, eligible: true },
        include: { brigade: true, participations: { where: { processId }, select: { id: true } } },
      }),
      prisma.ballot.groupBy({ by: ["state"], where: { processId }, _count: { _all: true } }),
      prisma.commission.findFirst({
        where: { processId },
        include: { seats: { include: { user: { include: { membership: { include: { brigade: true } } } } } } },
      }),
      prisma.result.findFirst({ where: { processId }, orderBy: { createdAt: "desc" } }),
      latestAct<{ pct: number; justification: string; acta: string; appliedBy: string }>(prisma, processId, "EXCEPCION_QUORUM"),
      latestAct<{ justification: string; acta: string; decidedBy: string }>(prisma, processId, "RESOLUCION_EMPATE"),
      latestAct<SecretariatComposition>(prisma, processId, "COMPOSICION"),
    ]);

  const electors = new Map<string, { name: string; brigadeCode: string; hasVoted: boolean }>();
  for (const m of members) {
    electors.set(m.studentId, {
      name: m.fullName,
      brigadeCode: m.brigade?.code ?? "",
      hasVoted: m.participations.length > 0,
    });
  }

  const count = (state: BallotState) => ballotCounts.find((b) => b.state === state)?._count._all ?? 0;
  const resultContent = latestResult?.composition as { tally: TallyResult; quorum: QuorumResult } | null | undefined;

  const commission: ElectionView["commission"] = (commissionRow?.seats ?? []).map((seat) => ({
    ci: seat.user.ci ?? "",
    name: seat.user.name,
    office: seat.role === "PRESIDENTE" ? "PRESIDENT" : seat.role === "SECRETARIO" ? "SECRETARY" : "MEMBER",
    brigadeCode: seat.user.membership?.brigade?.code ?? "",
  }));

  return {
    status: process.status as ProcessStatus,
    seats: process.seats,
    candidates,
    quorumBasePct: Number(process.quorumPct),
    quorumPct: effectiveQuorumPct(process),
    quorumException:
      process.quorumExceptionPct !== null && exceptionAct
        ? { ...exceptionAct.content, appliedAt: exceptionAct.createdAt.toISOString() }
        : null,
    electors,
    validBallots: count(BallotState.VALIDA),
    annulledBallots: count(BallotState.ANULADA_POR_ELECTOR),
    commission,
    tallyResult: resultContent?.tally ?? null,
    quorum: resultContent?.quorum ?? null,
    tieResolution: tieAct?.content ?? null,
    composition: compositionAct?.content ?? null,
  };
}

/** Resumen numérico para la interfaz. */
export function summarize(view: ElectionView) {
  const totalEligible = view.electors.size;
  const totalVotes = view.validBallots + view.annulledBallots;
  const minVotesRequired = totalEligible > 0 ? Math.floor((totalEligible * view.quorumPct) / 100) + 1 : 0;
  return {
    status: view.status,
    seats: view.seats,
    candidatesCount: view.candidates.length,
    totalEligible,
    totalVotes,
    validBallots: view.validBallots,
    annulledBallots: view.annulledBallots,
    participationPct: totalEligible > 0 ? Math.round((totalVotes / totalEligible) * 10000) / 100 : 0,
    minParticipationPercentage: view.quorumPct,
    minVotesRequired,
    requirementMet: totalEligible > 0 && totalVotes >= minVotesRequired,
    candidacyHash: "",
  };
}

// ---------------------------------------------------------------------------
// Transiciones
// ---------------------------------------------------------------------------

function assertTransition(from: ProcessStatus, to: ProcessStatus, actor: Actor) {
  if (!canTransition(from, to, actor.role)) {
    throw new ServiceError(409, `No se puede pasar de ${from} a ${to}.`);
  }
}

async function setStatus(tx: Tx, processId: string, from: ProcessStatus, to: ProcessStatus, actor: Actor, eventType: AuditEventType, details: Record<string, unknown> = {}) {
  assertTransition(from, to, actor);
  await tx.electoralProcess.update({ where: { id: processId }, data: { status: to } });
  await appendAudit(tx, processId, actor.ci, actor.role, eventType, { from, to, ...details });
}

export async function openVoting(actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const p = await lockProcess(tx);
    await setStatus(tx, p.id, p.status as ProcessStatus, "ABIERTA", actor, "VOTACION_ABIERTA");
  });
}

export async function closeVoting(actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const p = await lockProcess(tx);
    await setStatus(tx, p.id, p.status as ProcessStatus, "CERRADA", actor, "VOTACION_CERRADA");
  });
}

// ---------------------------------------------------------------------------
// Voto
// ---------------------------------------------------------------------------

export async function castBallot(
  actor: Actor,
  selections: BallotSelection[],
  isAnnulled: boolean,
): Promise<{ receiptHash: string; status: "VALIDA" | "ANULADA_POR_ELECTOR" }> {
  try {
    return await prisma.$transaction(async (tx) => {
      const p = await lockProcess(tx);
      const membership = await tx.membership.findFirst({
        where: { structureId: p.structureId, studentId: actor.ci, eligible: true },
      });
      const already = membership
        ? await tx.participation.findFirst({ where: { processId: p.id, membershipId: membership.id } })
        : null;

      const check = canCastBallot(actor.role, p.status as ProcessStatus, Boolean(membership), Boolean(already));
      if (!check.allowed || !membership) throw new ServiceError(422, check.reason ?? "No estás habilitado para votar.");

      const status = isAnnulled ? "ANULADA_POR_ELECTOR" : "VALIDA";
      if (!isAnnulled) {
        const candidateIds = (await tx.processCandidate.findMany({ where: { processId: p.id }, select: { id: true } })).map((c) => c.id);
        const validation = validateBallot(selections, { minMemberMarks: 1, maxMemberMarks: p.seats, presidentMarks: 1 }, candidateIds);
        if (!validation.ok) {
          throw new ServiceError(422, validation.errors.map((e) => e.message).join(" "));
        }
      }
      const stored = isAnnulled ? [] : selections;

      await tx.participation.create({ data: { processId: p.id, membershipId: membership.id, method: "WEB" } });

      // Urna ciega (INV-04): sin identidad, sin hora exacta y con identificadores aleatorios.
      const receiptHash = randomBytes(32).toString("hex");
      const integrityHash = createHash("sha256")
        .update(canonicalJsonStringify({ receiptHash, state: status, selections: stored.map((s) => ({ ...s })) }))
        .digest("hex");
      await tx.ballot.create({
        data: {
          id: randomUUID(),
          processId: p.id,
          state: status === "VALIDA" ? BallotState.VALIDA : BallotState.ANULADA_POR_ELECTOR,
          receiptHash,
          castAt: new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z"),
          integrityHash,
          selections: {
            create: stored.map((s) => ({
              id: randomUUID(),
              processCandidateId: s.processCandidateId,
              member: s.member,
              president: s.president,
            })),
          },
        },
      });

      await appendAudit(tx, p.id, "ANONIMO", "VOTER", "BOLETA_EMITIDA", {});
      return { receiptHash, status };
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ServiceError(422, "Ya emitió su voto en este proceso electoral.");
    }
    throw err;
  }
}

export async function hasReceipt(receiptHash: string): Promise<boolean> {
  const processId = await findProcessId(prisma);
  const ballot = await prisma.ballot.findFirst({
    where: { processId, receiptHash: receiptHash.trim().toLowerCase() },
    select: { id: true },
  });
  return Boolean(ballot);
}

// ---------------------------------------------------------------------------
// Escrutinio, empates y quórum
// ---------------------------------------------------------------------------

/**
 * Escrutinio único: solo desde CERRADA. Decide el estado de salida:
 * sin quórum → SIN_QUORUM; empate → EMPATE; si no → PROCLAMADA.
 */
export async function runTally(actor: Actor): Promise<{ status: ProcessStatus; tally: TallyResult; quorum: QuorumResult }> {
  return prisma.$transaction(async (tx) => {
    const p = await lockProcess(tx);
    if (p.status !== "CERRADA") {
      throw new ServiceError(409, `El escrutinio se realiza una sola vez, con la votación cerrada (estado actual: ${p.status}).`);
    }

    const candidateIds = (await loadSnapshot(tx, p.id)).map((c) => c.candidateId);
    const ballots = await tx.ballot.findMany({ where: { processId: p.id }, include: { selections: true } });
    const valid = ballots.filter((b) => b.state === BallotState.VALIDA);
    const eligibleMembers = await tx.membership.count({ where: { structureId: p.structureId, eligible: true } });

    const result = tally(valid.map((b) => ({ selections: b.selections })), candidateIds, p.seats);
    const quorumPct = effectiveQuorumPct(p);
    const quorum = computeQuorum({
      validBallots: valid.length,
      annulledBallots: ballots.length - valid.length,
      eligibleMembers,
      quorumPct,
    });

    const to: ProcessStatus = !quorum.quorumMet ? "SIN_QUORUM" : result.tie ? "EMPATE" : "PROCLAMADA";

    await tx.result.create({
      data: {
        processId: p.id,
        validBallots: valid.length,
        annulledBallots: ballots.length - valid.length,
        participation: quorum.participationPct,
        quorumPct,
        quorumMet: quorum.quorumMet,
        hash: createHash("sha256").update(canonicalJsonStringify({ result, quorum })).digest("hex"),
        status: to,
        composition: JSON.parse(JSON.stringify({ tally: result, quorum })) as Prisma.InputJsonValue,
        proclaimedAt: to === "PROCLAMADA" ? new Date() : null,
      },
    });

    await setStatus(tx, p.id, "CERRADA", to, actor, "ESCRUTINIO_REALIZADO", {
      quorumMet: quorum.quorumMet,
      participationPct: quorum.participationPct,
      quorumPct,
      tie: result.tie?.type ?? null,
      presidentId: result.presidentId,
    });

    return { status: to, tally: result, quorum };
  });
}

/**
 * La Comisión resuelve un empate eligiendo entre los empatados, con
 * justificación y acta (decisión F2; se aparta del Art. 40 y queda registrado).
 */
export async function resolveTieByCommission(actor: Actor, choice: TieChoice, justification: string, acta: string) {
  return prisma.$transaction(async (tx) => {
    const p = await lockProcess(tx);
    if (p.status !== "EMPATE") throw new ServiceError(409, "No hay ningún empate pendiente de resolver.");

    const latest = await tx.result.findFirst({ where: { processId: p.id }, orderBy: { createdAt: "desc" } });
    const content = latest?.composition as { tally: TallyResult; quorum: QuorumResult } | null;
    if (!latest || !content) throw new ServiceError(409, "No se encontró el escrutinio.");

    const outcome = resolveTie(content.tally, p.seats, choice);
    if (!outcome.ok) throw new ServiceError(422, outcome.error);

    await tx.result.create({
      data: {
        processId: p.id,
        validBallots: latest.validBallots,
        annulledBallots: latest.annulledBallots,
        participation: latest.participation,
        quorumPct: latest.quorumPct,
        quorumMet: latest.quorumMet,
        hash: createHash("sha256").update(canonicalJsonStringify({ result: outcome.result, quorum: content.quorum })).digest("hex"),
        status: "PROCLAMADA",
        composition: JSON.parse(JSON.stringify({ tally: outcome.result, quorum: content.quorum })) as Prisma.InputJsonValue,
        proclaimedAt: new Date(),
      },
    });
    await saveAct(tx, p.id, actor, "RESOLUCION_EMPATE", { justification, acta, decidedBy: actor.ci, resolution: outcome.result.resolution });
    await setStatus(tx, p.id, "EMPATE", "PROCLAMADA", actor, "EMPATE_RESUELTO", {
      resolution: outcome.result.resolution,
      justification,
    });
    return outcome.result;
  });
}

/**
 * Excepción de quórum (solo Administrador), entre 80 y 85 %, con acta. Se puede
 * aplicar hasta antes del escrutinio. 85 % revierte a la regla general.
 */
export async function setQuorumException(actor: Actor, pct: number, justification: string, acta: string) {
  if (actor.role !== "ADMIN") throw new ServiceError(403, "Solo el Administrador puede aplicar una excepción de quórum.");
  if (pct < MIN_QUORUM_EXCEPTION_PCT || pct > FACULTY_QUORUM_PCT) {
    throw new ServiceError(422, `El quórum debe estar entre ${MIN_QUORUM_EXCEPTION_PCT} % y ${FACULTY_QUORUM_PCT} %.`);
  }
  return prisma.$transaction(async (tx) => {
    const p = await lockProcess(tx);
    if (!["CONVOCADO", "ABIERTA", "CERRADA"].includes(p.status)) {
      throw new ServiceError(409, "El quórum solo se puede ajustar antes del escrutinio.");
    }
    const exception = pct === FACULTY_QUORUM_PCT ? null : pct;
    await tx.electoralProcess.update({ where: { id: p.id }, data: { quorumExceptionPct: exception } });
    await saveAct(tx, p.id, actor, "EXCEPCION_QUORUM", { pct, justification, acta, appliedBy: actor.ci });
    await appendAudit(tx, p.id, actor.ci, actor.role, "EXCEPCION_QUORUM", {
      from: effectiveQuorumPct(p),
      to: pct,
      justification,
    });
  });
}

// ---------------------------------------------------------------------------
// Vicepresidente y vacantes
// ---------------------------------------------------------------------------

async function saveAct(tx: Tx, processId: string, actor: Actor, type: string, content: Record<string, unknown>) {
  const json = JSON.parse(JSON.stringify(content)) as Prisma.InputJsonValue;
  await tx.act.create({
    data: {
      processId,
      type,
      content: json,
      hash: createHash("sha256").update(canonicalJsonStringify(json)).digest("hex"),
      signers: [actor.ci],
      signedAt: new Date(),
    },
  });
}

async function currentTally(tx: Tx, processId: string): Promise<TallyResult> {
  const latest = await tx.result.findFirst({ where: { processId }, orderBy: { createdAt: "desc" } });
  const content = latest?.composition as { tally: TallyResult } | null | undefined;
  if (!content?.tally?.presidentId) throw new ServiceError(409, "No hay resultados proclamados.");
  return content.tally;
}

export async function designateVicePresident(actor: Actor, candidateId: string): Promise<SecretariatComposition> {
  return prisma.$transaction(async (tx) => {
    const p = await lockProcess(tx);
    if (p.status !== "PROCLAMADA") throw new ServiceError(409, "El vicepresidente se designa después de proclamar los resultados.");

    const result = await currentTally(tx, p.id);
    if (!result.elected.includes(candidateId)) {
      throw new ServiceError(422, "El vicepresidente debe ser uno de los miembros electos.");
    }
    if (result.presidentId === candidateId) {
      throw new ServiceError(422, "El presidente no puede ser a la vez vicepresidente.");
    }

    const snapshot = await loadSnapshot(tx, p.id);
    const byId = new Map(snapshot.map((c) => [c.candidateId, c]));
    const president = byId.get(result.presidentId!)!;
    const vp = byId.get(candidateId)!;
    const composition = createInitialComposition(president, vp, result.elected.map((id) => byId.get(id)!).filter(Boolean));

    await tx.vicePresidentDesignation.create({
      data: { processId: p.id, electedId: candidateId, recommendedId: recommendVicePresident(result), designatedBy: actor.ci },
    });
    await saveAct(tx, p.id, actor, "COMPOSICION", composition as unknown as Record<string, unknown>);
    await setStatus(tx, p.id, "PROCLAMADA", "VP_DESIGNADA", actor, "VICEPRESIDENTE_DESIGNADO", { candidateId });
    return composition;
  });
}

export interface VacancyRequest {
  type: "VACANCIA_PRESIDENTE" | "DESIGNAR_NUEVO_VP";
  reason?: VacancyReason | undefined;
  justification?: string | undefined;
  successorCandidateId?: string | undefined;
  councilAttendancePct?: number | undefined;
  councilVotesInFavorPct?: number | undefined;
}

export async function handleVacancy(actor: Actor, req: VacancyRequest): Promise<SecretariatComposition> {
  return prisma.$transaction(async (tx) => {
    const p = await lockProcess(tx);
    const current = (await latestAct<SecretariatComposition>(tx, p.id, "COMPOSICION"))?.content;
    if (!current) throw new ServiceError(409, "No hay una composición del Secretariado: primero designa al vicepresidente.");

    if (req.type === "VACANCIA_PRESIDENTE") {
      const outcome = processPresidentialVacancy({
        currentComposition: current,
        reason: req.reason ?? "DIMISION_VOLUNTARIA",
        justification: req.justification ?? "",
        successorCandidateId: req.successorCandidateId,
        councilAttendancePct: req.councilAttendancePct,
        councilVotesInFavorPct: req.councilVotesInFavorPct,
      });
      if (!outcome.ok || !outcome.composition) throw new ServiceError(422, outcome.error ?? "No se pudo procesar la vacante.");

      await tx.vacancyEvent.create({
        data: {
          processId: p.id,
          office: "PRESIDENTE",
          type: "RENUNCIA",
          reason: req.justification ?? null,
          successorId: outcome.composition.president.candidateId,
          status: "RESUELTA",
          compositionVersion: outcome.composition.version,
        },
      });
      await saveAct(tx, p.id, actor, "COMPOSICION", outcome.composition as unknown as Record<string, unknown>);
      await setStatus(tx, p.id, p.status as ProcessStatus, "VACANTE", actor, "VACANCIA_PRESIDENCIAL", {
        newPresidentId: outcome.composition.president.candidateId,
      });
      return outcome.composition;
    }

    if (!req.successorCandidateId) throw new ServiceError(422, "Indique el candidato a la vicepresidencia.");
    const outcome = designateSuccessorVicePresident(
      current,
      req.successorCandidateId,
      req.justification || "Designación de nueva vicepresidencia (Art. 67)",
    );
    if (!outcome.ok || !outcome.composition) throw new ServiceError(422, outcome.error ?? "No se pudo designar el vicepresidente.");

    await tx.vacancyEvent.create({
      data: {
        processId: p.id,
        office: "VICEPRESIDENTE",
        type: "RENUNCIA",
        reason: req.justification ?? null,
        successorId: req.successorCandidateId,
        status: "RESUELTA",
        compositionVersion: outcome.composition.version,
      },
    });
    await saveAct(tx, p.id, actor, "COMPOSICION", outcome.composition as unknown as Record<string, unknown>);
    await setStatus(tx, p.id, p.status as ProcessStatus, "FINALIZADA", actor, "NUEVO_VP_DESIGNADO", {
      candidateId: req.successorCandidateId,
    });
    return outcome.composition;
  });
}
