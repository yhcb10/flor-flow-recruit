import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface RejectionReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  candidateName: string;
}

export function RejectionReasonModal({ isOpen, onClose, onConfirm, candidateName }: RejectionReasonModalProps) {
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (reason.trim()) {
      onConfirm(reason.trim());
      setReason('');
      onClose();
    }
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-[425px]"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>Motivo da Rejeição</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="text-sm text-muted-foreground">
            Por favor, informe o motivo da rejeição do candidato <strong>{candidateName}</strong>:
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="reason">Motivo</Label>
            <Textarea
              id="reason"
              placeholder="Descreva o motivo da rejeição..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!reason.trim()}
            variant="destructive"
          >
            Confirmar Rejeição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}