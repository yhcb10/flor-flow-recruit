import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Briefcase, Users, Target, X, Trash2 } from 'lucide-react';
import { JobPosition } from '@/types/recruitment';
import { useToast } from '@/hooks/use-toast';

interface JobPositionSelectorProps {
  positions: JobPosition[];
  selectedPosition: JobPosition | null;
  onPositionSelect: (position: JobPosition) => void;
  onNewPosition: () => void;
  onPositionClose: (positionId: string) => void;
  onPositionRemove: (positionId: string) => void;
}

export function JobPositionSelector({ 
  positions, 
  selectedPosition, 
  onPositionSelect, 
  onNewPosition,
  onPositionClose,
  onPositionRemove
}: JobPositionSelectorProps) {
  const { toast } = useToast();

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

  const handleRemovePosition = (positionId: string) => {
    const position = positions.find(p => p.id === positionId);
    if (position) {
      onPositionRemove(positionId);
      toast({
        title: "Vaga removida",
        description: `A vaga de ${position.title} foi removida permanentemente.`,
        variant: "destructive"
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
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              <CardTitle>Selecionar Vaga</CardTitle>
            </div>
            <div className="flex gap-2">
              {selectedPosition && selectedPosition.status === 'active' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      <X className="h-4 w-4 mr-2" />
                      Encerrar Vaga
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
              )}
              <Button onClick={onNewPosition} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nova Vaga
              </Button>
            </div>
          </div>
          <CardDescription>
            Escolha a vaga para gerenciar os candidatos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select 
            value={selectedPosition?.id || ""} 
            onValueChange={(value) => {
              const position = positions.find(p => p.id === value);
              if (position) onPositionSelect(position);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione uma vaga..." />
            </SelectTrigger>
            <SelectContent>
              {positions.map((position) => (
                <div key={position.id} className="relative">
                  <SelectItem value={position.id}>
                    <div className="flex items-center justify-between w-full pr-8">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{position.title}</div>
                        <div className="text-sm text-muted-foreground truncate">{position.department}</div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        {getStatusBadge(position.status)}
                      </div>
                    </div>
                  </SelectItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 z-10"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover Vaga</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja remover permanentemente a vaga de "{position.title}"? 
                          Esta ação não pode ser desfeita e todos os candidatos associados serão perdidos.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleRemovePosition(position.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Remover Permanentemente
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

    </div>
  );
}