import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { JobPosition } from '@/types/recruitment';
import { ResumeUpload } from './ResumeUpload';
import { supabase } from '@/integrations/supabase/client';

interface NewCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPosition?: JobPosition | null;
}

export function NewCandidateModal({ isOpen, onClose, selectedPosition }: NewCandidateModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string>('');
  const { toast } = useToast();

  const handleResumeUpload = async (url: string, fileName: string) => {
    setUploadedFile(fileName);
    setIsProcessing(true);
    
    try {
      // Enviar para o N8N via edge function
      const { data, error } = await supabase.functions.invoke('send-resume-to-n8n', {
        body: {
          resumeUrl: url,
          fileName: fileName,
          positionId: selectedPosition?.id || 'vendedor',
          positionTitle: selectedPosition?.title || 'Vendedor'
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Currículo enviado para análise",
        description: "O currículo foi enviado para processamento no N8N.",
      });
      
      // Fechar modal após sucesso
      setTimeout(() => {
        handleClose();
      }, 2000);
      
    } catch (error) {
      console.error('Erro ao enviar para N8N:', error);
      toast({
        title: "Erro no envio",
        description: "Falha ao enviar currículo para análise.",
        variant: "destructive",
      });
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
            <CardTitle className="text-lg">Upload de Currículo</CardTitle>
            {selectedPosition && (
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                <div className="text-sm font-medium text-primary">
                  Vaga: {selectedPosition.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedPosition.department}
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {!isProcessing ? (
              <ResumeUpload
                candidateId="temp"
                onUploadComplete={handleResumeUpload}
              />
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-lg font-medium">Enviando para análise...</p>
                <p className="text-sm text-muted-foreground">
                  O currículo "{uploadedFile}" está sendo processado pelo N8N
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