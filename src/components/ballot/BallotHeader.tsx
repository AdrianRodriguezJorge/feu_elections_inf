import { Badge } from "@/components/ui/badge";

interface BallotHeaderProps {
  voterName: string;
  brigadeCode?: string | undefined;
  canVote: boolean;
  seats: number;
  memberCount: number;
  presidentName: string | null;
}

/** Encabezado del formulario: elector, instrucciones y contador de marcas. */
export function BallotHeader({ voterName, brigadeCode, canVote, seats, memberCount, presidentName }: BallotHeaderProps) {
  return (
    <header className="border-b border-line-strong pb-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-700">
        <p>
          Elector: <strong className="text-ink-900">{voterName}</strong> · Brigada{" "}
          <strong className="text-ink-900">{brigadeCode ?? "—"}</strong>
        </p>
        {canVote && <Badge tone="action">Puede votar</Badge>}
      </div>

      <h2 className="mt-5 text-2xl font-bold text-ink-900 sm:text-3xl">Boleta oficial</h2>
      <p className="mt-1 text-base text-ink-700">Elección del Secretariado de la FEU</p>

      <ol className="mt-4 list-decimal space-y-1 pl-5 text-base text-ink-800">
        <li>
          Marque <strong>hasta {seats} miembros</strong> para el Secretariado.
        </li>
        <li>
          Marque <strong>1 presidente</strong> entre los candidatos que eligió como miembro.
        </li>
      </ol>

      <dl className="mt-5 hidden gap-8 text-sm md:flex">
        <div>
          <dt className="text-ink-600">Miembros marcados</dt>
          <dd className="text-xl font-bold text-ink-900">
            {memberCount} <span className="text-sm font-normal text-ink-600">de {seats}</span>
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-ink-600">Presidente</dt>
          <dd className="truncate text-xl font-bold text-ink-900">{presidentName ?? "Pendiente"}</dd>
        </div>
      </dl>
    </header>
  );
}
