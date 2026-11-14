import type { ProcessCandidateSnapshot } from "@/domain/candidates";

/** Ficha del elector autenticado (la devuelve el servidor desde la sesión). */
export interface VoterInfo {
  name: string;
  brigadeCode: string;
  hasVoted: boolean;
}

/** Nombre en el orden de la columna "Apellidos y nombres". */
export function surnameFirst(c: ProcessCandidateSnapshot): string {
  const surnames = [c.firstSurname, c.secondSurname].filter(Boolean).join(" ");
  return surnames ? `${surnames}, ${c.name}` : c.fullName;
}

/** Props comunes a las dos presentaciones de la boleta (tabla y filas apiladas). */
export interface BallotMarksProps {
  candidates: ProcessCandidateSnapshot[];
  seats: number;
  memberMarks: Set<string>;
  presidentMark: string | null;
  onToggleMember: (id: string) => void;
  onSelectPresident: (id: string) => void;
  onShowBio: (c: ProcessCandidateSnapshot) => void;
}
