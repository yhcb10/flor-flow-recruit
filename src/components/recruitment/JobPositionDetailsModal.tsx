import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { JobPosition } from '@/types/recruitment';
import { Calendar, MapPin, Users, Briefcase } from 'lucide-react';

interface JobPositionDetailsModalProps {
  position: JobPosition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const JobPositionDetailsModal = ({ position, open, onOpenChange }: JobPositionDetailsModalProps) => {
  if (!position) return null;

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
          <DialogTitle className="flex items-center gap-3 text-xl">
            <Briefcase className="h-6 w-6 text-primary" />
            Detalhes da Vaga
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header da Vaga */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">{position.title}</CardTitle>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4" />
                      {position.department}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {position.targetHires} vaga{position.targetHires > 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Criada em {new Date(position.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
                <Badge className={getStatusColor(position.status)}>
                  {getStatusText(position.status)}
                </Badge>
              </div>
            </CardHeader>
            {position.description && (
              <CardContent>
                <p className="text-muted-foreground">{position.description}</p>
              </CardContent>
            )}
          </Card>

          {/* Requisitos */}
          {position.requirements && position.requirements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Requisitos</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {position.requirements.map((requirement, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <span>{requirement}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Responsabilidades */}
          {position.responsibilities && position.responsibilities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Responsabilidades</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {position.responsibilities.map((responsibility, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <span>{responsibility}</span>
                    </li>
                  ))}
                </ul>
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

          {/* Informações de Criação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações de Criação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};