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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileStack } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { JobPosition } from '@/types/recruitment';
import { ResumeUpload } from './ResumeUpload';
import { BulkResumeUpload } from './BulkResumeUpload';
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
  const [selectedSource, setSelectedSource] = useState<'indeed' | 'linkedin'>('indeed');
  const { toast } = useToast();

  const handleResumeUpload = async (url: string, fileName: string, source?: 'indeed' | 'linkedin') => {
    // VALIDAÇÃO CRÍTICA: Verificar se vaga foi selecionada
    if (!selectedJobPosition) {
      toast({
        title: "Selecione uma vaga",
        description: "É necessário selecionar uma vaga antes de enviar o currículo.",
        variant: "destructive",
      });
      return;
    }

    // VALIDAÇÃO: Verificar se a vaga existe
    const position = availablePositions.find(p => p.id === selectedJobPosition);
    if (!position) {
      toast({
        title: "Vaga inválida",
        description: "A vaga selecionada não foi encontrada. Por favor, selecione outra vaga.",
        variant: "destructive",
      });
      return;
    }

    // VALIDAÇÃO: Verificar se a vaga tem webhook path configurado
    if (!position.n8nWebhookPath) {
      toast({
        title: "Configuração incompleta",
        description: `A vaga "${position.title}" não possui um webhook path configurado. Configure nas configurações da vaga.`,
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(fileName);
    setIsProcessing(true);
    
    try {
      console.log('📤 Enviando currículo para análise:', {
        vaga: position.title,
        positionId: position.id,
        n8nWebhookPath: position.n8nWebhookPath,
        source: source || selectedSource
      });
      
      const { data, error } = await supabase.functions.invoke('send-resume-to-n8n', {
        body: {
          resumeUrl: url,
          fileName: fileName,
          positionId: position.id, // Enviar o UUID da vaga
          positionTitle: position.title,
          source: source || selectedSource
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Currículo enviado para análise",
        description: `O currículo foi enviado para processamento da vaga: ${position.title}`,
      });
      
      // Fechar modal após sucesso
      setTimeout(() => {
        handleClose();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Erro ao enviar currículo:', error);
      
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
          description: errorMessage || "Falha ao enviar currículo para análise.",
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
    setSelectedSource('indeed');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Upload className="h-6 w-6 text-primary" />
            Nova Candidatura
          </DialogTitle>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Seleção de Vaga</CardTitle>
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
                  {availablePositions.find(p => p.id === selectedJobPosition)?.n8nWebhookPath && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Webhook: {availablePositions.find(p => p.id === selectedJobPosition)?.n8nWebhookPath}
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
              <Tabs defaultValue="individual" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="individual" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Individual
                  </TabsTrigger>
                  <TabsTrigger value="bulk" className="flex items-center gap-2">
                    <FileStack className="h-4 w-4" />
                    Upload em Massa
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="individual">
                  <ResumeUpload
                    candidateId="temp"
                    onUploadComplete={handleResumeUpload}
                    source={selectedSource}
                    onSourceChange={setSelectedSource}
                  />
                </TabsContent>
                
                <TabsContent value="bulk">
                  {(() => {
                    const position = availablePositions.find(p => p.id === selectedJobPosition);
                    return (
                      <BulkResumeUpload
                        positionId={position?.id || selectedJobPosition}
                        positionTitle={position?.title || 'Posição não especificada'}
                        source={selectedSource}
                        onSourceChange={setSelectedSource}
                        onProcessingComplete={(processed, errors) => {
                          toast({
                            title: "Processamento concluído",
                            description: `${processed} currículo(s) processado(s) com sucesso${errors > 0 ? `, ${errors} erro(s)` : ''}`,
                            variant: errors > 0 ? "destructive" : "default"
                          });
                          
                          // Fechar modal após processamento bem-sucedido
                          if (processed > 0) {
                            setTimeout(() => {
                              handleClose();
                            }, 2000);
                          }
                        }}
                      />
                    );
                  })()}
                </TabsContent>
              </Tabs>
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
            {isProcessing ? 'Processando...' : 'Fechar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}