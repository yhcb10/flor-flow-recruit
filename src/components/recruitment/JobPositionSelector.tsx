import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Briefcase, Pause, X, Eye, Trash2, Archive } from 'lucide-react';
import { JobPosition } from '@/types/recruitment';
import { useToast } from '@/hooks/use-toast';
import { JobPositionDetailsModal } from './JobPositionDetailsModal';

interface JobPositionSelectorProps {
  positions: JobPosition[];
  selectedPosition: JobPosition | null;
  onPositionSelect: (position: JobPosition | null) => void;
  onNewPosition: () => void;
  onPositionClose: (positionId: string) => void;
  onPositionPause: (positionId: string) => void;
  onPositionDelete: (positionId: string) => void;
  onPositionUpdate?: (updatedPosition: JobPosition) => void;
}

export function JobPositionSelector({ 
  positions, 
  selectedPosition, 
  onPositionSelect, 
  onNewPosition,
  onPositionClose,
  onPositionPause,
  onPositionDelete,
  onPositionUpdate
}: JobPositionSelectorProps) {
  const { toast } = useToast();
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showClosedPositions, setShowClosedPositions] = useState(false);

  const handleClosePosition = (positionId: string) => {
    const position = positions.find(p => p.id === positionId);
    if (position) {
      onPositionClose(positionId);
      toast({
        title: "Vaga encerrada",
        description: `A vaga de ${position.title} foi encerrada com sucesso.`
      });
    }
  };

  const handlePausePosition = (positionId: string) => {
    const position = positions.find(p => p.id === positionId);
    if (position) {
      onPositionPause(positionId);
      toast({
        title: "Vaga pausada",
        description: `A vaga de ${position.title} foi pausada com sucesso.`
      });
    }
  };

  const handleDeletePosition = (positionId: string) => {
    const position = positions.find(p => p.id === positionId);
    if (position) {
      onPositionDelete(positionId);
      toast({
        title: "Vaga removida",
        description: `A vaga de ${position.title} foi removida permanentemente.`
      });
    }
  };

  const getStatusBadge = (status: JobPosition['status']) => {
    const statusConfig = {
      active: { label: 'Ativa', className: 'bg-green-100 text-green-800 border-green-200' },
      paused: { label: 'Pausada', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      closed: { label: 'Encerrada', className: 'bg-red-100 text-red-800 border-red-200' },
      draft: { label: 'Rascunho', className: 'bg-gray-100 text-gray-800 border-gray-200' }
    };
    const config = statusConfig[status];
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  // Filtrar vagas baseado no toggle
  const activePositions = positions.filter(p => p.status === 'active');
  const closedPositions = positions.filter(p => p.status === 'closed' || p.status === 'paused');
  const displayedPositions = showClosedPositions ? positions : activePositions;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
              <div>
                <CardTitle className="text-base sm:text-lg">Selecionar Vaga</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {activePositions.length} ativas • {closedPositions.length} encerradas
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <div className="flex items-center space-x-2 bg-muted/50 px-3 py-1.5 rounded-md">
                <Switch
                  id="show-closed"
                  checked={showClosedPositions}
                  onCheckedChange={setShowClosedPositions}
                />
                <Label htmlFor="show-closed" className="text-xs cursor-pointer flex items-center gap-1.5">
                  <Archive className="h-3 w-3" />
                  <span className="hidden sm:inline">Mostrar encerradas</span>
                  <span className="sm:hidden">Encerradas</span>
                </Label>
              </div>
              {selectedPosition && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetailsModal(true)}
                  className="gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9"
                >
                  <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Ver Detalhes</span>
                  <span className="sm:hidden">Detalhes</span>
                </Button>
              )}
              {selectedPosition && selectedPosition.status === 'active' && (
                <>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3">
                        <Pause className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Pausar</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Pausar Vaga</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja pausar a vaga de "{selectedPosition.title}"? 
                          Esta ação pode ser revertida posteriormente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handlePausePosition(selectedPosition.id)}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          Pausar Vaga
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3">
                        <X className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Encerrar</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Encerrar Vaga</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja encerrar a vaga de "{selectedPosition.title}"? 
                          Esta ação pode ser revertida posteriormente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleClosePosition(selectedPosition.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Encerrar Vaga
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
              {selectedPosition && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3">
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Remover</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover Vaga</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja remover permanentemente a vaga de "{selectedPosition.title}"? 
                        Esta ação não pode ser desfeita e todos os dados relacionados à vaga serão perdidos.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleDeletePosition(selectedPosition.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Remover Permanentemente
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button onClick={onNewPosition} variant="outline" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-50 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Nova Vaga</span>
                <span className="sm:hidden">Nova</span>
              </Button>
            </div>
          </div>
          <CardDescription className="text-xs sm:text-sm">
            {showClosedPositions 
              ? 'Mostrando todas as vagas (ativas e encerradas)' 
              : 'Mostrando apenas vagas ativas • Ative o toggle acima para ver vagas encerradas'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <Select 
            value={selectedPosition?.id || "all"} 
            onValueChange={(value) => {
              if (value === "all") {
                onPositionSelect(null);
              } else {
                const position = positions.find(p => p.id === value);
                if (position) onPositionSelect(position);
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione uma vaga..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-1">
                    <div className="font-medium">🌟 Todas as Vagas {showClosedPositions ? '(Ativas + Encerradas)' : '(Apenas Ativas)'}</div>
                    <div className="text-sm text-muted-foreground">
                      Ver candidatos de {displayedPositions.length} vaga(s)
                    </div>
                  </div>
                </div>
              </SelectItem>
              {displayedPositions.map((position) => {
                if (!position || !position.id) return null;
                return (
                  <SelectItem key={position.id} value={position.id}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-1">
                        <div className="font-medium truncate">{position.title || 'Sem título'}</div>
                        <div className="text-sm text-muted-foreground truncate">{position.department || 'Não especificado'}</div>
                      </div>
                      {getStatusBadge(position.status || 'active')}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Job Position Details Modal */}
      <JobPositionDetailsModal
        position={selectedPosition}
        open={showDetailsModal}
        onOpenChange={setShowDetailsModal}
        onPositionUpdate={onPositionUpdate}
      />
    </div>
  );
}