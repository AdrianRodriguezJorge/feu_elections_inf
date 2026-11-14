import type { ProcessCandidateSnapshot } from "@/domain/candidates";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { surnameFirst } from "./shared";

interface BaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  disabled: boolean;
}

export function ReviewDialog({
  open,
  onOpenChange,
  onConfirm,
  disabled,
  president,
  members,
  seats,
}: BaseDialogProps & { president?: ProcessCandidateSnapshot | undefined; members: ProcessCandidateSnapshot[]; seats: number }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revise su voto</DialogTitle>
          <DialogDescription>Compruebe su selección. Una vez confirmado, el voto no se puede cambiar.</DialogDescription>
        </DialogHeader>
        <dl className="mt-4 divide-y divide-line border-y border-line text-base text-ink-900">
          <div className="py-3">
            <dt className="text-sm text-ink-600">Presidente</dt>
            <dd className="font-semibold">{president ? surnameFirst(president) : "—"}</dd>
          </div>
          <div className="py-3">
            <dt className="text-sm text-ink-600">
              Miembros ({members.length} de {seats})
            </dt>
            <dd>
              <ul className="mt-1 space-y-0.5">
                {members.map((c) => (
                  <li key={c.candidateId}>{surnameFirst(c)}</li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Volver a la boleta</Button>
          </DialogClose>
          <Button variant="primary" onClick={onConfirm} disabled={disabled}>
            Confirmar voto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AnnulDialog({ open, onOpenChange, onConfirm, disabled }: BaseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Desea anular su boleta?</DialogTitle>
          <DialogDescription>
            En las elecciones de la FEU no existe el voto en blanco. Si decide no apoyar a ningún candidato, su boleta
            se registrará como <strong>anulada por el elector</strong>.
          </DialogDescription>
        </DialogHeader>
        <Alert tone="warn" className="mt-3">
          <strong>Importante:</strong> su boleta contará para la participación mínima requerida, pero{" "}
          <strong>no sumará votos</strong> a ningún candidato. Esta acción no se puede deshacer y consume su voto.
        </Alert>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Volver a la boleta</Button>
          </DialogClose>
          <Button variant="danger" onClick={onConfirm} disabled={disabled}>
            Sí, anular boleta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
