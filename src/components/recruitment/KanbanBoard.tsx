import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Filter, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CandidateCard } from './CandidateCard';
import { CandidateModal } from './CandidateModal';
import { Candidate, CandidateStage, KanbanColumn, JobPosition } from '@/types/recruitment';
import { cn } from '@/lib/utils';
import { NewCandidateModal } from './NewCandidateModal';

interface KanbanBoardProps {
  columns: KanbanColumn[];
  onCandidateMove: (candidateId: string, newStage: CandidateStage, rejectionReason?: string) => void;
  onCandidateSelect: (candidate: Candidate) => void;
  onCandidateAdd: (candidate: Candidate) => void;
  onCandidateDelete?: (candidateId: string) => void;
  selectedPosition?: JobPosition | null;
}

export function KanbanBoard({ columns, onCandidateMove, onCandidateSelect, onCandidateAdd, onCandidateDelete, selectedPosition }: KanbanBoardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showNewCandidateModal, setShowNewCandidateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    source: '',
    aiScore: '',
    interviewStatus: '',
    dateRange: ''
  });

  const handleStageChange = (candidateId: string, newStage: CandidateStage, rejectionReason?: string) => {
    onCandidateMove(candidateId, newStage, rejectionReason);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const candidateId = result.draggableId;
    const newStage = result.destination.droppableId as CandidateStage;
    
    onCandidateMove(candidateId, newStage);
  };

  const clearFilters = () => {
    setFilters({
      source: '',
      aiScore: '',
      interviewStatus: '',
      dateRange: ''
    });
    setSearchTerm('');
  };

  const getInterviewStatus = (candidate: Candidate) => {
    if (candidate.interviews.length === 0) return 'none';
    const latestInterview = candidate.interviews[candidate.interviews.length - 1];
    return latestInterview.status;
  };

  const filteredColumns = columns.map(column => ({
    ...column,
    candidates: column.candidates.filter(candidate => {
      // Basic search
      const matchesSearch = searchTerm === '' || 
        candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.email.toLowerCase().includes(searchTerm.toLowerCase());

      // Source filter
      const matchesSource = filters.source === '' || candidate.source === filters.source;

      // AI Score filter
      const matchesAiScore = filters.aiScore === '' || (() => {
        if (!candidate.aiAnalysis) return filters.aiScore === 'none';
        const score = candidate.aiAnalysis.score;
        switch (filters.aiScore) {
          case 'high': return score >= 8;
          case 'medium': return score >= 6.5 && score < 8;
          case 'low': return score < 6.5;
          default: return true;
        }
      })();

      // Interview Status filter
      const matchesInterviewStatus = filters.interviewStatus === '' || 
        getInterviewStatus(candidate) === filters.interviewStatus;

      // Date range filter
      const matchesDateRange = filters.dateRange === '' || (() => {
        const now = new Date();
        const candidateDate = candidate.createdAt;
        switch (filters.dateRange) {
          case 'today': 
            return candidateDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return candidateDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return candidateDate >= monthAgo;
          default: return true;
        }
      })();

      return matchesSearch && matchesSource && matchesAiScore && matchesInterviewStatus && matchesDateRange;
    })
  }));

  const hasActiveFilters = Object.values(filters).some(f => f !== '') || searchTerm !== '';

  return (
    <div className="h-full bg-kanban-bg p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Processo Seletivo</h1>
          <p className="text-muted-foreground">Coroa de Flores Nobre</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar candidatos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className={cn(hasActiveFilters && "bg-primary text-primary-foreground")}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {hasActiveFilters && <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">!</Badge>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filtros</h4>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Origem</label>
                    <Select value={filters.source} onValueChange={(value) => setFilters(prev => ({ ...prev, source: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todas</SelectItem>
                        <SelectItem value="indeed">Indeed</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="referral">Indicação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nota IA</label>
                    <Select value={filters.aiScore} onValueChange={(value) => setFilters(prev => ({ ...prev, aiScore: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todas</SelectItem>
                        <SelectItem value="high">Alta (8.0+)</SelectItem>
                        <SelectItem value="medium">Média (6.5-7.9)</SelectItem>
                        <SelectItem value="low">Baixa (abaixo 6.5)</SelectItem>
                        <SelectItem value="none">Sem análise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status Entrevista</label>
                    <Select value={filters.interviewStatus} onValueChange={(value) => setFilters(prev => ({ ...prev, interviewStatus: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos</SelectItem>
                        <SelectItem value="none">Sem entrevista</SelectItem>
                        <SelectItem value="scheduled">Agendada</SelectItem>
                        <SelectItem value="completed">Realizada</SelectItem>
                        <SelectItem value="no_show">Faltou</SelectItem>
                        <SelectItem value="cancelled">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Período</label>
                    <Select value={filters.dateRange} onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos</SelectItem>
                        <SelectItem value="today">Hoje</SelectItem>
                        <SelectItem value="week">Esta semana</SelectItem>
                        <SelectItem value="month">Este mês</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button 
            size="sm"
            onClick={() => setShowNewCandidateModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Candidatura
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {filteredColumns.map((column) => (
            <div key={column.id} className="min-w-80 max-w-80">
              <Card className="bg-kanban-column border-border h-full flex flex-col">
                {/* Column Header */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-foreground">{column.title}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {column.candidates.length}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{column.description}</p>
                </div>

                {/* Droppable Area with ScrollArea */}
                <ScrollArea className="flex-1 max-h-[calc(100vh-300px)]">
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "p-4 min-h-[500px] transition-colors",
                          snapshot.isDraggingOver && "bg-primary/5"
                        )}
                      >
                        {column.candidates.map((candidate, index) => (
                          <Draggable key={candidate.id} draggableId={candidate.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  "mb-3",
                                  snapshot.isDragging && "rotate-2 scale-105"
                                )}
                              >
                                <CandidateCard
                                  candidate={candidate}
                                  onClick={() => setSelectedCandidate(candidate)}
                                  isDragging={snapshot.isDragging}
                                  onStageChange={handleStageChange}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </ScrollArea>
              </Card>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Candidate Detail Modal */}
      {selectedCandidate && (
        <CandidateModal
          candidate={selectedCandidate}
          isOpen={!!selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          onUpdate={(updatedCandidate) => {
            onCandidateSelect(updatedCandidate);
            setSelectedCandidate(null);
          }}
          onDelete={onCandidateDelete ? (candidateId) => {
            onCandidateDelete(candidateId);
            setSelectedCandidate(null);
          } : undefined}
        />
      )}

      {/* New Candidate Modal */}
      <NewCandidateModal
        isOpen={showNewCandidateModal}
        onClose={() => setShowNewCandidateModal(false)}
        selectedPosition={selectedPosition}
      />
    </div>
  );
}