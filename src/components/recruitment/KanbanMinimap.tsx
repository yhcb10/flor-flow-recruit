import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { KanbanColumn, CandidateStage } from '@/types/recruitment';

interface KanbanMinimapProps {
  columns: KanbanColumn[];
  activeColumnId?: string;
  onColumnClick: (columnId: string) => void;
  terminalCounts?: Record<CandidateStage, number>;
  isTerminalStage?: (stage: CandidateStage) => boolean;
}

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

export function KanbanMinimap({ 
  columns, 
  activeColumnId, 
  onColumnClick,
  terminalCounts = {} as Record<CandidateStage, number>,
  isTerminalStage
}: KanbanMinimapProps) {
  // Função helper para obter o contador correto
  const getColumnCount = (column: KanbanColumn): number => {
    if (isTerminalStage && isTerminalStage(column.id)) {
      return terminalCounts[column.id] || 0;
    }
    return column.candidates.length;
  };

  return (
    <div className="flex items-center gap-2 p-4 bg-muted/30 rounded-lg border mb-4">
      <span className="text-sm font-medium text-muted-foreground">
        Navegação rápida:
      </span>
      <div className="flex items-center gap-1 flex-wrap">
        {columns.map((column) => {
          const isActive = activeColumnId === column.id;
          const columnColor = getColumnColor(column.id);
          const count = getColumnCount(column);
          const isTerminal = isTerminalStage && isTerminalStage(column.id);
          const loadedCount = column.candidates.length;
          
          return (
            <Tooltip key={column.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onColumnClick(column.id)}
                  className={cn(
                    "h-10 px-3 transition-all duration-200 relative",
                    columnColor,
                    isActive && "ring-2 ring-primary scale-105 shadow-md"
                  )}
                >
                  <div className="flex flex-col items-start">
                    <span className="text-xs font-medium text-foreground truncate max-w-20">
                      {column.title}
                    </span>
                    <Badge variant="secondary" className="text-xs h-4 px-1">
                      {isTerminal ? `${loadedCount}/${count}` : count}
                    </Badge>
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div className="font-medium">{column.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {isTerminal ? `${loadedCount} carregados de ${count} total` : `${count} candidato(s)`}
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