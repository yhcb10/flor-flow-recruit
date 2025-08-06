import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KanbanBoard } from '@/components/recruitment/KanbanBoard';
import { RecruitmentDashboard } from '@/components/recruitment/RecruitmentDashboard';
import { AIAnalysisPanel } from '@/components/recruitment/AIAnalysisPanel';
import { JobPositionSelector } from '@/components/recruitment/JobPositionSelector';
import { useRecruitmentKanban } from '@/hooks/useRecruitmentKanban';
import { mockJobPositions } from '@/data/mockData';

const Index = () => {
  const [selectedPosition, setSelectedPosition] = useState(mockJobPositions[0]);
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

  return (
    <div className="min-h-screen bg-kanban-bg">
      <div className="container mx-auto p-4">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Coroa de Flores Nobre</h1>
              <p className="text-lg text-muted-foreground">Sistema de Gestão de Processo Seletivo</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Versão 1.0</div>
              <div className="text-sm text-muted-foreground">RH • Recursos Humanos</div>
            </div>
          </div>
        </header>

        {/* Job Position Selector */}
        <div className="mb-6">
          <JobPositionSelector
            positions={mockJobPositions}
            selectedPosition={selectedPosition}
            onPositionSelect={setSelectedPosition}
            onNewPosition={() => {
              // TODO: Implement new position creation
              console.log('Create new position');
            }}
          />
        </div>

        <Tabs defaultValue="kanban" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="kanban">Processo Seletivo</TabsTrigger>
            <TabsTrigger value="ai">Análise IA</TabsTrigger>
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

          <TabsContent value="ai" className="mt-6">
            <AIAnalysisPanel 
              selectedPosition={selectedPosition} 
              candidates={positionCandidates}
              onCandidateUpdate={updateCandidate}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
