/**
 * Almacén reactivo y persistente del Proceso Electoral (F4 / F5 / F7).
 *
 * Mantiene el estado del proceso, membresía, candidatos, urna ciega y registro de participación.
 * Conectado con la capa de persistencia relacional PostgreSQL con transacciones ACID (Item 7.1)
 * y blindaje WORM (Item 7.3):
 *  - Urna ciega desacoplada del elector (INV-04).
 *  - Un solo voto por elector en el listado con transacción ACID (INV-06 / RGF-25).
 *  - Escrutinio bloqueado hasta el cierre (INV-08).
 *  - Immutabilidad garantizada por triggers PL/pgSQL (Art. 66 / RGF-33).
 */

import { randomBytes, randomUUID } from "node:crypto";
import { buildCandidacySnapshot, CandidateInput, ProcessCandidateSnapshot } from "@/domain/candidates";
import { DEFAULT_PROCESS_CONFIG, ProcessConfig } from "@/domain/config";
import { PadronRecord } from "@/domain/padron";
import { canCastBallot } from "@/domain/permissions";
import { computeQuorum, QuorumResult } from "@/domain/quorum";
import { tally, TallyResult } from "@/domain/tally";
import { BallotSelection, ProcessStatus, UserRole } from "@/domain/types";
import { validateBallot } from "@/domain/ballot";
import { SecretariatComposition } from "@/domain/vacancies";
import {
  appendAuditEntry,
  AuditEventType,
  AuditLogEntry,
  createGenesisAuditEntry,
  verifyAuditChainIntegrity,
} from "@/domain/audit";
import { postgresDb } from "./db-postgres";

export interface StoredBallot {
  id: string;
  status: "VALIDA" | "ANULADA_POR_ELECTOR";
  selections: BallotSelection[];
  castAt: string;
  receiptHash: string;
}

export interface VoterParticipation {
  voterCi: string;
  voterName: string;
  brigadeCode: string;
  hasVoted: boolean;
  votedAt?: string | undefined;
}

/** Autor de una acción, tomado de la sesión. */
export interface SessionActor {
  ci: string;
  role: UserRole;
}

export interface CommissionMember {
  ci: string;
  name: string;
  office: "PRESIDENT" | "VICE_PRESIDENT" | "SECRETARY" | "MEMBER";
  brigadeCode: string;
}

// Candidatos demo oficiales de la Facultad de Ingeniería Informática
const DEMO_CANDIDATES: CandidateInput[] = [
  { id: "can-01", studentId: "CAN-78927", name: "Adrián", firstSurname: "Rodríguez", secondSurname: "Jorge", ci: "02091978927", brigadeCode: "11", biographyMd: "Estudiante de 4to año. Promedio: 4.85. Miembro activo de la FEU." },
  { id: "can-02", studentId: "CAN-72927", name: "Adriana", firstSurname: "Porrata", secondSurname: "Morffi", ci: "04120972927", brigadeCode: "22", biographyMd: "Estudiante de 2do año. Delegada deportiva de la facultad." },
  { id: "can-03", studentId: "CAN-73927", name: "Pedro Pablo", firstSurname: "Chevalier", secondSurname: "Pérez", ci: "02091973927", brigadeCode: "11", biographyMd: "Estudiante de 4to año. Presidente de brigada 11." },
  { id: "can-04", studentId: "CAN-74927", name: "Carlos Manuel", firstSurname: "Sierra", secondSurname: "Hernández", ci: "04120974927", brigadeCode: "22", biographyMd: "Estudiante de 2do año. Activista de extensión universitaria." },
  { id: "can-05", studentId: "CAN-75927", name: "Diana", firstSurname: "Delgado", secondSurname: "Fernández", ci: "02091975927", brigadeCode: "12", biographyMd: "Estudiante de 3er año. Secretaria de docencia de brigada." },
  { id: "can-06", studentId: "CAN-76927", name: "Rachel de la Caridad", firstSurname: "Valdés", secondSurname: "Sarracent", ci: "04120976927", brigadeCode: "22", biographyMd: "Estudiante de 3er año. Coordinadora cultural." },
  { id: "can-07", studentId: "CAN-77927", name: "Leyder", firstSurname: "Herrera", secondSurname: "Bello", ci: "02091977927", brigadeCode: "12", biographyMd: "Estudiante de 4to año. Delegado de brigada 12." },
  { id: "can-08", studentId: "CAN-78928", name: "Lia Lorena", firstSurname: "Rondón", secondSurname: "Martínez", ci: "04120978927", brigadeCode: "22", biographyMd: "Estudiante de 2do año. Organizadora estudiantil." },
  { id: "can-09", studentId: "CAN-79927", name: "Orlando Javier", firstSurname: "Marrero", secondSurname: "Gonzalez", ci: "02091979927", brigadeCode: "12", biographyMd: "Estudiante de 4to año. Ayudante de cátedra." },
  { id: "can-10", studentId: "CAN-75928", name: "Dennis Serafín", firstSurname: "Rodríguez", secondSurname: "Armenteros", ci: "04120975927", brigadeCode: "41", biographyMd: "Estudiante de 4to año. Responsable de comunicación." },
  { id: "can-11", studentId: "CAN-76928", name: "Abdiel", firstSurname: "Rodríguez", secondSurname: "Lara", ci: "03100976927", brigadeCode: "41", biographyMd: "Estudiante de 4to año. Vanguardia integral." },
];

// Electores iniciales del listado para pruebas inmediatas
const DEMO_VOTERS: PadronRecord[] = [
  { ci: "03080468489", firstName: "Adán", firstSurname: "Adán", secondSurname: "Cabrera", fullName: "Adán Adán Cabrera", brigadeCode: "41" },
  { ci: "02052981315", firstName: "Roxana", firstSurname: "Almaguer", secondSurname: "Sosa", fullName: "Roxana Almaguer Sosa", brigadeCode: "41" },
  { ci: "03020183061", firstName: "Alejandro", firstSurname: "Almeida", secondSurname: "Cobas", fullName: "Alejandro Almeida Cobas", brigadeCode: "41" },
  { ci: "02111574920", firstName: "Dayron", firstSurname: "Batista", secondSurname: "Díaz", fullName: "Dayron Batista Díaz", brigadeCode: "11" },
  { ci: "01041285033", firstName: "Beatriz", firstSurname: "Castro", secondSurname: "Cruz", fullName: "Beatriz Castro Cruz", brigadeCode: "12" },
  { ci: "03091873641", firstName: "Carlos", firstSurname: "Domínguez", secondSurname: "Vera", fullName: "Carlos Domínguez Vera", brigadeCode: "22" },
  { ci: "02031194852", firstName: "Elena", firstSurname: "García", secondSurname: "Méndez", fullName: "Elena García Méndez", brigadeCode: "32" },
  { ci: "04012285913", firstName: "Frank", firstSurname: "Hernández", secondSurname: "Pérez", fullName: "Frank Hernández Pérez", brigadeCode: "41" },
  { ci: "03071592844", firstName: "Giselle", firstSurname: "López", secondSurname: "Reyes", fullName: "Giselle López Reyes", brigadeCode: "11" },
  { ci: "02083074819", firstName: "Héctor", firstSurname: "Morales", secondSurname: "Torres", fullName: "Héctor Morales Torres", brigadeCode: "12" },
  { ci: "03110482910", firstName: "Isabel", firstSurname: "Navarro", secondSurname: "Gómez", fullName: "Isabel Navarro Gómez", brigadeCode: "22" },
  { ci: "02121983021", firstName: "Javier", firstSurname: "Ortiz", secondSurname: "Soto", fullName: "Javier Ortiz Soto", brigadeCode: "32" },
];

class ElectionStore {
  public status: ProcessStatus = "CONVOCADO";
  public config: ProcessConfig = { ...DEFAULT_PROCESS_CONFIG };
  public candidates: CandidateInput[] = [...DEMO_CANDIDATES];
  public snapshot: ProcessCandidateSnapshot[] = [];
  public candidacyHash: string = "";
  public seats: number = 9;

  public padron = new Map<string, PadronRecord>();
  public participations = new Map<string, VoterParticipation>();
  public ballots: StoredBallot[] = [];

  public commission: CommissionMember[] = [
    { ci: "06091668099", name: "Liz", office: "PRESIDENT", brigadeCode: "41" },
    { ci: "11111111111", name: "Revisor", office: "VICE_PRESIDENT", brigadeCode: "41" },
  ];

  public tallyResult: TallyResult | null = null;
  public designatedVpId: string | null = null;
  public composition: SecretariatComposition | null = null;
  public auditLog: AuditLogEntry[] = [];

  private readyPromise: Promise<void> | null = null;

  constructor() {
    this.readyPromise = this.initOrLoad();
  }

  public async ensureReady(): Promise<void> {
    if (this.readyPromise) {
      await this.readyPromise;
    }
  }

  private async initOrLoad(): Promise<void> {
    try {
      const isPgAvailable = await postgresDb.isAvailable();
      if (isPgAvailable && !(await postgresDb.isDbEmpty())) {
        const loaded = await this.loadFromPostgres();
        if (loaded) {
          return;
        }
      }
    } catch {
      // Ignorar error de conexión y continuar con memoria
    }

    this.initDemoDataInMemory();
  }

  private async loadFromPostgres(): Promise<boolean> {
    const data = await postgresDb.loadAll();
    if (!data) return false;

    this.status = data.status;
    if (data.config) this.config = data.config;
    this.seats = data.seats;
    this.candidacyHash = data.candidacyHash;
    this.designatedVpId = data.designatedVpId;
    this.candidates = data.candidates;
    this.snapshot = data.snapshot;
    this.padron = data.padron;

    this.participations.clear();
    for (const [ci, p] of data.participations) {
      this.participations.set(ci, {
        voterCi: p.voterCi,
        voterName: p.voterName,
        brigadeCode: p.brigadeCode,
        hasVoted: p.hasVoted,
        votedAt: p.votedAt,
      });
    }

    this.ballots = data.ballots.map((b) => ({
      id: b.id,
      status: b.status,
      selections: b.selections,
      castAt: b.castAt,
      receiptHash: b.receiptHash,
    }));

    this.commission = data.commission.map((c) => ({
      ci: c.ci,
      name: c.name,
      office: c.office,
      brigadeCode: c.brigadeCode,
    }));

    this.auditLog = data.auditLog;
    this.tallyResult = data.tallyResult;
    this.composition = data.composition;

    return true;
  }

  public initDemoDataInMemory() {
    this.padron.clear();
    this.participations.clear();

    // Inicializar membresía con votantes demo y con los propios candidatos
    for (const v of DEMO_VOTERS) {
      this.padron.set(v.ci, v);
      this.participations.set(v.ci, {
        voterCi: v.ci,
        voterName: v.fullName,
        brigadeCode: v.brigadeCode,
        hasVoted: false,
      });
    }

    for (const c of this.candidates) {
      if (!this.padron.has(c.ci)) {
        const fullName = [c.name, c.firstSurname, c.secondSurname].filter(Boolean).join(" ");
        const rec: PadronRecord = {
          ci: c.ci,
          firstName: c.name,
          firstSurname: c.firstSurname,
          secondSurname: c.secondSurname ?? null,
          fullName,
          brigadeCode: c.brigadeCode,
        };
        this.padron.set(c.ci, rec);
        this.participations.set(c.ci, {
          voterCi: c.ci,
          voterName: fullName,
          brigadeCode: c.brigadeCode,
          hasVoted: false,
        });
      }
    }

    // Congelar candidatura demo inicial
    const outcome = buildCandidacySnapshot(this.candidates);
    if (outcome.valid) {
      this.snapshot = outcome.snapshot;
      this.candidacyHash = outcome.candidacyHash;
      this.seats = outcome.seats;
    }

    // Génesis del registro de auditoría WORM
    const genesis = createGenesisAuditEntry({
      process: "Elección del Secretariado - Facultad de Ingeniería Informática",
      seats: this.seats,
      candidacyHash: this.candidacyHash,
      eligibleMembers: this.padron.size,
    });
    this.auditLog = [genesis];
  }

  public getSummary() {
    const totalEligible = this.padron.size;
    const validBallots = this.ballots.filter((b) => b.status === "VALIDA").length;
    const annulledBallots = this.ballots.filter((b) => b.status === "ANULADA_POR_ELECTOR").length;
    const totalVotes = validBallots + annulledBallots;
    const minVotesRequired = Math.floor((totalEligible * this.config.minParticipationPercentage) / 100) + 1;
    const participationPct = totalEligible > 0 ? Math.round((totalVotes / totalEligible) * 10000) / 100 : 0;
    const requirementMet = totalVotes >= minVotesRequired;

    return {
      status: this.status,
      seats: this.seats,
      candidatesCount: this.candidates.length,
      totalEligible,
      totalVotes,
      validBallots,
      annulledBallots,
      participationPct,
      minParticipationPercentage: this.config.minParticipationPercentage,
      minVotesRequired: totalEligible > 0 ? minVotesRequired : 0,
      requirementMet,
      candidacyHash: this.candidacyHash,
    };
  }

  public async castBallot(
    voterCi: string,
    role: UserRole,
    selections: BallotSelection[],
    isAnnulled: boolean = false,
  ): Promise<{ ok: true; receiptHash: string; status: "VALIDA" | "ANULADA_POR_ELECTOR" } | { ok: false; error: string; errors?: string[] }> {
    await this.ensureReady();

    const isEligible = this.padron.has(voterCi);
    const participation = this.participations.get(voterCi);
    const hasAlreadyVoted = participation?.hasVoted ?? false;

    // 1. Guardias de permiso, padrón y voto único (INV-06 / RGF-25)
    const check = canCastBallot(role, this.status, isEligible, hasAlreadyVoted);
    if (!check.allowed) {
      return { ok: false, error: check.reason ?? "No estás habilitado para emitir tu voto." };
    }

    const candidateIds = this.snapshot.map((s) => s.candidateId);
    let ballotStatus: "VALIDA" | "ANULADA_POR_ELECTOR" = "VALIDA";

    if (isAnnulled) {
      // Anulación voluntaria en 2 pasos
      ballotStatus = "ANULADA_POR_ELECTOR";
    } else {
      // 2. Validación pura de boleta
      const validation = validateBallot(
        selections,
        {
          minMemberMarks: 1,
          maxMemberMarks: this.seats,
          presidentMarks: 1,
        },
        candidateIds,
      );

      if (!validation.ok) {
        return {
          ok: false,
          error: "La boleta contiene errores y no puede ser procesada como voto válido.",
          errors: validation.errors.map((e) => e.message),
        };
      }
    }

    // 3. Comprobante anónimo de alta entropía (CSPRNG).
    const receiptHash = randomBytes(32).toString("hex");

    // Sello de la boleta truncado al día: una hora exacta permitiría cruzarla con
    // `participations.castAt` y descubrir quién la emitió (INV-04).
    const castAt = new Date().toISOString().slice(0, 10) + "T00:00:00.000Z";

    // 4. Boleta para la urna ciega: id aleatorio (no ordenable), sin identidad.
    const selectionsToStore = ballotStatus === "VALIDA" ? [...selections] : [];
    const storedBallot: StoredBallot = {
      id: randomUUID(),
      status: ballotStatus,
      selections: selectionsToStore,
      castAt,
      receiptHash,
    };

    // 5. Evento de auditoría SIN identidad, SIN comprobante y SIN contenido.
    // Solo deja constancia de que se depositó una boleta.
    const auditEntry = appendAuditEntry(this.auditLog, "ANONIMO", "VOTER", "BOLETA_EMITIDA", {});

    // 6. Transacción ACID atómica en PostgreSQL (INV-04)
    try {
      await postgresDb.atomicCastBallot(voterCi, storedBallot, auditEntry);
    } catch (dbErr: unknown) {
      const msg = dbErr instanceof Error ? dbErr.message : "Error al persistir el voto en PostgreSQL.";
      return { ok: false, error: msg };
    }

    // 7. Actualizar el estado en memoria
    this.ballots.push(storedBallot);
    if (participation) {
      participation.hasVoted = true;
      participation.votedAt = new Date().toISOString();
    }
    this.auditLog.push(auditEntry);

    return { ok: true, receiptHash, status: ballotStatus };
  }

  /**
   * Verifica que un comprobante corresponda a una boleta depositada en la urna.
   *
   * Solo confirma la inclusión: no devuelve el contenido ni el estado de la
   * boleta, para que el comprobante no sirva para demostrar a un tercero cómo
   * se votó (receipt-freeness).
   */
  public hasReceipt(receiptHash: string): boolean {
    const cleanHash = receiptHash.trim().toLowerCase();
    return this.ballots.some((b) => b.receiptHash.toLowerCase() === cleanHash);
  }

  public async runTally(actor: SessionActor): Promise<{
    ok: boolean;
    tallyResult: TallyResult;
    quorum: QuorumResult;
    error?: string;
  }> {
    await this.ensureReady();

    if (this.status !== "CERRADA" && this.status !== "ESCRUTADA" && this.status !== "PROCLAMADA") {
      throw new Error("El escrutinio solo se puede realizar cuando la votación está CERRADA.");
    }

    const validBallots = this.ballots.filter((b) => b.status === "VALIDA");
    const annulledBallots = this.ballots.filter((b) => b.status === "ANULADA_POR_ELECTOR");
    const candidateIds = this.snapshot.map((s) => s.candidateId);

    const tallyBallots = validBallots.map((b) => ({
      selections: b.selections,
    }));

    const result = tally(tallyBallots, candidateIds, this.seats);
    const quorum = computeQuorum({
      validBallots: validBallots.length,
      annulledBallots: annulledBallots.length,
      eligibleMembers: this.padron.size,
      quorumPct: this.config.minParticipationPercentage,
    });

    this.tallyResult = result;
    if (this.status === "CERRADA") {
      this.status = "ESCRUTADA";
    }

    // Registro inmutable en la cadena WORM (Item 7.3)
    const auditEntry = appendAuditEntry(this.auditLog, actor.ci, actor.role, "ESCRUTINIO_REALIZADO", {
      presidentId: result.presidentId,
      validBallots: validBallots.length,
      annulledBallots: annulledBallots.length,
      quorumMet: quorum.quorumMet,
    });
    this.auditLog.push(auditEntry);

    // Persistir el resultado oficial en PostgreSQL
    await postgresDb.saveTally(
      this.status,
      result,
      {
        validBallots: validBallots.length,
        annulledBallots: annulledBallots.length,
        quorumPct: this.config.minParticipationPercentage,
        quorum,
      },
      auditEntry,
    );

    return { ok: true, tallyResult: result, quorum };
  }

  public async saveCompositionState(
    actor: SessionActor,
    composition: SecretariatComposition,
    vpId?: string | null,
  ) {
    await this.ensureReady();
    this.composition = composition;
    if (vpId) {
      this.designatedVpId = vpId;
    }

    const auditEntry = appendAuditEntry(
      this.auditLog,
      actor.ci,
      actor.role,
      "COMPOSICION_SECRETARIADO_ACTUALIZADA",
      {
        version: composition.version,
        presidentId: composition.president.candidateId,
        vicePresidentId: composition.vicePresident?.candidateId,
      },
    );
    this.auditLog.push(auditEntry);

    await postgresDb.appendAuditEntryDirect(auditEntry);
  }

  public async setStatus(newStatus: ProcessStatus, actor: SessionActor) {
    await this.ensureReady();
    const previous = this.status;
    this.status = newStatus;
    await postgresDb.setStatus(newStatus);

    const eventType: AuditEventType =
      newStatus === "ABIERTA" ? "VOTACION_ABIERTA" : newStatus === "CERRADA" ? "VOTACION_CERRADA" : "CONFIGURACION_MODIFICADA";
    await this.recordAudit(actor.ci, actor.role, eventType, { from: previous, to: newStatus });
  }

  /**
   * Añade un evento a la cadena de auditoría y lo persiste.
   */
  public async recordAudit(
    actorCi: string,
    actorRole: string,
    eventType: AuditEventType,
    details: Record<string, unknown>,
  ): Promise<void> {
    await this.ensureReady();
    const entry = appendAuditEntry(this.auditLog, actorCi, actorRole, eventType, details);
    this.auditLog.push(entry);
    await postgresDb.appendAuditEntryDirect(entry);
  }

  public getAuditStatus() {
    return {
      entriesCount: this.auditLog.length,
      integrity: verifyAuditChainIntegrity(this.auditLog),
      latestHash: this.auditLog.length > 0 ? this.auditLog[this.auditLog.length - 1]!.hash : null,
    };
  }
}

// Singleton global
declare global {
  var __feuElectionStore: ElectionStore | undefined;
}

export const electionStore: ElectionStore =
  global.__feuElectionStore ?? (global.__feuElectionStore = new ElectionStore());
