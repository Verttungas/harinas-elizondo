import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface MotivoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: (motivo: string) => void | Promise<void>;
}

export function MotivoDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  destructive = false,
  loading = false,
  onConfirm,
}: MotivoDialogProps) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setMotivo("");
      setError(null);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (motivo.trim().length < 1) {
      setError("El motivo es obligatorio");
      return;
    }
    setError(null);
    try {
      await onConfirm(motivo.trim());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al confirmar. Inténtelo nuevamente.",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="motivo">Motivo</Label>
          <Textarea
            id="motivo"
            rows={4}
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Describa el motivo..."
          />
          {error && <p className="text-xs text-state-danger">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => void handleConfirm()}
            disabled={loading}
            className={
              destructive
                ? "bg-state-danger text-state-danger-foreground hover:bg-state-danger/90"
                : undefined
            }
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
