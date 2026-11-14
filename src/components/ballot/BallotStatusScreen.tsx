import { Ban, BarChart3, Clock, Lock, Scale, type LucideIcon } from "lucide-react";

interface StatusScreen {
  icon: LucideIcon;
  title: string;
  body: string;
}

function statusScreen(status: string): StatusScreen {
  switch (status) {
    case "CONVOCADO":
      return {
        icon: Clock,
        title: "La votación aún no ha comenzado",
        body: "La Comisión Electoral abrirá la votación cuando inicie la jornada electoral. Vuelva a esta página entonces.",
      };
    case "CERRADA":
      return {
        icon: Lock,
        title: "La votación ha cerrado",
        body: "La Comisión Electoral realizará el escrutinio. Los resultados se publicarán aquí.",
      };
    case "SIN_QUORUM":
      return {
        icon: Ban,
        title: "Elección no válida",
        body: "La participación no superó el mínimo requerido por el Reglamento (Art. 38), por lo que no se proclama a ningún candidato. La Comisión Electoral informará los próximos pasos.",
      };
    case "EMPATE":
      return {
        icon: Scale,
        title: "Resultados pendientes",
        body: "La Comisión Electoral está resolviendo un empate según el Reglamento. Los resultados se publicarán cuando concluya.",
      };
    case "PROCLAMADA":
    case "VP_DESIGNADA":
    case "FINALIZADA":
    case "VACANTE":
      return { icon: BarChart3, title: "Resultados publicados", body: "Consulte la pestaña Resultados." };
    default:
      return {
        icon: Clock,
        title: "La votación no está disponible",
        body: "En este momento no se puede votar. Consulte a la Comisión Electoral.",
      };
  }
}

/** Pantalla sobria para cuando no se puede votar (estado del proceso o elector no registrado). */
export function BallotMessage({ icon: Icon, title, body }: { icon?: LucideIcon; title: string; body: string }) {
  return (
    <section className="mx-auto max-w-2xl rounded-md border border-line bg-white px-6 py-10 text-center sm:px-12">
      {Icon && <Icon className="mx-auto mb-4 h-8 w-8 text-ink-600" strokeWidth={1.75} aria-hidden />}
      <h2 className="text-2xl font-bold text-ink-900">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-ink-700">{body}</p>
    </section>
  );
}

export function BallotStatusScreen({ status }: { status: string }) {
  return <BallotMessage {...statusScreen(status)} />;
}
