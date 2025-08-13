import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface TalentPoolReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  candidateName: string;
}

export function TalentPoolReasonModal({ isOpen, onClose, onConfirm, candidateName }: TalentPoolReasonModalProps) {
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Adicionar ao Banco de Talentos</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Você está movendo <strong>{candidateName}</strong> para o banco de talentos.
            Por favor, descreva o motivo ou potencial para futuras oportunidades.
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="talent-reason">Motivo para banco de talentos</Label>
            <Textarea
              id="talent-reason"
              placeholder="Ex: Perfil interessante mas sem vaga adequada no momento, boa experiência técnica mas precisa desenvolver soft skills, candidato qualificado para posições futuras..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!reason.trim()}>
            Adicionar ao Banco de Talentos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}