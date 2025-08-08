import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Briefcase, Users, Target } from 'lucide-react';
import { JobPosition } from '@/types/recruitment';

interface JobPositionSelectorProps {
  positions: JobPosition[];
  selectedPosition: JobPosition | null;
  onPositionSelect: (position: JobPosition) => void;
  onNewPosition: () => void;
}

export function JobPositionSelector({ 
  positions, 
  selectedPosition, 
  onPositionSelect, 
  onNewPosition 
}: JobPositionSelectorProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              <CardTitle>Selecionar Vaga</CardTitle>
            </div>
            <Button onClick={onNewPosition} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova Vaga
            </Button>
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
                <SelectItem key={position.id} value={position.id}>
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">{position.title}</div>
                      <div className="text-sm text-muted-foreground">{position.department}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

    </div>
  );
}