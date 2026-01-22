import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { List, ChevronRight } from 'lucide-react';
import { KanbanColumn } from '@/types/recruitment';

interface KanbanColumnsListProps {
  columns: KanbanColumn[];
  onColumnClick: (columnId: string) => void;
}

const getColumnColor = (columnId: string) => {
  switch (columnId) {
    case 'nova_candidatura':
      return 'bg-status-new/20 border-l-status-new-border';
    case 'analise_ia':
      return 'bg-status-analysis/20 border-l-status-analysis-border';
    case 'selecao_pre_entrevista':
    case 'pre_entrevista':
      return 'bg-status-pre-interview/20 border-l-status-pre-interview-border';
    case 'selecao_entrevista_presencial':
    case 'entrevista_presencial':
      return 'bg-status-interview/20 border-l-status-interview-border';
    case 'aprovado':
      return 'bg-status-approved/20 border-l-status-approved-border';
    case 'nao_aprovado':
      return 'bg-status-rejected/20 border-l-status-rejected-border';
    default:
      return 'bg-muted/20 border-l-muted';
  }
};

export function KanbanColumnsList({ columns, onColumnClick }: KanbanColumnsListProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="md:hidden">
          <List className="h-4 w-4 mr-2" />
          Ver Colunas
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <SheetHeader>
          <SheetTitle>Todas as Etapas</SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-full mt-6">
          <div className="space-y-2">
            {columns.map((column) => {
              const columnColor = getColumnColor(column.id);
              
              return (
                <div
                  key={column.id}
                  onClick={() => onColumnClick(column.id)}
                  className={`
                    p-4 rounded-lg border-l-4 cursor-pointer transition-all duration-200
                    hover:shadow-md hover:scale-[1.02] ${columnColor}
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="font-semibold text-foreground">{column.title}</h3>
                        <p className="text-sm text-muted-foreground">{column.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {column.candidates.length}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  
                  {column.candidates.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {column.candidates.slice(0, 3).map((candidate, index) => (
                        <div key={candidate.id} className="truncate">
                          • {candidate.name}
                        </div>
                      ))}
                      {column.candidates.length > 3 && (
                        <div className="font-medium">
                          +{column.candidates.length - 3} candidatos
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}