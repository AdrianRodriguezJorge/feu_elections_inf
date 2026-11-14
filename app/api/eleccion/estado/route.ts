import { NextResponse } from "next/server";
import { z } from "zod";
import { hasPermission } from "@/domain/permissions";
import type { ProcessStatus } from "@/domain/types";
import { electionStore } from "@/server/election-store";
import { parseBody, requirePermission, requireSession } from "@/server/guard";

/** Estados en los que el votante puede ver los resultados. */
const RESULTS_PUBLIC_STATUSES: readonly ProcessStatus[] = ["PROCLAMADA", "VP_DESIGNADA", "FINALIZADA", "VACANTE"];

/**
 * Estado de la elección según el rol de la sesión.
 *
 * Nunca devuelve el listado de electores: el votante solo recibe su propia
 * ficha y los roles de supervisión, la participación agregada por brigada.
 */
export async function GET() {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;
  const { user } = guard;

  await electionStore.ensureReady();
  const summary = electionStore.getSummary();
  const isAuthority = user.role === "ADMIN" || user.role === "COMMISSION";
  const canSeeTurnout = hasPermission(user.role, "VIEW_TURNOUT_DETAIL");

  const candidates = electionStore.snapshot.map((c) =>
    isAuthority ? c : { ...c, ci: "", studentId: "" },
  );

  const myRecord = electionStore.padron.get(user.ci);
  const myParticipation = electionStore.participations.get(user.ci);
  const me = myRecord
    ? {
        name: myRecord.fullName,
        brigadeCode: myRecord.brigadeCode,
        hasVoted: myParticipation?.hasVoted ?? false,
      }
    : null;

  let brigadeTurnout: Array<{ code: string; total: number; voted: number }> | undefined;
  if (canSeeTurnout) {
    const byBrigade = new Map<string, { total: number; voted: number }>();
    for (const p of electionStore.participations.values()) {
      const entry = byBrigade.get(p.brigadeCode) ?? { total: 0, voted: 0 };
      entry.total += 1;
      if (p.hasVoted) entry.voted += 1;
      byBrigade.set(p.brigadeCode, entry);
    }
    brigadeTurnout = [...byBrigade.entries()]
      .map(([code, v]) => ({ code, ...v }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  const commission = electionStore.commission.map((m) =>
    isAuthority ? m : { ...m, ci: "" },
  );

  const resultsVisible = user.role !== "VOTER" || RESULTS_PUBLIC_STATUSES.includes(electionStore.status);

  return NextResponse.json({
    ok: true,
    summary,
    config: electionStore.config,
    candidates,
    me,
    brigadeTurnout,
    commission,
    tallyResult: resultsVisible ? electionStore.tallyResult : null,
    designatedVpId: resultsVisible ? electionStore.designatedVpId : null,
    composition: resultsVisible ? electionStore.composition : null,
  });
}

const actionSchema = z.object({ action: z.enum(["ABRIR", "CERRAR"]) });

/**
 * Abre o cierra la votación. Solo Comisión o Administrador.
 *
 * Abrir solo desde CONVOCADO o LISTO; cerrar solo desde ABIERTA. Un proceso
 * cerrado no se reabre (no hay reinicio de urnas).
 */
export async function POST(request: Request) {
  const body = await parseBody(request, actionSchema);
  if (!body.ok) return body.response;

  const { action } = body.data;
  const guard = await requirePermission(action === "ABRIR" ? "OPEN_VOTING" : "CLOSE_VOTING");
  if (!guard.ok) return guard.response;

  await electionStore.ensureReady();
  const current = electionStore.status;

  if (action === "ABRIR") {
    if (current !== "CONVOCADO" && current !== "LISTO") {
      return NextResponse.json(
        { ok: false, error: `No se puede abrir la votación desde el estado ${current}.` },
        { status: 409 },
      );
    }
    await electionStore.setStatus("ABIERTA", guard.user);
    return NextResponse.json({ ok: true, message: "Votación abierta.", status: electionStore.status });
  }

  if (current !== "ABIERTA") {
    return NextResponse.json(
      { ok: false, error: `Solo se puede cerrar una votación abierta (estado actual: ${current}).` },
      { status: 409 },
    );
  }
  await electionStore.setStatus("CERRADA", guard.user);
  return NextResponse.json({ ok: true, message: "Votación cerrada.", status: electionStore.status });
}
