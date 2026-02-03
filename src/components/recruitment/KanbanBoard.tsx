import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Filter, Search, X, LayoutGrid, Grid3X3, GripVertical, RotateCcw, Loader2, ChevronDown } from 'lucide-react';
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
import { Candidate, CandidateStage, KanbanColumn, JobPosition, TerminalLoadingState } from '@/types/recruitment';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface KanbanBoardProps {
  columns: KanbanColumn[];
  onCandidateMove: (candidateId: string, newStage: CandidateStage, rejectionReason?: string, talentPoolReason?: string) => void;
  onCandidateUpdate?: (candidate: Candidate) => void;
  onCandidateSelect?: (candidate: Candidate) => void;
  onCandidateAdd?: (newCandidate: Candidate) => void;
  onCandidateDelete?: (candidateId: string) => void;
  selectedPosition?: JobPosition | null;
  availablePositions?: JobPosition[];
  // Novas props para lazy loading de colunas terminais
  terminalCounts?: Record<CandidateStage, number>;
  terminalLoadingStates?: Record<CandidateStage, TerminalLoadingState>;
  onLoadMore?: (stage: CandidateStage, pageSize?: number) => Promise<boolean>;
  hasMoreInTerminal?: (stage: CandidateStage) => boolean;
  isTerminalStage?: (stage: CandidateStage) => boolean;
}

export function KanbanBoard({ 
  columns, 
  onCandidateMove, 
  onCandidateUpdate,
  onCandidateSelect, 
  onCandidateAdd, 
  onCandidateDelete, 
  selectedPosition,
  availablePositions = [],
  terminalCounts = {} as Record<CandidateStage, number>,
  terminalLoadingStates = {} as Record<CandidateStage, TerminalLoadingState>,
  onLoadMore,
  hasMoreInTerminal,
  isTerminalStage
}: KanbanBoardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showNewCandidateModal, setShowNewCandidateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isCompactView, setIsCompactView] = useState(false);
  const [showTalentPoolModal, setShowTalentPoolModal] = useState(false);
  const [pendingTalentPoolMove, setPendingTalentPoolMove] = useState<{candidateId: string, candidateName: string} | null>(null);
  const { activeColumnId, kanbanRef, scrollToColumn } = useKanbanNavigation();
  const { toast } = useToast();

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Evita que o modo de seleção fique “preso” ligado após hot-reload.
  useEffect(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);
  
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

  const toggleSelectCandidate = (candidateId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else {
        next.add(candidateId);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const toggleSelectColumn = (candidateIds: string[]) => {
    if (candidateIds.length === 0) return;

    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = candidateIds.every((id) => next.has(id));

      if (allSelected) {
        candidateIds.forEach((id) => next.delete(id));
        return next;
      }

      candidateIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleBulkReanalyze = async () => {
    const candidateIds = Array.from(selectedIds);
    if (candidateIds.length === 0) return;

    const confirmed = window.confirm(`Reanalisar ${candidateIds.length} candidato(s) no n8n?\n\nEles serão retornados para "Análise IA" e, quando o n8n responder, os dados serão atualizados no mesmo registro.`);
    if (!confirmed) return;

    try {
      toast({
        title: 'Reanálise em andamento',
        description: `Disparando ${candidateIds.length} candidato(s) para reanálise no n8n...`
      });

      const { data, error } = await supabase.functions.invoke('reanalyze-candidates-n8n', {
        body: { candidateIds }
      });

      if (error) {
        throw error;
      }

      clearSelection();
      setSelectionMode(false);

      toast({
        title: 'Reanálise disparada',
        description: data?.message || 'O n8n irá retornar as novas análises e os candidatos serão atualizados.'
      });
    } catch (err: any) {
      console.error('Erro ao reanalisar em massa:', err);
      toast({
        title: 'Erro na reanálise em massa',
        description: err?.message || 'Não foi possível disparar a reanálise em massa no n8n.',
        variant: 'destructive'
      });
    }
  };

  const getInterviewStatus = (candidate: Candidate) => {
    if (candidate.interviews.length === 0) return 'none';
    const latestInterview = candidate.interviews[candidate.interviews.length - 1];
    return latestInterview.status;
  };

  const normalizeSource = (value?: string) => {
    if (!value) return 'unknown';
    const val = String(value).trim().toLowerCase();
    // Remove accents/diacritics
    const plain = val.normalize('NFD').replace(/\p{Diacritic}/gu, '');
    if (plain.includes('linkedin')) return 'linkedin';
    if (plain.includes('indeed')) return 'indeed';
    if (plain.includes('infojobs')) return 'infojobs';
    if (plain.includes('instagram')) return 'instagram';
    if (plain.includes('facebook')) return 'facebook';
    if (plain.includes('indicacao')) return 'referral';
    if (plain.includes('referral')) return 'referral';
    if (plain.includes('manual')) return 'manual';
    return plain;
  };

  const filteredColumns = columns.map(column => ({
    ...column,
    candidates: column.candidates.filter(candidate => {
      // Basic search
      const matchesSearch = searchTerm === '' || 
        candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.email.toLowerCase().includes(searchTerm.toLowerCase());

      // Source filter
      const candidateSource = normalizeSource(candidate.source as unknown as string);
      const matchesSource = filters.source === 'all' || candidateSource === filters.source;

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
          <div className="bg-kanban-bg p-3 sm:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 sm:mb-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Processo Seletivo</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">Coroa de Flores Nobre</p>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {/* Mobile Columns List */}
                <KanbanColumnsList 
                  columns={filteredColumns} 
                  onColumnClick={scrollToColumn}
                  terminalCounts={terminalCounts}
                  isTerminalStage={isTerminalStage}
                />

                {/* View Toggle */}
                <div className="hidden md:flex items-center bg-muted rounded-lg p-1">
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

                <div className="relative flex-1 sm:flex-initial min-w-0">
                  <Search className="absolute left-2 sm:left-3 top-2 sm:top-3 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-7 sm:pl-10 w-full sm:w-48 md:w-64 h-8 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
                
                <Popover open={showFilters} onOpenChange={setShowFilters}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className={cn(hasActiveFilters && "bg-primary text-primary-foreground", "h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm")}
                    >
                      <Filter className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Filtros</span>
                      {hasActiveFilters && <Badge variant="secondary" className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5 p-0 text-xs">!</Badge>}
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
                              <SelectItem value="infojobs">Infojobs</SelectItem>
                              <SelectItem value="instagram">Instagram</SelectItem>
                              <SelectItem value="referral">Indicação</SelectItem>
                              <SelectItem value="facebook">Facebook</SelectItem>
                              <SelectItem value="manual">Manual</SelectItem>
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

                  {/* Seleção / ações em massa */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant={selectionMode ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
                      onClick={() => {
                        setSelectionMode((v) => {
                          const next = !v;
                          if (!next) {
                            clearSelection();
                          }
                          return next;
                        });
                      }}
                      title="Ativar seleção múltipla"
                    >
                      <span className="hidden sm:inline">Selecionar</span>
                      <span className="sm:hidden">Sel.</span>
                      {selectedIds.size > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 px-2 text-xs">
                          {selectedIds.size}
                        </Badge>
                      )}
                    </Button>

                    {selectionMode && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
                          onClick={handleBulkReanalyze}
                          disabled={selectedIds.size === 0}
                          title="Reanalisar candidatos selecionados no n8n"
                        >
                          <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Reanalisar</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
                          onClick={clearSelection}
                          disabled={selectedIds.size === 0}
                          title="Limpar seleção"
                        >
                          <X className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                
                <Button 
                  size="sm"
                  onClick={() => setShowNewCandidateModal(true)}
                  className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Nova Candidatura</span>
                  <span className="sm:hidden">Nova</span>
                </Button>
              </div>
            </div>

            {/* Minimapa */}
            <div className="hidden md:block">
              <KanbanMinimap 
                columns={filteredColumns} 
                activeColumnId={activeColumnId}
                onColumnClick={scrollToColumn}
                terminalCounts={terminalCounts}
                isTerminalStage={isTerminalStage}
              />
            </div>
          </div>
        </div>

        {/* Kanban Board Container */}
        <div className="flex-1 bg-kanban-bg px-2 sm:px-6 pb-3 sm:pb-6">
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
              <div className="flex gap-2 sm:gap-4 min-h-[400px] sm:min-h-[600px]" style={{ minWidth: 'max-content' }}>
                {filteredColumns.map((column, index) => (
                  <div 
                    key={column.id}
                    className="flex-shrink-0 w-72 sm:w-80"
                    data-column-id={column.id}
                  >
                    <Card className="bg-kanban-column border-border h-full flex flex-col">
                      {/* Column Header */}
                      <div className="p-3 sm:p-4 border-b border-border">
                        <div className="flex items-center justify-between mb-1 sm:mb-2">
                          <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
                            <GripVertical className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground cursor-grab flex-shrink-0" />
                            <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{column.title}</h3>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                            {selectionMode && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                disabled={column.candidates.length === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelectColumn(column.candidates.map((c) => c.id));
                                }}
                                title="Selecionar (ou limpar) todos os candidatos desta coluna"
                              >
                                {column.candidates.length > 0 && column.candidates.every((c) => selectedIds.has(c.id))
                                  ? 'Limpar'
                                  : 'Selecionar'}
                              </Button>
                            )}

                            {/* Badge com contador - diferente para colunas terminais */}
                            {isTerminalStage && isTerminalStage(column.id) ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="secondary" className="text-xs">
                                    {column.candidates.length} / {terminalCounts[column.id] || 0}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{column.candidates.length} carregados de {terminalCounts[column.id] || 0} total</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                {column.candidates.length}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{column.description}</p>
                      </div>

                      {/* Droppable Area with ScrollArea */}
                      <ScrollArea className="flex-1 max-h-[calc(100vh-300px)] sm:max-h-[calc(100vh-400px)]">
                        <Droppable droppableId={column.id}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={cn(
                                "p-2 sm:p-4 min-h-[300px] sm:min-h-[500px] transition-colors",
                                snapshot.isDraggingOver && "bg-primary/5"
                              )}
                            >
                              {/* Mostrar mensagem para carregar candidatos em colunas terminais vazias */}
                              {isTerminalStage && isTerminalStage(column.id) && column.candidates.length === 0 && (terminalCounts[column.id] || 0) > 0 && (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                  <p className="text-sm text-muted-foreground mb-3">
                                    {terminalCounts[column.id]} candidatos nesta coluna
                                  </p>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onLoadMore && onLoadMore(column.id)}
                                    disabled={terminalLoadingStates[column.id] === 'loading'}
                                    className="gap-2"
                                  >
                                    {terminalLoadingStates[column.id] === 'loading' ? (
                                      <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Carregando...
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="h-4 w-4" />
                                        Carregar candidatos
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}

                              {column.candidates.map((candidate, index) => (
                                <Draggable key={candidate.id} draggableId={candidate.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={cn(
                                        "mb-2 sm:mb-3",
                                        snapshot.isDragging && "rotate-2 scale-105"
                                      )}
                                    >
                                      <CandidateCard
                                        candidate={candidate}
                                        onClick={() => {
                                          if (selectionMode) {
                                            toggleSelectCandidate(candidate.id);
                                            return;
                                          }
                                          setSelectedCandidate(candidate);
                                        }}
                                        isDragging={snapshot.isDragging}
                                        onStageChange={handleStageChange}
                                        onCandidateUpdate={onCandidateUpdate}
                                        isCompactView={isCompactView}
                                        selectionEnabled={selectionMode}
                                        isSelected={selectedIds.has(candidate.id)}
                                        onToggleSelect={toggleSelectCandidate}
                                      />
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}

                              {/* Botão "Carregar mais" para colunas terminais */}
                              {isTerminalStage && isTerminalStage(column.id) && hasMoreInTerminal && hasMoreInTerminal(column.id) && column.candidates.length > 0 && (
                                <div className="flex justify-center pt-2 pb-4">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onLoadMore && onLoadMore(column.id)}
                                    disabled={terminalLoadingStates[column.id] === 'loading'}
                                    className="gap-2 text-muted-foreground hover:text-foreground"
                                  >
                                    {terminalLoadingStates[column.id] === 'loading' ? (
                                      <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Carregando...
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="h-4 w-4" />
                                        Carregar mais ({(terminalCounts[column.id] || 0) - column.candidates.length} restantes)
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
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