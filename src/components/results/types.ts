export interface EnrichedTotal {
  candidateId: string;
  fullName: string;
  brigadeCode: string;
  memberVotes: number;
  presidentVotes: number;
  isElected: boolean;
  isPresident: boolean;
}

export interface CommissionMember {
  name: string;
  office: string;
}

export interface TallyQuorum {
  participations: number;
  participationPct: number;
  quorumMet: boolean;
}

export interface TallyTie {
  type: "CUT" | "PRESIDENT";
  candidateIds: string[];
}

export interface TallyView {
  totals: EnrichedTotal[];
  elected: string[];
  presidentId: string | null;
  president?: { name: string; fullName: string; brigadeCode: string } | null;
  tie: TallyTie | null;
}

export interface TieResolution {
  justification: string;
  acta: string;
}

export const CONNECTION_ERROR = "No se pudo conectar con el servidor. Inténtelo de nuevo.";
