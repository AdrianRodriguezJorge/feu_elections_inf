import { Check, Circle, CircleDot, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { surnameFirst, type BallotMarksProps } from "./shared";

const markButton =
  "flex min-h-11 items-center justify-center gap-2 rounded-md border px-2 text-sm font-semibold transition-colors";

/** Boleta móvil: filas apiladas con las mismas reglas finas que la tabla. */
export function BallotCards({
  candidates,
  memberMarks,
  presidentMark,
  onToggleMember,
  onSelectPresident,
  onShowBio,
}: BallotMarksProps) {
  return (
    <ol className="border-t border-line-strong md:hidden">
      {candidates.map((candidate) => {
        const id = candidate.candidateId;
        const isMember = memberMarks.has(id);
        const isPresident = presidentMark === id;
        const displayName = surnameFirst(candidate);
        return (
          <li key={id} className={cn("border-b border-line py-4", isMember && "bg-action-50")}>
            <div className="flex items-start gap-3 px-1">
              <span className="w-9 shrink-0 text-center text-2xl font-bold tabular-nums text-ink-800" aria-hidden>
                {candidate.ballotPosition}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold leading-snug text-ink-900">
                  <span className="sr-only">{candidate.ballotPosition}. </span>
                  {displayName}
                </h3>
                <p className="text-sm text-ink-600">Brigada {candidate.brigadeCode}</p>
                <button
                  type="button"
                  onClick={() => onShowBio(candidate)}
                  aria-label={`Propuestas de ${displayName}`}
                  className="min-h-11 text-sm text-action underline underline-offset-2"
                >
                  Propuestas
                </button>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 px-1">
              <button
                type="button"
                aria-pressed={isMember}
                aria-label={`Miembro: ${displayName}`}
                onClick={() => onToggleMember(id)}
                className={cn(
                  markButton,
                  isMember
                    ? "border-action bg-action text-white"
                    : "border-line-strong bg-white text-ink-800 hover:bg-paper-200",
                )}
              >
                {isMember ? (
                  <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
                ) : (
                  <Square className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                )}
                {/* El estado lo anuncia aria-pressed; el texto visible forma parte del nombre (WCAG 2.5.3). */}
                <span>Miembro</span>
              </button>
              <button
                type="button"
                aria-pressed={isPresident}
                aria-label={`Presidente: ${displayName}`}
                onClick={() => onSelectPresident(id)}
                className={cn(
                  markButton,
                  isPresident
                    ? "border-ink-900 bg-ink-900 text-white"
                    : "border-line-strong bg-white text-ink-800 hover:bg-paper-200",
                )}
              >
                {isPresident ? (
                  <CircleDot className="h-5 w-5" strokeWidth={2} aria-hidden />
                ) : (
                  <Circle className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                )}
                <span>Presidente</span>
              </button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
