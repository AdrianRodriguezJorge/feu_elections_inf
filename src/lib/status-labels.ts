/** Etiquetas legibles de los estados del proceso y de los cargos (nunca se muestra el valor interno). */

export const STATUS_LABELS: Record<string, string> = {
  CONVOCADO: "Convocada",
  ABIERTA: "Votación abierta",
  CERRADA: "Votación cerrada",
  SIN_QUORUM: "Sin quórum",
  EMPATE: "Empate pendiente",
  PROCLAMADA: "Resultados proclamados",
  VP_DESIGNADA: "Vicepresidente designado",
  FINALIZADA: "Finalizada",
  VACANTE: "Vacante en trámite",
};

export const STATUS_COLORS: Record<string, string> = {
  CONVOCADO: "bg-gray-700 text-white",
  ABIERTA: "bg-cujae-green-500 text-white",
  CERRADA: "bg-amber-800 text-white",
  SIN_QUORUM: "bg-red-700 text-white",
  EMPATE: "bg-orange-800 text-white",
  PROCLAMADA: "bg-blue-700 text-white",
  VP_DESIGNADA: "bg-indigo-700 text-white",
  FINALIZADA: "bg-cujae-green-700 text-white",
  VACANTE: "bg-purple-700 text-white",
};

export function statusLabel(status: string): string {
  if (!status) return "Cargando…";
  return STATUS_LABELS[status] ?? "Estado desconocido";
}

export const OFFICE_LABELS: Record<string, string> = {
  PRESIDENT: "Presidencia",
  VICE_PRESIDENT: "Vicepresidencia",
  SECRETARY: "Secretaría",
  MEMBER: "Miembro",
};

export function officeLabel(office: string): string {
  return OFFICE_LABELS[office] ?? "Miembro";
}

export const VACANCY_REASON_LABELS: Record<string, string> = {
  DIMISION_VOLUNTARIA: "renuncia voluntaria",
  SEPARACION_DISCIPLINARIA: "separación disciplinaria",
  GRADUACION_O_BAJA: "baja o graduación",
};

export function formatPct(value: number): string {
  return `${value.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} %`;
}

export function formatDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
}

export function formatDateTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" });
}
