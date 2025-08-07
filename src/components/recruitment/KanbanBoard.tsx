import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Filter, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
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

  const handleStageChange = (candidateId: string, newStage: CandidateStage, rejectionReason?: string) => {
    onCandidateMove(candidateId, newStage, rejectionReason);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const candidateId = result.draggableId;
    const newStage = result.destination.droppableId as CandidateStage;
    
    onCandidateMove(candidateId, newStage);
  };

  const filteredColumns = columns.map(column => ({
    ...column,
    candidates: column.candidates.filter(candidate =>
      candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }));

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
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
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