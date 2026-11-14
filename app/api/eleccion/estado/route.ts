import { NextResponse } from "next/server";
import { z } from "zod";
import { hasPermission } from "@/domain/permissions";
import { RESULTS_PUBLIC_STATUSES } from "@/domain/states";
import { closeVoting, getElectionView, openVoting, summarize } from "@/server/election-service";
import { errorResponse, parseBody, requirePermission, requireSession } from "@/server/guard";

/**
 * Estado de la elección según el rol de la sesión.
 *
 * Nunca devuelve el listado de electores: el votante recibe solo su propia
 * ficha y los roles de supervisión, la participación agregada por brigada.
 */
export async function GET() {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;
  const { user } = guard;

  try {
    const view = await getElectionView();
    const isAuthority = user.role === "ADMIN" || user.role === "COMMISSION";

    const mine = view.electors.get(user.ci);
    const me = mine ? { name: mine.name, brigadeCode: mine.brigadeCode, hasVoted: mine.hasVoted } : null;

    let brigadeTurnout: Array<{ code: string; total: number; voted: number }> | undefined;
    if (hasPermission(user.role, "VIEW_TURNOUT_DETAIL")) {
      const byBrigade = new Map<string, { total: number; voted: number }>();
      for (const e of view.electors.values()) {
        const code = e.brigadeCode || "Sin brigada";
        const entry = byBrigade.get(code) ?? { total: 0, voted: 0 };
        entry.total += 1;
        if (e.hasVoted) entry.voted += 1;
        byBrigade.set(code, entry);
      }
      brigadeTurnout = [...byBrigade.entries()].map(([code, v]) => ({ code, ...v })).sort((a, b) => a.code.localeCompare(b.code));
    }

    const resultsVisible = user.role !== "VOTER" || RESULTS_PUBLIC_STATUSES.includes(view.status);

    return NextResponse.json({
      ok: true,
      summary: summarize(view),
      quorum: {
        basePct: view.quorumBasePct,
        effectivePct: view.quorumPct,
        exception: view.quorumException,
      },
      candidates: view.candidates.map((c) => (isAuthority ? c : { ...c, ci: "", studentId: "" })),
      me,
      brigadeTurnout,
      commission: view.commission.map((m) => (isAuthority ? m : { ...m, ci: "" })),
      tallyResult: resultsVisible ? view.tallyResult : null,
      tallyQuorum: resultsVisible ? view.quorum : null,
      tieResolution: resultsVisible ? view.tieResolution : null,
      composition: resultsVisible ? view.composition : null,
      designatedVpId: resultsVisible ? (view.composition?.vicePresident?.candidateId ?? null) : null,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

const actionSchema = z.object({ action: z.enum(["ABRIR", "CERRAR"]) });

/** Abre o cierra la votación según la máquina de estados (sin reaperturas). */
export async function POST(request: Request) {
  const body = await parseBody(request, actionSchema);
  if (!body.ok) return body.response;
  const { action } = body.data;

  const guard = await requirePermission(action === "ABRIR" ? "OPEN_VOTING" : "CLOSE_VOTING");
  if (!guard.ok) return guard.response;

  try {
    if (action === "ABRIR") await openVoting(guard.user);
    else await closeVoting(guard.user);
    return NextResponse.json({ ok: true, message: action === "ABRIR" ? "Votación abierta." : "Votación cerrada." });
  } catch (err) {
    return errorResponse(err);
  }
}
