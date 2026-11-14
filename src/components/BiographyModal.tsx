"use client";

import { ProcessCandidateSnapshot } from "@/domain/candidates";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BiographyModalProps {
  candidate: ProcessCandidateSnapshot | null;
  onClose: () => void;
}

export function BiographyModal({ candidate, onClose }: BiographyModalProps) {
  return (
    <Dialog open={!!candidate} onOpenChange={(open) => !open && onClose()}>
      {candidate && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl">{candidate.fullName}</DialogTitle>
            <DialogDescription>Brigada {candidate.brigadeCode}</DialogDescription>
          </DialogHeader>

          <div className="my-4 max-h-72 overflow-y-auto rounded-lg bg-gray-50 p-4 text-sm text-gray-900">
            <h3 className="mb-2 font-semibold text-gray-800">Biografía y trayectoria estudiantil</h3>
            <p className="whitespace-pre-line leading-relaxed">
              {candidate.biographyMd || "Este candidato aún no tiene biografía publicada."}
            </p>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="primary">Cerrar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
