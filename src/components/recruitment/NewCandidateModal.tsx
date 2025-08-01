import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Candidate } from '@/types/recruitment';
import { ResumeUpload } from './ResumeUpload';

interface NewCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (candidate: Candidate) => void;
}

export function NewCandidateModal({ isOpen, onClose, onSubmit }: NewCandidateModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    positionId: '',
    source: 'manual' as const,
    notes: ''
  });
  const [resumeUrl, setResumeUrl] = useState<string>('');
  const [resumeFileName, setResumeFileName] = useState<string>('');
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleResumeUpload = (url: string, fileName: string) => {
    setResumeUrl(url);
    setResumeFileName(fileName);
    toast({
      title: "Currículo enviado",
      description: "Agora preencha as informações do candidato.",
    });
  };

  const handleSubmit = () => {
    // Validar campos obrigatórios
    if (!formData.name || !formData.email || !formData.phone) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha nome, email e telefone.",
        variant: "destructive",
      });
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Email inválido",
        description: "Por favor, insira um email válido.",
        variant: "destructive",
      });
      return;
    }

    const newCandidate: Candidate = {
      id: Date.now().toString(),
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      positionId: formData.positionId || 'florista-especializada',
      resumeUrl,
      resumeFileName,
      source: formData.source,
      stage: 'nova_candidatura',
      notes: formData.notes ? [{
        id: Date.now().toString(),
        content: formData.notes,
        authorId: '1',
        authorName: 'Sistema',
        createdAt: new Date(),
        type: 'general'
      }] : [],
      interviews: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    onSubmit(newCandidate);
    
    // Reset form
    setFormData({
      name: '',
      email: '',
      phone: '',
      positionId: '',
      source: 'manual',
      notes: ''
    });
    setResumeUrl('');
    setResumeFileName('');
    
    toast({
      title: "Candidato adicionado",
      description: "Nova candidatura criada com sucesso!",
    });
    
    onClose();
  };

  const handleClose = () => {
    // Reset form when closing
    setFormData({
      name: '',
      email: '',
      phone: '',
      positionId: '',
      source: 'manual',
      notes: ''
    });
    setResumeUrl('');
    setResumeFileName('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <UserPlus className="h-6 w-6 text-primary" />
            Nova Candidatura
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Currículo
            </TabsTrigger>
            <TabsTrigger value="info" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Informações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Enviar Currículo</CardTitle>
              </CardHeader>
              <CardContent>
                <ResumeUpload
                  candidateId="temp"
                  onUploadComplete={handleResumeUpload}
                />
                {resumeUrl && (
                  <div className="mt-4 p-3 bg-success/10 rounded-lg border border-success/20">
                    <div className="flex items-center gap-2 text-success">
                      <Upload className="h-4 w-4" />
                      <span className="font-medium">Currículo enviado: {resumeFileName}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dados do Candidato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input
                      id="name"
                      placeholder="Ex: Maria Silva"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="maria@email.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Telefone *</Label>
                    <Input
                      id="phone"
                      placeholder="(11) 99999-9999"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="source">Origem da Candidatura</Label>
                    <Select value={formData.source} onValueChange={(value) => handleInputChange('source', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a origem" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Candidatura Manual</SelectItem>
                        <SelectItem value="indeed">Indeed</SelectItem>
                        <SelectItem value="referral">Indicação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="position">Vaga de Interesse</Label>
                  <Select value={formData.positionId} onValueChange={(value) => handleInputChange('positionId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a vaga" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="florista-especializada">Florista Especializada</SelectItem>
                      <SelectItem value="assistente-vendas">Assistente de Vendas</SelectItem>
                      <SelectItem value="decorador">Decorador(a)</SelectItem>
                      <SelectItem value="entregador">Entregador(a)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">Observações Iniciais</Label>
                  <Textarea
                    id="notes"
                    placeholder="Adicione observações sobre este candidato..."
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={!formData.name || !formData.email || !formData.phone}>
                Criar Candidatura
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}