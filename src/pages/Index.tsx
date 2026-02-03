import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { KanbanBoard } from '@/components/recruitment/KanbanBoard';
import { RecruitmentDashboard } from '@/components/recruitment/RecruitmentDashboard';
import { JobPositionSelector } from '@/components/recruitment/JobPositionSelector';
import { NewJobPositionModal } from '@/components/recruitment/NewJobPositionModal';


import { useRecruitmentKanban } from '@/hooks/useRecruitmentKanban';
import { useJobPositions } from '@/hooks/useJobPositions';
import { useAuth } from '@/hooks/useAuth';
import { JobPosition } from '@/types/recruitment';
import { LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import flowNobreLogo from '/lovable-uploads/67eb7c82-39ed-418b-a2e4-7372542bb87d.png';

const Index = () => {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const { jobPositions, loading: positionsLoading, createJobPosition, updateJobPosition, closeJobPosition, pauseJobPosition, deleteJobPosition } = useJobPositions();
  
  const [selectedPosition, setSelectedPosition] = useState<JobPosition | null>(() => {
    const saved = localStorage.getItem('selectedPosition');
    if (saved) {
      const savedPosition = JSON.parse(saved);
      return jobPositions.find(p => p.id === savedPosition.id) || null;
    }
    return null; // Inicia com "Todas as Vagas"
  });
  
  const [showNewPositionModal, setShowNewPositionModal] = useState(false);
  const { 
    columns, 
    candidates, 
    loading, 
    moveCandidateToStage, 
    updateCandidate, 
    addCandidate, 
    deleteCandidate, 
    stats,
    terminalCounts,
    terminalLoadingStates,
    loadMoreFromTerminalColumn,
    hasMoreInTerminal,
    isTerminalStage
  } = useRecruitmentKanban();
  
  console.log('📊 Total candidatos no Index:', candidates.length);
  console.log('📍 Posição selecionada:', selectedPosition?.title || 'Todas as Vagas');
  
  // Filter candidates by selected position and only active job positions (toggle via localStorage)
  const showClosed = localStorage.getItem('showClosedPositions') === 'true';
  const activeJobPositionIds = showClosed 
    ? jobPositions.map(p => p.id)
    : jobPositions.filter(p => p.status === 'active').map(p => p.id);
  
  const positionCandidates = selectedPosition 
    ? candidates.filter(candidate => candidate.positionId === selectedPosition.id)
    : candidates.filter(candidate => activeJobPositionIds.includes(candidate.positionId));
    
  console.log('🔍 Candidatos filtrados:', positionCandidates.length, 'de', candidates.length, showClosed ? '(todas as vagas)' : '(apenas vagas ativas)');
  
  // Filter columns to only show candidates for selected position or active positions
  const filteredColumns = columns.map(column => ({
    ...column,
    candidates: selectedPosition 
      ? column.candidates.filter(candidate => candidate.positionId === selectedPosition.id)
      : column.candidates.filter(candidate => activeJobPositionIds.includes(candidate.positionId))
  }));
  
  // Calculate stats for selected position only
  const positionStats = {
    ...stats,
    total: positionCandidates.length,
    byStage: positionCandidates.reduce((acc, candidate) => {
      acc[candidate.stage] = (acc[candidate.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    approved: positionCandidates.filter(c => c.stage === 'aprovado').length,
    rejected: positionCandidates.filter(c => c.stage === 'nao_aprovado').length,
    inProcess: positionCandidates.filter(c => !['aprovado', 'nao_aprovado'].includes(c.stage)).length,
    conversionRate: positionCandidates.length > 0 ? 
      (positionCandidates.filter(c => c.stage === 'aprovado').length / positionCandidates.length) * 100 : 0
  };

  const handleNewJobPosition = async (newPosition: Omit<JobPosition, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const createdPosition = await createJobPosition(newPosition);
      setSelectedPosition(createdPosition);
      localStorage.setItem('selectedPosition', JSON.stringify(createdPosition));
    } catch (error) {
      console.error('Failed to create job position:', error);
    }
  };

  const handleCloseJobPosition = async (positionId: string) => {
    try {
      await closeJobPosition(positionId);
      
      // Se a vaga encerrada for a selecionada, selecionar outra vaga ativa
      if (selectedPosition?.id === positionId) {
        const activePositions = jobPositions.filter(p => p.status === 'active' && p.id !== positionId);
        if (activePositions.length > 0) {
          setSelectedPosition(activePositions[0]);
          localStorage.setItem('selectedPosition', JSON.stringify(activePositions[0]));
        }
      }
    } catch (error) {
      console.error('Failed to close job position:', error);
    }
  };

  const handlePauseJobPosition = async (positionId: string) => {
    try {
      await pauseJobPosition(positionId);
    } catch (error) {
      console.error('Failed to pause job position:', error);
    }
  };

  const handleDeleteJobPosition = async (positionId: string) => {
    try {
      await deleteJobPosition(positionId);
      
      // Se a vaga removida for a selecionada, selecionar outra vaga ativa
      if (selectedPosition?.id === positionId) {
        const remainingPositions = jobPositions.filter(p => p.id !== positionId);
        if (remainingPositions.length > 0) {
          setSelectedPosition(remainingPositions[0]);
          localStorage.setItem('selectedPosition', JSON.stringify(remainingPositions[0]));
        } else {
          setSelectedPosition(null);
          localStorage.removeItem('selectedPosition');
        }
      }
    } catch (error) {
      console.error('Failed to delete job position:', error);
    }
  };

  // Atualizar localStorage quando selectedPosition mudar
  const handlePositionSelect = (position: JobPosition | null) => {
    setSelectedPosition(position);
    if (position) {
      localStorage.setItem('selectedPosition', JSON.stringify(position));
    } else {
      localStorage.removeItem('selectedPosition');
    }
  };

  const handlePositionUpdate = (updatedPosition: JobPosition) => {
    setSelectedPosition(updatedPosition);
    localStorage.setItem('selectedPosition', JSON.stringify(updatedPosition));
  };

  return (
    <div className="min-h-screen bg-kanban-bg">
      {/* Compact Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <img 
                src={flowNobreLogo} 
                alt="Flow Nobre" 
                className="h-8 sm:h-10 w-auto flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="text-sm sm:text-lg font-semibold text-foreground truncate">Sistema de Gestão</p>
                <p className="text-xs text-muted-foreground hidden sm:block">Processo Seletivo</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="text-right hidden md:block">
                <div className="text-xs text-muted-foreground opacity-75">v1.0</div>
                <div className="text-xs text-muted-foreground opacity-75">RH • Recursos Humanos</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">

        {/* Job Position Selector */}
        <div className="mb-4 sm:mb-6">
          <JobPositionSelector
            positions={jobPositions}
            selectedPosition={selectedPosition}
            onPositionSelect={handlePositionSelect}
            onNewPosition={() => setShowNewPositionModal(true)}
            onPositionClose={handleCloseJobPosition}
            onPositionPause={handlePauseJobPosition}
            onPositionDelete={handleDeleteJobPosition}
            onPositionUpdate={handlePositionUpdate}
          />
        </div>



        <Tabs defaultValue="kanban" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-full sm:max-w-2xl bg-muted/50 p-1 h-10 sm:h-12 rounded-lg">
            <TabsTrigger 
              value="dashboard" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-medium transition-all duration-200 text-xs sm:text-sm"
            >
              <span className="hidden sm:inline">📊 Dashboard</span>
              <span className="sm:hidden">📊</span>
            </TabsTrigger>
            <TabsTrigger 
              value="kanban" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-medium transition-all duration-200 text-xs sm:text-sm"
            >
              <span className="hidden sm:inline">🎯 Processo Seletivo</span>
              <span className="sm:hidden">🎯 Processo</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-3 sm:mt-6">
            <RecruitmentDashboard stats={positionStats} />
          </TabsContent>

          <TabsContent value="kanban" className="mt-3 sm:mt-6">
            {loading || positionsLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-lg text-muted-foreground">
                  {positionsLoading ? 'Carregando vagas...' : 'Carregando candidatos...'}
                </div>
              </div>
            ) : (
              <KanbanBoard
                columns={filteredColumns}
                onCandidateMove={(candidateId, newStage, rejectionReason, talentPoolReason) => 
                  moveCandidateToStage(candidateId, newStage, rejectionReason, talentPoolReason)
                }
                onCandidateUpdate={updateCandidate}
                onCandidateSelect={updateCandidate}
                onCandidateAdd={(candidate) => addCandidate({
                  ...candidate,
                  positionId: selectedPosition?.id || ''
                })}
                onCandidateDelete={deleteCandidate}
                selectedPosition={selectedPosition}
                availablePositions={jobPositions}
                terminalCounts={terminalCounts}
                terminalLoadingStates={terminalLoadingStates}
                onLoadMore={loadMoreFromTerminalColumn}
                hasMoreInTerminal={hasMoreInTerminal}
                isTerminalStage={isTerminalStage}
              />
            )}
          </TabsContent>

        </Tabs>

        {/* New Job Position Modal */}
        <NewJobPositionModal
          open={showNewPositionModal}
          onOpenChange={setShowNewPositionModal}
          onJobPositionCreate={handleNewJobPosition}
        />
      </div>
    </div>
  );
};

export default Index;
