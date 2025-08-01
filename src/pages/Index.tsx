import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KanbanBoard } from '@/components/recruitment/KanbanBoard';
import { RecruitmentDashboard } from '@/components/recruitment/RecruitmentDashboard';
import { AIAnalysisPanel } from '@/components/recruitment/AIAnalysisPanel';
import { useRecruitmentKanban } from '@/hooks/useRecruitmentKanban';
import { mockJobPositions } from '@/data/mockData';

const Index = () => {
  const { columns, moveCandidateToStage, updateCandidate, addCandidate, stats } = useRecruitmentKanban();
  const [selectedPosition, setSelectedPosition] = useState(mockJobPositions[0]);

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

        <Tabs defaultValue="kanban" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="kanban">Processo Seletivo</TabsTrigger>
            <TabsTrigger value="ai">Análise IA</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <RecruitmentDashboard stats={stats} />
          </TabsContent>

          <TabsContent value="kanban" className="mt-6">
            <KanbanBoard
              columns={columns}
              onCandidateMove={moveCandidateToStage}
              onCandidateSelect={updateCandidate}
              onCandidateAdd={addCandidate}
            />
          </TabsContent>

          <TabsContent value="ai" className="mt-6">
            <AIAnalysisPanel selectedPosition={selectedPosition} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
