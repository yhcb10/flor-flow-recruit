import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { JobPosition } from '@/types/recruitment';
import { Briefcase, X } from 'lucide-react';

interface NewJobPositionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJobPositionCreate: (position: JobPosition) => void;
}

export function NewJobPositionModal({ open, onOpenChange, onJobPositionCreate }: NewJobPositionModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    salarioFixo: '',
    escala: '',
    idadePreferencial: '',
    responsibilities: '',
    competenciasComportamentais: '',
    experienciasDesejadas: '',
    qualificacaoMinima: '',
    mindsetEsperado: '',
    criteriosAvaliacao: '',
    diferenciais: '',
    itensNaoPontuaveis: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "O cargo é obrigatório"
      });
      return;
    }

    const newPosition: JobPosition = {
      id: Date.now().toString(),
      title: formData.title,
      department: formData.department || 'Não especificado',
      description: `Cargo: ${formData.title}\nSalário: ${formData.salarioFixo}\nEscala: ${formData.escala}`,
      requirements: [
        formData.qualificacaoMinima,
        formData.experienciasDesejadas,
        formData.competenciasComportamentais
      ].filter(Boolean),
      responsibilities: formData.responsibilities.split('\n').filter(line => line.trim()),
      culturalValues: [formData.mindsetEsperado].filter(Boolean),
      minimumQualification: formData.qualificacaoMinima,
      status: 'active',
      createdAt: new Date(),
      createdBy: 'current-user',
      targetHires: 1,
      aiAnalysisPrompt: `
Analise este candidato considerando:

CARGO: ${formData.title}
SALÁRIO: ${formData.salarioFixo}
ESCALA: ${formData.escala}
IDADE PREFERENCIAL: ${formData.idadePreferencial}

RESPONSABILIDADES:
${formData.responsibilities}

COMPETÊNCIAS COMPORTAMENTAIS ESPERADAS:
${formData.competenciasComportamentais}

EXPERIÊNCIAS DESEJADAS:
${formData.experienciasDesejadas}

QUALIFICAÇÃO MÍNIMA:
${formData.qualificacaoMinima}

MINDSET ESPERADO:
${formData.mindsetEsperado}

CRITÉRIOS DE AVALIAÇÃO:
${formData.criteriosAvaliacao}

DIFERENCIAIS:
${formData.diferenciais}

ITENS NÃO PONTUÁVEIS (MAS DEVEM SER OBSERVADOS):
${formData.itensNaoPontuaveis}
      `,
      // Campos customizados para o formulário
      salarioFixo: formData.salarioFixo,
      escala: formData.escala,
      idadePreferencial: formData.idadePreferencial,
      competenciasComportamentais: formData.competenciasComportamentais,
      experienciasDesejadas: formData.experienciasDesejadas,
      mindsetEsperado: formData.mindsetEsperado,
      criteriosAvaliacao: formData.criteriosAvaliacao,
      diferenciais: formData.diferenciais,
      itensNaoPontuaveis: formData.itensNaoPontuaveis
    };

    onJobPositionCreate(newPosition);
    resetForm();
    onOpenChange(false);
    
    toast({
      title: "Vaga criada com sucesso!",
      description: `A vaga de ${formData.title} foi criada e está ativa.`
    });
  };

  const resetForm = () => {
    setFormData({
      title: '',
      department: '',
      salarioFixo: '',
      escala: '',
      idadePreferencial: '',
      responsibilities: '',
      competenciasComportamentais: '',
      experienciasDesejadas: '',
      qualificacaoMinima: '',
      mindsetEsperado: '',
      criteriosAvaliacao: '',
      diferenciais: '',
      itensNaoPontuaveis: ''
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Nova Vaga
          </DialogTitle>
          <DialogDescription>
            Preencha os dados da nova vaga para iniciar o processo seletivo
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Cargo *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Ex: Vendedor de Flores"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Departamento</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                placeholder="Ex: Vendas"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="salarioFixo">Salário Fixo</Label>
              <Input
                id="salarioFixo"
                value={formData.salarioFixo}
                onChange={(e) => handleInputChange('salarioFixo', e.target.value)}
                placeholder="Ex: R$ 1.500,00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="escala">Escala</Label>
              <Select value={formData.escala} onValueChange={(value) => handleInputChange('escala', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a escala" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6x1">6x1</SelectItem>
                  <SelectItem value="5x2">5x2</SelectItem>
                  <SelectItem value="segunda-sexta">Segunda a Sexta</SelectItem>
                  <SelectItem value="comercial">Horário Comercial</SelectItem>
                  <SelectItem value="flexivel">Flexível</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="idadePreferencial">Idade Preferencial</Label>
              <Input
                id="idadePreferencial"
                value={formData.idadePreferencial}
                onChange={(e) => handleInputChange('idadePreferencial', e.target.value)}
                placeholder="Ex: 18 a 35 anos"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="responsibilities">Responsabilidades</Label>
              <Textarea
                id="responsibilities"
                value={formData.responsibilities}
                onChange={(e) => handleInputChange('responsibilities', e.target.value)}
                placeholder="Descreva as principais responsabilidades do cargo..."
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="competenciasComportamentais">Competências Comportamentais Esperadas</Label>
              <Textarea
                id="competenciasComportamentais"
                value={formData.competenciasComportamentais}
                onChange={(e) => handleInputChange('competenciasComportamentais', e.target.value)}
                placeholder="Ex: Proatividade, comunicação, trabalho em equipe..."
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experienciasDesejadas">Experiências Desejadas</Label>
              <Textarea
                id="experienciasDesejadas"
                value={formData.experienciasDesejadas}
                onChange={(e) => handleInputChange('experienciasDesejadas', e.target.value)}
                placeholder="Descreva as experiências desejadas..."
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="qualificacaoMinima">Qualificação Mínima</Label>
              <Textarea
                id="qualificacaoMinima"
                value={formData.qualificacaoMinima}
                onChange={(e) => handleInputChange('qualificacaoMinima', e.target.value)}
                placeholder="Ex: Ensino médio completo..."
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mindsetEsperado">Mindset Esperado</Label>
              <Textarea
                id="mindsetEsperado"
                value={formData.mindsetEsperado}
                onChange={(e) => handleInputChange('mindsetEsperado', e.target.value)}
                placeholder="Descreva o mindset ideal do candidato..."
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="criteriosAvaliacao">Critérios de Avaliação</Label>
              <Textarea
                id="criteriosAvaliacao"
                value={formData.criteriosAvaliacao}
                onChange={(e) => handleInputChange('criteriosAvaliacao', e.target.value)}
                placeholder="Defina os critérios para avaliar candidatos..."
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="diferenciais">Diferenciais</Label>
              <Textarea
                id="diferenciais"
                value={formData.diferenciais}
                onChange={(e) => handleInputChange('diferenciais', e.target.value)}
                placeholder="Liste os diferenciais desejados..."
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="itensNaoPontuaveis">Itens Não Pontuáveis (mas devem ser observados)</Label>
              <Textarea
                id="itensNaoPontuaveis"
                value={formData.itensNaoPontuaveis}
                onChange={(e) => handleInputChange('itensNaoPontuaveis', e.target.value)}
                placeholder="Liste aspectos importantes mas não pontuáveis..."
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              <Briefcase className="h-4 w-4 mr-2" />
              Criar Vaga
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}