import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { JobPosition } from '@/types/recruitment';
import { Calendar, MapPin, Users, Briefcase, Copy, Edit, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface JobPositionDetailsModalProps {
  position: JobPosition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPositionUpdate?: (updatedPosition: JobPosition) => void;
}

export const JobPositionDetailsModal = ({ position, open, onOpenChange, onPositionUpdate }: JobPositionDetailsModalProps) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedPosition, setEditedPosition] = useState<JobPosition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  if (!position) return null;

  const startEditing = () => {
    setEditedPosition({ ...position });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedPosition(null);
  };

  const saveChanges = async () => {
    if (!editedPosition) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('job_positions')
        .update({
          title: editedPosition.title,
          department: editedPosition.department,
          status: editedPosition.status,
          description: editedPosition.description,
          requirements: editedPosition.requirements,
          responsibilities: editedPosition.responsibilities,
        })
        .eq('id', editedPosition.id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Vaga atualizada com sucesso."
      });

      setIsEditing(false);
      setEditedPosition(null);
      
      if (onPositionUpdate && data) {
        // Convert database format back to frontend format
        const updatedPosition: JobPosition = {
          ...editedPosition,
          createdAt: new Date(data.created_at),
          endpointId: data.endpoint_id
        };
        onPositionUpdate(updatedPosition);
      }
    } catch (error) {
      console.error('Error updating position:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar a vaga. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: keyof JobPosition, value: any) => {
    if (!editedPosition) return;
    setEditedPosition({ ...editedPosition, [field]: value });
  };

  const addToArray = (field: 'requirements' | 'responsibilities', value: string) => {
    if (!editedPosition || !value.trim()) return;
    const currentArray = editedPosition[field] || [];
    updateField(field, [...currentArray, value.trim()]);
  };

  const removeFromArray = (field: 'requirements' | 'responsibilities', index: number) => {
    if (!editedPosition) return;
    const currentArray = editedPosition[field] || [];
    updateField(field, currentArray.filter((_, i) => i !== index));
  };

  const currentPosition = editedPosition || position;

  const copyEndpointId = () => {
    if (position.endpointId) {
      navigator.clipboard.writeText(position.endpointId);
      toast({
        title: "ID copiado!",
        description: "O ID do endpoint foi copiado para a área de transferência."
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'closed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Ativa';
      case 'paused': return 'Pausada';
      case 'closed': return 'Encerrada';
      default: return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <Briefcase className="h-6 w-6 text-primary" />
              {isEditing ? 'Editar Vaga' : 'Detalhes da Vaga'}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelEditing}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveChanges}
                    disabled={isLoading}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {isLoading ? 'Salvando...' : 'Salvar'}
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startEditing}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header da Vaga */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title">Título da Vaga</Label>
                        <Input
                          id="title"
                          value={currentPosition.title}
                          onChange={(e) => updateField('title', e.target.value)}
                          className="text-xl font-semibold"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="department">Departamento</Label>
                          <Input
                            id="department"
                            value={currentPosition.department}
                            onChange={(e) => updateField('department', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="status">Status</Label>
                          <Select value={currentPosition.status} onValueChange={(value) => updateField('status', value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Ativa</SelectItem>
                              <SelectItem value="paused">Pausada</SelectItem>
                              <SelectItem value="closed">Encerrada</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <CardTitle className="text-2xl">{currentPosition.title}</CardTitle>
                      <div className="flex items-center gap-4 text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          {currentPosition.department}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Criada em {new Date(currentPosition.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                {!isEditing && (
                  <Badge className={getStatusColor(currentPosition.status)}>
                    {getStatusText(currentPosition.status)}
                  </Badge>
                )}
              </div>
            </CardHeader>
            {currentPosition.description && (
              <CardContent>
                {isEditing ? (
                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={currentPosition.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      rows={3}
                    />
                  </div>
                ) : (
                  <p className="text-muted-foreground">{currentPosition.description}</p>
                )}
              </CardContent>
            )}
          </Card>

          {/* Requisitos */}
          {((currentPosition.requirements && currentPosition.requirements.length > 0) || isEditing) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Requisitos</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <EditableList
                    items={currentPosition.requirements || []}
                    onAdd={(value) => addToArray('requirements', value)}
                    onRemove={(index) => removeFromArray('requirements', index)}
                    placeholder="Adicionar requisito..."
                  />
                ) : (
                  <ul className="space-y-2">
                    {currentPosition.requirements?.map((requirement, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                        <span>{requirement}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          {/* Responsabilidades */}
          {((currentPosition.responsibilities && currentPosition.responsibilities.length > 0) || isEditing) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Responsabilidades</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <EditableList
                    items={currentPosition.responsibilities || []}
                    onAdd={(value) => addToArray('responsibilities', value)}
                    onRemove={(index) => removeFromArray('responsibilities', index)}
                    placeholder="Adicionar responsabilidade..."
                  />
                ) : (
                  <ul className="space-y-2">
                    {currentPosition.responsibilities?.map((responsibility, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                        <span>{responsibility}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          {/* Informações Específicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Qualificação Mínima */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Qualificação Mínima</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{position.minimumQualification}</p>
              </CardContent>
            </Card>

            {/* Valores Culturais */}
            {position.culturalValues && position.culturalValues.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Valores Culturais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {position.culturalValues.map((value, index) => (
                      <Badge key={index} variant="outline">
                        {value}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Campos Específicos do Formulário */}
          {(position.salarioFixo || position.escala || position.idadePreferencial) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações Adicionais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {position.salarioFixo && (
                  <div>
                    <h4 className="font-medium mb-1">Salário Fixo</h4>
                    <p className="text-muted-foreground">{position.salarioFixo}</p>
                  </div>
                )}
                {position.escala && (
                  <div>
                    <h4 className="font-medium mb-1">Escala de Trabalho</h4>
                    <p className="text-muted-foreground">{position.escala}</p>
                  </div>
                )}
                {position.idadePreferencial && (
                  <div>
                    <h4 className="font-medium mb-1">Idade Preferencial</h4>
                    <p className="text-muted-foreground">{position.idadePreferencial}</p>
                  </div>
                )}
                {position.competenciasComportamentais && (
                  <div>
                    <h4 className="font-medium mb-1">Competências Comportamentais</h4>
                    <p className="text-muted-foreground">{position.competenciasComportamentais}</p>
                  </div>
                )}
                {position.experienciasDesejadas && (
                  <div>
                    <h4 className="font-medium mb-1">Experiências Desejadas</h4>
                    <p className="text-muted-foreground">{position.experienciasDesejadas}</p>
                  </div>
                )}
                {position.mindsetEsperado && (
                  <div>
                    <h4 className="font-medium mb-1">Mindset Esperado</h4>
                    <p className="text-muted-foreground">{position.mindsetEsperado}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Informações de Criação e Endpoint */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações de Criação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div>
                    <span className="font-medium">Criado por:</span>
                    <p className="text-muted-foreground">{position.createdBy}</p>
                  </div>
                  <div>
                    <span className="font-medium">Data de criação:</span>
                    <p className="text-muted-foreground">
                      {new Date(position.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configuração N8N</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-1">Path do Webhook (Envio de Currículos)</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      Path concatenado com a URL base para enviar currículos:
                    </p>
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <code className="flex-1 text-sm font-mono">
                        {position.n8nWebhookPath || 'Não configurado'}
                      </code>
                      {position.n8nWebhookPath && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(position.n8nWebhookPath || '');
                            toast({
                              title: "Path copiado!",
                              description: "O path do webhook foi copiado para a área de transferência."
                            });
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium text-sm mb-1">ID do Endpoint (Mapeamento Reverso)</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      Use este ID no N8N para identificar a vaga:
                    </p>
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <code className="flex-1 text-sm font-mono">
                        {position.endpointId || 'ID não disponível'}
                      </code>
                      {position.endpointId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={copyEndpointId}
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Helper component for editable lists
interface EditableListProps {
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
}

const EditableList = ({ items, onAdd, onRemove, placeholder }: EditableListProps) => {
  const [newItem, setNewItem] = useState('');

  const handleAdd = () => {
    if (newItem.trim()) {
      onAdd(newItem);
      setNewItem('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2 group">
            <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
            <span className="flex-1">{item}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRemove(index)}
              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button size="sm" onClick={handleAdd} disabled={!newItem.trim()}>
          Adicionar
        </Button>
      </div>
    </div>
  );
};