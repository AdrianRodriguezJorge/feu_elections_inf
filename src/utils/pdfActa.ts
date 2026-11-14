import { jsPDF } from "jspdf";

/**
 * Construcción del acta de escrutinio en PDF.
 *
 * Módulo sin dependencias del navegador: se usa desde el servidor (GET /api/acta).
 */

export interface ActaCandidateRow {
  fullName: string;
  brigadeCode: string;
  memberVotes: number;
  presidentVotes: number;
  condition: string;
}

export interface ActaSignature {
  name: string;
  office: string;
}

export interface ActaData {
  totalEligible: number;
  participations: number;
  participationPct: number;
  quorumMet: boolean;
  effectiveQuorumPct: number;
  quorumException: { pct: number; acta: string } | null;
  rows: ActaCandidateRow[];
  presidentName: string;
  electedPresidentName?: string | null;
  vicePresidentName?: string | null;
  tieSentence?: string | null;
  signatures: ActaSignature[];
  resultHash: string;
  issuedAt: Date;
}

const pct = (v: number) => `${v.toLocaleString("es-ES", { maximumFractionDigits: 2 })} %`;

export function buildActaPdf(data: ActaData): ArrayBuffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const green: [number, number, number] = [19, 109, 84]; // cujae-green-500
  const dark: [number, number, number] = [40, 40, 40];
  const carmesi: [number, number, number] = [143, 22, 57]; // feu-carmesi-500

  let y = 18;
  const ensureSpace = (needed: number) => {
    if (y + needed > 280) {
      doc.addPage();
      y = 20;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...dark);
  doc.text('UNIVERSIDAD TECNOLÓGICA DE LA HABANA "JOSÉ ANTONIO ECHEVERRÍA" (CUJAE)', 105, y, { align: "center" });
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(...carmesi);
  doc.text("FEU", 105, y, { align: "center" });
  y += 4.5;
  doc.setTextColor(...green);
  doc.text("Facultad de Ingeniería Informática", 105, y, { align: "center" });
  y += 5;
  doc.setDrawColor(...green);
  doc.setLineWidth(0.5);
  doc.line(20, y, 190, y);

  y += 9;
  doc.setFontSize(13);
  doc.setTextColor(...dark);
  doc.text("ACTA DE ESCRUTINIO Y PROCLAMACIÓN", 105, y, { align: "center" });
  y += 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Elección del Secretariado de la Facultad", 105, y, { align: "center" });

  y += 9;
  doc.setFontSize(9);
  const intro =
    "La Comisión Electoral de la Facultad de Ingeniería Informática certifica el resultado del escrutinio de la elección del Secretariado, realizada mediante voto libre, igual y secreto.";
  const introLines = doc.splitTextToSize(intro, 170);
  doc.text(introLines, 20, y);
  y += introLines.length * 4.4 + 3;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...green);
  doc.text("PARTICIPACIÓN Y QUÓRUM", 20, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...dark);
  const lines = [
    `Electores con derecho al voto: ${data.totalEligible}`,
    `Electores que votaron: ${data.participations} (${pct(data.participationPct)})`,
    `Quórum requerido: ${pct(data.effectiveQuorumPct)}${
      data.quorumException ? ` (excepción aprobada en el acta ${data.quorumException.acta})` : ""
    }`,
    `Quórum: ${data.quorumMet ? "alcanzado" : "no alcanzado"}`,
  ];
  for (const l of lines) {
    doc.text(l, 22, y);
    y += 4.6;
  }

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...green);
  doc.text("CÓMPUTO DE VOTOS", 20, y);
  y += 3;
  doc.setFillColor(235, 242, 238);
  doc.rect(20, y, 170, 6.5, "F");
  doc.setFontSize(8.5);
  doc.setTextColor(...dark);
  doc.text("Candidato", 22, y + 4.5);
  doc.text("Brigada", 92, y + 4.5, { align: "center" });
  doc.text("Votos miembro", 117, y + 4.5, { align: "center" });
  doc.text("Votos presidente", 145, y + 4.5, { align: "center" });
  doc.text("Condición", 175, y + 4.5, { align: "center" });
  y += 6.5;
  doc.setFont("helvetica", "normal");
  data.rows.forEach((row, idx) => {
    ensureSpace(6);
    if (idx % 2 === 1) {
      doc.setFillColor(248, 248, 248);
      doc.rect(20, y, 170, 5.5, "F");
    }
    doc.text(doc.splitTextToSize(row.fullName, 58)[0] as string, 22, y + 4);
    doc.text(row.brigadeCode, 92, y + 4, { align: "center" });
    doc.text(String(row.memberVotes), 117, y + 4, { align: "center" });
    doc.text(String(row.presidentVotes), 145, y + 4, { align: "center" });
    doc.text(row.condition, 175, y + 4, { align: "center" });
    y += 5.5;
  });

  y += 6;
  ensureSpace(30);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Presidente: ${data.presidentName}`, 20, y);
  y += 5;
  if (data.electedPresidentName) {
    doc.setFont("helvetica", "normal");
    doc.text(`Presidente electo: ${data.electedPresidentName}`, 20, y);
    y += 5;
    doc.setFont("helvetica", "bold");
  }
  doc.text(`Vicepresidente: ${data.vicePresidentName ?? "Pendiente de designación"}`, 20, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  if (data.tieSentence) {
    const t = doc.splitTextToSize(data.tieSentence, 170);
    ensureSpace(t.length * 4.4 + 4);
    doc.text(t, 20, y);
    y += t.length * 4.4 + 3;
  }

  ensureSpace(14);
  doc.setFontSize(8);
  doc.text("Huella digital del resultado:", 20, y);
  y += 4;
  doc.setFont("courier", "normal");
  doc.text(data.resultHash, 20, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (data.signatures.length === 0) {
    doc.text("Firmas de la Comisión Electoral: (Comisión no registrada)", 20, y);
  } else {
    const colX = [55, 145];
    data.signatures.forEach((s, i) => {
      const col = i % 2;
      if (col === 0) ensureSpace(20);
      const x = colX[col] as number;
      doc.setDrawColor(150, 150, 150);
      doc.line(x - 28, y, x + 28, y);
      doc.setFont("helvetica", "bold");
      doc.text(s.name, x, y + 4.5, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.text(s.office, x, y + 9, { align: "center" });
      if (col === 1 || i === data.signatures.length - 1) y += 22;
    });
  }

  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text(
    `Expedida el ${data.issuedAt.toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })} · Facultad de Ingeniería Informática, CUJAE`,
    105,
    288,
    { align: "center" },
  );

  return doc.output("arraybuffer");
}
