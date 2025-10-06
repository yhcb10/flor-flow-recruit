import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Filter, Search, X, LayoutGrid, Grid3X3, GripVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { CandidateCard } from './CandidateCard';
import { CandidateModal } from './CandidateModal';
import { NewCandidateModal } from './NewCandidateModal';
import { TalentPoolReasonModal } from './TalentPoolReasonModal';
import { KanbanMinimap } from './KanbanMinimap';
import { KanbanColumnsList } from './KanbanColumnsList';
import { useKanbanNavigation } from '@/hooks/useKanbanNavigation';
import { Candidate, CandidateStage, KanbanColumn, JobPosition } from '@/types/recruitment';
import { cn } from '@/lib/utils';

interface KanbanBoardProps {
  columns: KanbanColumn[];
  onCandidateMove: (candidateId: string, newStage: CandidateStage, rejectionReason?: string, talentPoolReason?: string) => void;
  onCandidateUpdate?: (candidate: Candidate) => void;
  onCandidateSelect?: (candidate: Candidate) => void;
  onCandidateAdd?: (newCandidate: Candidate) => void;
  onCandidateDelete?: (candidateId: string) => void;
  selectedPosition?: JobPosition | null;
  availablePositions?: JobPosition[];
}

export function KanbanBoard({ 
  columns, 
  onCandidateMove, 
  onCandidateUpdate,
  onCandidateSelect, 
  onCandidateAdd, 
  onCandidateDelete, 
  selectedPosition,
  availablePositions = []
}: KanbanBoardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showNewCandidateModal, setShowNewCandidateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isCompactView, setIsCompactView] = useState(false);
  const [showTalentPoolModal, setShowTalentPoolModal] = useState(false);
  const [pendingTalentPoolMove, setPendingTalentPoolMove] = useState<{candidateId: string, candidateName: string} | null>(null);
  const { activeColumnId, kanbanRef, scrollToColumn } = useKanbanNavigation();
  
  // Filter states
  const [filters, setFilters] = useState({
    source: 'all',
    aiScore: 'all',
    interviewStatus: 'all',
    dateRange: 'all'
  });

  const handleStageChange = (candidateId: string, newStage: CandidateStage, rejectionReason?: string) => {
    onCandidateMove(candidateId, newStage, rejectionReason);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const candidateId = result.draggableId;
    const newStage = result.destination.droppableId as CandidateStage;
    
    if (newStage === 'banco_talentos') {
      const candidate = columns.flatMap(col => col.candidates).find(c => c.id === candidateId);
      if (candidate) {
        setPendingTalentPoolMove({candidateId, candidateName: candidate.name});
        setShowTalentPoolModal(true);
        return;
      }
    }
    
    onCandidateMove(candidateId, newStage);
  };

  const handleTalentPoolConfirm = (reason: string) => {
    if (pendingTalentPoolMove) {
      onCandidateMove(pendingTalentPoolMove.candidateId, 'banco_talentos', undefined, reason);
      setPendingTalentPoolMove(null);
    }
    setShowTalentPoolModal(false);
  };

  const handleTalentPoolCancel = () => {
    setPendingTalentPoolMove(null);
    setShowTalentPoolModal(false);
  };

  const clearFilters = () => {
    setFilters({
      source: 'all',
      aiScore: 'all',
      interviewStatus: 'all',
      dateRange: 'all'
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
      const matchesSource = filters.source === 'all' || candidate.source === filters.source;

      // AI Score filter
      const matchesAiScore = filters.aiScore === 'all' || (() => {
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
      const matchesInterviewStatus = filters.interviewStatus === 'all' || 
        getInterviewStatus(candidate) === filters.interviewStatus;

      // Date range filter
      const matchesDateRange = filters.dateRange === 'all' || (() => {
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

  const hasActiveFilters = Object.values(filters).some(f => f !== 'all') || searchTerm !== '';

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col">
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="bg-kanban-bg p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Processo Seletivo</h1>
                <p className="text-muted-foreground">Coroa de Flores Nobre</p>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Mobile Columns List */}
                <KanbanColumnsList 
                  columns={filteredColumns} 
                  onColumnClick={scrollToColumn} 
                />

                {/* View Toggle */}
                <div className="flex items-center bg-muted rounded-lg p-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={!isCompactView ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setIsCompactView(false)}
                        className="px-3 py-1 h-8"
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div>Visualização expandida</div>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={isCompactView ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setIsCompactView(true)}
                        className="px-3 py-1 h-8"
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div>Visualização compacta</div>
                    </TooltipContent>
                  </Tooltip>
                </div>

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
                              <SelectItem value="all">Todas</SelectItem>
                              <SelectItem value="indeed">Indeed</SelectItem>
                              <SelectItem value="linkedin">LinkedIn</SelectItem>
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
                              <SelectItem value="all">Todas</SelectItem>
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
                              <SelectItem value="all">Todos</SelectItem>
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
                              <SelectItem value="all">Todos</SelectItem>
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

            {/* Minimapa */}
            <div className="hidden md:block">
              <KanbanMinimap 
                columns={filteredColumns} 
                activeColumnId={activeColumnId}
                onColumnClick={scrollToColumn} 
              />
            </div>
          </div>
        </div>

        {/* Kanban Board Container */}
        <div className="flex-1 bg-kanban-bg px-6 pb-6">
          {/* Kanban Board */}
          <DragDropContext onDragEnd={handleDragEnd}>
            <div 
              ref={kanbanRef}
              className="overflow-x-auto pb-4 scroll-smooth"
              style={{ 
                scrollbarWidth: 'thin',
                scrollbarColor: 'hsl(var(--border)) transparent'
              }}
            >
              <div className="flex gap-4 min-h-[600px]" style={{ minWidth: 'max-content' }}>
                {filteredColumns.map((column, index) => (
                  <div 
                    key={column.id}
                    className="flex-shrink-0 w-80"
                    data-column-id={column.id}
                  >
                    <Card className="bg-kanban-column border-border h-full flex flex-col">
                      {/* Column Header */}
                      <div className="p-4 border-b border-border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                            <h3 className="font-semibold text-foreground">{column.title}</h3>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {column.candidates.length}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{column.description}</p>
                      </div>

                      {/* Droppable Area with ScrollArea */}
                      <ScrollArea className="flex-1 max-h-[calc(100vh-400px)]">
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
                                        onCandidateUpdate={onCandidateUpdate}
                                        isCompactView={isCompactView}
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
            </div>
          </DragDropContext>
        </div>

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
          availablePositions={availablePositions}
        />

        {/* Talent Pool Reason Modal */}
        <TalentPoolReasonModal
          isOpen={showTalentPoolModal}
          onClose={handleTalentPoolCancel}
          onConfirm={handleTalentPoolConfirm}
          candidateName={pendingTalentPoolMove?.candidateName || ''}
        />
      </div>
    </TooltipProvider>
  );
}