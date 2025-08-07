import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { KanbanColumn } from '@/types/recruitment';

interface KanbanMinimapProps {
  columns: KanbanColumn[];
  activeColumnId?: string;
  onColumnClick: (columnId: string) => void;
}

const getColumnIcon = (columnId: string) => {
  switch (columnId) {
    case 'nova_candidatura':
      return '📄';
    case 'analise_ia':
      return '🤖';
    case 'selecao_pre_entrevista':
      return '📋';
    case 'pre_entrevista':
      return '💻';
    case 'selecao_entrevista_presencial':
      return '📝';
    case 'entrevista_presencial':
      return '🤝';
    case 'aprovado':
      return '✅';
    case 'nao_aprovado':
      return '❌';
    default:
      return '📁';
  }
};

const getColumnColor = (columnId: string) => {
  switch (columnId) {
    case 'nova_candidatura':
      return 'bg-status-new border-status-new-border';
    case 'analise_ia':
      return 'bg-status-analysis border-status-analysis-border';
    case 'selecao_pre_entrevista':
    case 'pre_entrevista':
      return 'bg-status-pre-interview border-status-pre-interview-border';
    case 'selecao_entrevista_presencial':
    case 'entrevista_presencial':
      return 'bg-status-interview border-status-interview-border';
    case 'aprovado':
      return 'bg-status-approved border-status-approved-border';
    case 'nao_aprovado':
      return 'bg-status-rejected border-status-rejected-border';
    default:
      return 'bg-muted border-border';
  }
};

export function KanbanMinimap({ columns, activeColumnId, onColumnClick }: KanbanMinimapProps) {
  return (
    <div className="flex items-center gap-2 p-4 bg-muted/30 rounded-lg border mb-4">
      <span className="text-sm font-medium text-muted-foreground mr-2">
        Navegação:
      </span>
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
           style={{ scrollbarWidth: 'thin' }}>
        {columns.map((column) => {
          const isActive = activeColumnId === column.id;
          const columnColor = getColumnColor(column.id);
          
          return (
            <Tooltip key={column.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onColumnClick(column.id)}
                  className={cn(
                    "h-10 px-2 transition-all duration-200 relative flex-shrink-0",
                    columnColor,
                    isActive && "ring-2 ring-primary scale-105 shadow-md"
                  )}
                >
                  <span className="text-base mr-1">{getColumnIcon(column.id)}</span>
                  <div className="flex flex-col items-start">
                    <span className="text-xs font-medium text-foreground truncate max-w-16">
                      {column.title.split(' ')[0]}
                    </span>
                    <Badge variant="secondary" className="text-xs h-3 px-1 min-w-4">
                      {column.candidates.length}
                    </Badge>
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div className="font-medium">{column.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {column.candidates.length} candidato(s)
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {column.description}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}