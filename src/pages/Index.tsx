import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KanbanBoard } from '@/components/recruitment/KanbanBoard';
import { RecruitmentDashboard } from '@/components/recruitment/RecruitmentDashboard';
import { JobPositionSelector } from '@/components/recruitment/JobPositionSelector';
import { NewJobPositionModal } from '@/components/recruitment/NewJobPositionModal';
import { useRecruitmentKanban } from '@/hooks/useRecruitmentKanban';
import { mockJobPositions } from '@/data/mockData';
import { JobPosition } from '@/types/recruitment';

const Index = () => {
  // Carregar posições do localStorage ou usar mock como fallback
  const [jobPositions, setJobPositions] = useState<JobPosition[]>(() => {
    const saved = localStorage.getItem('jobPositions');
    return saved ? JSON.parse(saved) : mockJobPositions;
  });
  
  const [selectedPosition, setSelectedPosition] = useState<JobPosition | null>(() => {
    const saved = localStorage.getItem('selectedPosition');
    if (saved) {
      const savedPosition = JSON.parse(saved);
      return jobPositions.find(p => p.id === savedPosition.id) || jobPositions[0] || null;
    }
    return jobPositions[0] || null;
  });
  
  const [showNewPositionModal, setShowNewPositionModal] = useState(false);
  const { columns, candidates, loading, moveCandidateToStage, updateCandidate, addCandidate, deleteCandidate, stats } = useRecruitmentKanban(selectedPosition?.id);
  
  // Filter candidates by selected position
  const positionCandidates = candidates.filter(candidate => 
    candidate.positionId === selectedPosition?.id
  );
  
  // Filter columns to only show candidates for selected position
  const filteredColumns = columns.map(column => ({
    ...column,
    candidates: column.candidates.filter(candidate => 
      candidate.positionId === selectedPosition?.id
    )
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

  const handleNewJobPosition = (newPosition: JobPosition) => {
    const updatedPositions = [...jobPositions, newPosition];
    setJobPositions(updatedPositions);
    setSelectedPosition(newPosition);
    
    // Persistir no localStorage
    localStorage.setItem('jobPositions', JSON.stringify(updatedPositions));
    localStorage.setItem('selectedPosition', JSON.stringify(newPosition));
  };

  const handleCloseJobPosition = (positionId: string) => {
    const updatedPositions = jobPositions.map(position => 
      position.id === positionId 
        ? { ...position, status: 'closed' as const }
        : position
    );
    setJobPositions(updatedPositions);
    
    // Persistir no localStorage
    localStorage.setItem('jobPositions', JSON.stringify(updatedPositions));
    
    // Se a vaga encerrada for a selecionada, selecionar outra vaga ativa
    if (selectedPosition?.id === positionId) {
      const activePositions = updatedPositions.filter(p => p.status === 'active' && p.id !== positionId);
      if (activePositions.length > 0) {
        setSelectedPosition(activePositions[0]);
        localStorage.setItem('selectedPosition', JSON.stringify(activePositions[0]));
      }
    }
  };

  const handleRemoveJobPosition = (positionId: string) => {
    console.log('🏠 handleRemoveJobPosition chamado com ID:', positionId);
    console.log('📋 Posições antes da remoção:', jobPositions.map(p => ({ id: p.id, title: p.title })));
    
    const updatedPositions = jobPositions.filter(position => position.id !== positionId);
    setJobPositions(updatedPositions);
    
    // Persistir no localStorage
    localStorage.setItem('jobPositions', JSON.stringify(updatedPositions));
    console.log('📋 Posições após remoção:', updatedPositions.map(p => ({ id: p.id, title: p.title })));
    
    // Se a vaga removida for a selecionada, selecionar outra vaga
    if (selectedPosition?.id === positionId) {
      console.log('🎯 Vaga removida era a selecionada, buscando nova...');
      if (updatedPositions.length > 0) {
        console.log('✅ Nova posição selecionada:', updatedPositions[0].title);
        setSelectedPosition(updatedPositions[0]);
        localStorage.setItem('selectedPosition', JSON.stringify(updatedPositions[0]));
      } else {
        console.log('❌ Nenhuma posição restante');
        setSelectedPosition(null);
        localStorage.removeItem('selectedPosition');
      }
    }
  };

  // Atualizar localStorage quando selectedPosition mudar
  const handlePositionSelect = (position: JobPosition) => {
    setSelectedPosition(position);
    localStorage.setItem('selectedPosition', JSON.stringify(position));
  };

  return (
    <div className="min-h-screen bg-kanban-bg">
      {/* Compact Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">CF</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Coroa de Flores Nobre</h1>
                <p className="text-sm text-muted-foreground">Sistema de Gestão de Processo Seletivo</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground opacity-75">v1.0</div>
              <div className="text-xs text-muted-foreground opacity-75">RH • Recursos Humanos</div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4">

        {/* Job Position Selector */}
        <div className="mb-6">
          <JobPositionSelector
            positions={jobPositions}
            selectedPosition={selectedPosition}
            onPositionSelect={handlePositionSelect}
            onNewPosition={() => setShowNewPositionModal(true)}
            onPositionClose={handleCloseJobPosition}
            onPositionRemove={handleRemoveJobPosition}
          />
        </div>

        <Tabs defaultValue="kanban" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-2xl bg-muted/50 p-1 h-12 rounded-lg">
            <TabsTrigger 
              value="dashboard" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-medium transition-all duration-200"
            >
              📊 Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="kanban" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-medium transition-all duration-200"
            >
              🎯 Processo Seletivo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <RecruitmentDashboard stats={positionStats} />
          </TabsContent>

          <TabsContent value="kanban" className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-lg text-muted-foreground">Carregando candidatos...</div>
              </div>
            ) : (
              <KanbanBoard
                columns={filteredColumns}
                onCandidateMove={moveCandidateToStage}
                onCandidateSelect={updateCandidate}
                onCandidateAdd={(candidate) => addCandidate({
                  ...candidate,
                  positionId: selectedPosition?.id || ''
                })}
                onCandidateDelete={deleteCandidate}
                selectedPosition={selectedPosition}
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
