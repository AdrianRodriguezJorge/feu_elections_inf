import { jsPDF } from "jspdf";
import { SecretariatComposition } from "@/domain/vacancies";

export interface PdfTotalRow {
  candidateId: string;
  fullName: string;
  brigadeCode: string;
  memberVotes: number;
  presidentVotes: number;
  isElected: boolean;
  isPresident: boolean;
}

export interface PdfTallyData {
  totals: PdfTotalRow[];
  elected: string[];
  presidentId: string | null;
  president?: { name: string; fullName: string; brigadeCode: string } | null | undefined;
  tie: { type: "CUT" | "PRESIDENT"; candidateIds: string[] } | null;
}

export interface GenerateActaPdfParams {
  tally: PdfTallyData;
  totalEligible: number;
  participations: number;
  participationPct: number;
  quorumMet: boolean;
  minPct: number;
  candidacyHash: string;
  designatedVpName?: string | undefined;
  composition?: SecretariatComposition | null | undefined;
}

export function generateActaPdf(params: GenerateActaPdfParams) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const {
    tally,
    totalEligible,
    participations,
    participationPct,
    quorumMet,
    minPct,
    candidacyHash,
    designatedVpName,
    composition,
  } = params;

  // Colores institucionales
  const darkGreen: [number, number, number] = [19, 109, 84]; // #136D54
  const darkGray: [number, number, number] = [40, 40, 40];
  const feuRed: [number, number, number] = [143, 22, 57]; // #8F1639

  let y = 18;

  // 1. Membrete Institucional
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...feuRed);
  doc.text("UNIVERSIDAD TECNOLÓGICA DE LA HABANA \"JOSÉ ANTONIO ECHEVERRÍA\" (CUJAE)", 105, y, { align: "center" });

  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(...darkGreen);
  doc.text("FEDERACIÓN ESTUDIANTIL UNIVERSITARIA · FACULTAD DE INGENIERÍA INFORMÁTICA", 105, y, { align: "center" });

  y += 7;
  doc.setDrawColor(19, 109, 84);
  doc.setLineWidth(0.5);
  doc.line(20, y, 190, y);

  // 2. Título del Acta
  y += 9;
  doc.setFontSize(13);
  doc.setTextColor(...darkGray);
  doc.text("ACTA OFICIAL DE ESCRUTINIO Y PROCLAMACIÓN", 105, y, { align: "center" });

  y += 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Proceso Electoral 2026 · Elección del Secretariado de Facultad`, 105, y, { align: "center" });

  // 3. Párrafo de Apertura
  y += 8;
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);
  const introText =
    "En la Facultad de Ingeniería Informática de la CUJAE, reunida la Comisión Electoral constituida conforme al Artículo 47 del Reglamento General de la FEU (ABC 2019), se procede a certificar el resultado del escrutinio de la urna electoral y a dar fe de la voluntad soberana expresada por la membresía estudiantil mediante sufragio universal, igual y secreto.";
  const splitIntro = doc.splitTextToSize(introText, 170);
  doc.text(splitIntro, 20, y);
  y += splitIntro.length * 4.2 + 2;

  // 4. Recuadro de Participación y Validez
  doc.setFillColor(245, 249, 247);
  doc.setDrawColor(200, 225, 215);
  doc.roundedRect(20, y, 170, 24, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...darkGreen);
  doc.text("CERTIFICACIÓN DE PARTICIPACIÓN REQUERIDA (ARTÍCULO 38 DEL ABC)", 25, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(40, 40, 40);
  doc.text(`• Membresía con Derecho al Voto: ${totalEligible} electores`, 25, y + 10);
  doc.text(`• Boletas Depositadas en Urna: ${participations} boletas`, 25, y + 14);
  doc.text(`• Porcentaje de Participación: ${participationPct} %`, 25, y + 18);

  doc.setFont("helvetica", "bold");
  doc.text(
    `• Requisito Reglamentario (> ${minPct} %): ${quorumMet ? "CUMPLIDO SATISFACTORIAMENTE" : "NO ALCANZADO"}`,
    105,
    y + 10,
  );
  doc.text(`• Presidente Electo: ${tally.president?.fullName || "Pendiente de desempate"}`, 105, y + 14);
  if (designatedVpName) {
    doc.text(`• Vicepresidente Designado: ${designatedVpName}`, 105, y + 18);
  }

  y += 30;

  // 5. Tabla de Cómputo de Votos
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...darkGreen);
  doc.text("CÓMPUTO OFICIAL DE SUFRAGIOS", 20, y);
  y += 4;

  // Cabecera de la tabla
  doc.setFillColor(235, 242, 238);
  doc.rect(20, y, 170, 6, "F");
  doc.setFontSize(7.5);
  doc.setTextColor(...darkGray);
  doc.text("Candidato / Elector", 23, y + 4.2);
  doc.text("Brigada", 95, y + 4.2, { align: "center" });
  doc.text("Votos Miembro", 125, y + 4.2, { align: "center" });
  doc.text("Votos Presidente", 155, y + 4.2, { align: "center" });
  doc.text("Condición", 178, y + 4.2, { align: "center" });
  y += 6;

  // Filas
  doc.setFont("helvetica", "normal");
  tally.totals.forEach((row, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(20, y, 170, 5, "F");
    }

    doc.setFont("helvetica", row.isPresident ? "bold" : "normal");
    doc.setTextColor(row.isPresident ? 143 : 40, row.isPresident ? 22 : 40, row.isPresident ? 57 : 40);

    doc.text(row.fullName, 23, y + 3.8);
    doc.text(row.brigadeCode, 95, y + 3.8, { align: "center" });
    doc.text(String(row.memberVotes), 125, y + 3.8, { align: "center" });
    doc.text(String(row.presidentVotes), 155, y + 3.8, { align: "center" });

    const condicion = row.isPresident ? "Presidente Electo" : row.isElected ? "Electo al Secretariado" : "No electo";
    doc.text(condicion, 178, y + 3.8, { align: "center" });

    y += 5;
  });

  // 6. Composición Actualizada del Secretariado si existe versionado de vacantes
  if (composition && composition.version > 1) {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...feuRed);
    doc.text(`ACTUALIZACIÓN DE COMPOSICIÓN · VERSIÓN ${composition.version}`, 20, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(60, 60, 60);
    doc.text(`Motivo reglamentario: ${composition.reason} (Arts. 99–102 del ABC)`, 20, y);
    y += 3.5;
    doc.text(`Presidente en funciones: ${composition.president.fullName} | Vicepresidente: ${composition.vicePresident?.fullName || "Vacante"}`, 20, y);
    y += 4;
  }

  // 7. Cláusula de Validez y Criptografía
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  const legalText =
    "Habiéndose verificado las condiciones estatutarias de participación y el principio inviolable de voto secreto en urna ciega, la Comisión Electoral declara formalmente válida esta elección conforme a los Artículos 38, 40, 59, 61, 63 y 67 del ABC de la FEU (2019).";
  const splitLegal = doc.splitTextToSize(legalText, 170);
  doc.text(splitLegal, 20, y);
  y += splitLegal.length * 3.5 + 4;

  // Hash SHA-256
  doc.setFont("courier", "normal");
  doc.setFontSize(7);
  doc.text(`Sello Criptográfico SHA-256: ${candidacyHash}`, 20, y);
  y += 14;

  // 8. Bloque de Firmas de la Comisión Electoral
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...darkGray);

  // Líneas de firma
  doc.setDrawColor(150, 150, 150);
  doc.line(25, y, 65, y);
  doc.line(85, y, 125, y);
  doc.line(145, y, 185, y);

  doc.text("Elena García Méndez", 45, y + 4, { align: "center" });
  doc.text("Frank Hernández Pérez", 105, y + 4, { align: "center" });
  doc.text("Giselle López Reyes", 165, y + 4, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("Presidente de la Comisión", 45, y + 7.5, { align: "center" });
  doc.text("Vicepresidente de la Comisión", 105, y + 7.5, { align: "center" });
  doc.text("Secretario de la Comisión", 165, y + 7.5, { align: "center" });

  // Pie de página
  doc.setFontSize(6.5);
  doc.text(
    `Documento oficial expedido el ${new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })} · FEU Informática CUJAE`,
    105,
    285,
    { align: "center" },
  );

  // Descargar archivo
  doc.save(`Acta-Escrutinio-FEU-Informatica-${new Date().toISOString().slice(0, 10)}.pdf`);
}
