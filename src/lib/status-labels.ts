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
  CONVOCADO: "bg-paper-200 text-ink-800",
  ABIERTA: "bg-action-50 text-action",
  CERRADA: "bg-warn-50 text-warn-900",
  SIN_QUORUM: "bg-danger-50 text-danger-900",
  EMPATE: "bg-warn-50 text-warn-900",
  PROCLAMADA: "bg-paper-200 text-ink-800",
  VP_DESIGNADA: "bg-paper-200 text-ink-800",
  FINALIZADA: "bg-paper-200 text-ink-800",
  VACANTE: "bg-warn-50 text-warn-900",
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
