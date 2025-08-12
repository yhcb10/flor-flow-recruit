import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { JobPosition } from '@/types/recruitment';
import { ResumeUpload } from './ResumeUpload';
import { supabase } from '@/integrations/supabase/client';

interface NewCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPosition?: JobPosition | null;
  availablePositions?: JobPosition[];
}

export function NewCandidateModal({ isOpen, onClose, selectedPosition, availablePositions = [] }: NewCandidateModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string>('');
  const [selectedJobPosition, setSelectedJobPosition] = useState<string>(selectedPosition?.id || '');
  const { toast } = useToast();

  const handleResumeUpload = async (url: string, fileName: string) => {
    if (!selectedJobPosition) {
      toast({
        title: "Selecione uma vaga",
        description: "É necessário selecionar uma vaga antes de enviar o currículo.",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(fileName);
    setIsProcessing(true);
    
    try {
      const position = availablePositions.find(p => p.id === selectedJobPosition);
      
      // Enviar para o N8N usando a edge function atualizada
      const { data, error } = await supabase.functions.invoke('send-resume-to-n8n', {
        body: {
          resumeUrl: url,
          fileName: fileName,
          positionId: position?.endpointId || selectedJobPosition,
          positionTitle: position?.title || 'Posição não especificada'
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Currículo enviado para análise",
        description: `O currículo foi enviado para processamento da vaga: ${position?.title}`,
      });
      
      // Fechar modal após sucesso
      setTimeout(() => {
        handleClose();
      }, 2000);
      
    } catch (error) {
      console.error('Erro ao enviar currículo:', error);
      
      // Check if the error is due to N8N workflow being inactive
      const errorMessage = error?.message || '';
      if (errorMessage.includes('is not registered') || errorMessage.includes('workflow must be active')) {
        toast({
          title: "Workflow N8N inativo",
          description: "O workflow do N8N precisa estar ativo. Verifique se o workflow está ativado no N8N.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro no envio",
          description: "Falha ao enviar currículo para análise.",
          variant: "destructive",
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setUploadedFile('');
    setIsProcessing(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Upload className="h-6 w-6 text-primary" />
            Enviar Currículo para Análise
          </DialogTitle>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Seleção de Vaga e Upload</CardTitle>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="position-select">Vaga *</Label>
                <Select value={selectedJobPosition} onValueChange={setSelectedJobPosition}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a vaga para este candidato" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePositions.map((position) => (
                      <SelectItem key={position.id} value={position.id}>
                        {position.title} - {position.department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedJobPosition && (
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="text-sm font-medium text-primary">
                    Vaga: {availablePositions.find(p => p.id === selectedJobPosition)?.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {availablePositions.find(p => p.id === selectedJobPosition)?.department}
                  </div>
                  {availablePositions.find(p => p.id === selectedJobPosition)?.endpointId && (
                    <div className="text-xs text-muted-foreground mt-1">
                      ID: {availablePositions.find(p => p.id === selectedJobPosition)?.endpointId}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedJobPosition ? (
              <div className="text-center py-8 text-muted-foreground">
                Selecione uma vaga para habilitar o upload
              </div>
            ) : !isProcessing ? (
              <ResumeUpload
                candidateId="temp"
                onUploadComplete={handleResumeUpload}
              />
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-lg font-medium">Enviando para análise...</p>
                <p className="text-sm text-muted-foreground">
                  O currículo "{uploadedFile}" está sendo processado
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            {isProcessing ? 'Processando...' : 'Cancelar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}