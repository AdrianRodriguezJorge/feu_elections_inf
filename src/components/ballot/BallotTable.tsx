import { cn } from "@/lib/utils";
import { surnameFirst, type BallotMarksProps } from "./shared";

/** Boleta de escritorio: formulario oficial con reglas finas y casillas de 24 px. */
export function BallotTable({
  candidates,
  seats,
  memberMarks,
  presidentMark,
  onToggleMember,
  onSelectPresident,
  onShowBio,
}: BallotMarksProps) {
  return (
    <table className="hidden w-full border-collapse text-left md:table">
      <thead>
        <tr className="border-b border-line-strong text-sm font-bold text-ink-800">
          <th scope="col" className="w-16 py-3 pr-2 text-center">
            Nº
          </th>
          <th scope="col" className="py-3 pr-4">
            Apellidos y nombres
          </th>
          <th scope="col" className="w-28 py-3 text-center">
            Brigada
          </th>
          <th scope="col" className="w-32 py-3 text-center">
            Miembro
            <span className="block text-xs font-normal text-ink-600">hasta {seats}</span>
          </th>
          <th scope="col" className="w-32 py-3 text-center">
            Presidente
            <span className="block text-xs font-normal text-ink-600">solo 1</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {candidates.map((candidate) => {
          const id = candidate.candidateId;
          const isMember = memberMarks.has(id);
          const isPresident = presidentMark === id;
          const displayName = surnameFirst(candidate);
          return (
            <tr key={id} className={cn("border-b border-line", isMember && "bg-action-50")}>
              <td className="py-3 pr-2 text-center text-3xl font-bold tabular-nums text-ink-800">
                {candidate.ballotPosition}
              </td>
              <td className="py-3 pr-4">
                <div className="text-base font-semibold text-ink-900">{displayName}</div>
                <button
                  type="button"
                  onClick={() => onShowBio(candidate)}
                  className="min-h-11 text-sm text-action underline underline-offset-2 hover:text-action-hover"
                  aria-label={`Leer biografía y propuestas de ${displayName}`}
                >
                  Leer biografía y propuestas
                </button>
              </td>
              <td className="py-3 text-center font-mono text-sm text-ink-700">{candidate.brigadeCode}</td>
              <td className="py-3 text-center">
                <label className="inline-flex h-11 w-11 cursor-pointer items-center justify-center">
                  <input
                    type="checkbox"
                    checked={isMember}
                    onChange={() => onToggleMember(id)}
                    aria-label={`Miembro: ${displayName}`}
                    className="h-6 w-6 cursor-pointer accent-action"
                  />
                </label>
              </td>
              <td className="py-3 text-center">
                <label className="inline-flex h-11 w-11 cursor-pointer items-center justify-center">
                  <input
                    type="radio"
                    name="desktopPresidentSelection"
                    checked={isPresident}
                    onChange={() => onSelectPresident(id)}
                    aria-label={`Presidente: ${displayName}`}
                    className="h-6 w-6 cursor-pointer accent-action"
                  />
                </label>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
