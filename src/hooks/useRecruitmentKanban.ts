import { useState, useMemo } from 'react';
import { Candidate, CandidateStage, KanbanColumn } from '@/types/recruitment';
import { mockCandidates, kanbanColumns } from '@/data/mockData';

export function useRecruitmentKanban() {
  const [candidates, setCandidates] = useState<Candidate[]>(mockCandidates);

  const columns = useMemo(() => {
    const candidatesByStage = candidates.reduce((acc, candidate) => {
      if (!acc[candidate.stage]) {
        acc[candidate.stage] = [];
      }
      acc[candidate.stage].push(candidate);
      return acc;
    }, {} as Record<CandidateStage, Candidate[]>);

    return kanbanColumns.map(column => ({
      ...column,
      candidates: candidatesByStage[column.id] || []
    }));
  }, [candidates]);

  const moveCandidateToStage = (candidateId: string, newStage: CandidateStage) => {
    setCandidates(prev => prev.map(candidate => 
      candidate.id === candidateId 
        ? { ...candidate, stage: newStage, updatedAt: new Date() }
        : candidate
    ));
  };

  const updateCandidate = (updatedCandidate: Candidate) => {
    setCandidates(prev => prev.map(candidate => 
      candidate.id === updatedCandidate.id ? updatedCandidate : candidate
    ));
  };

  const addCandidate = (newCandidate: Candidate) => {
    setCandidates(prev => [...prev, newCandidate]);
  };

  const getStats = () => {
    const total = candidates.length;
    const byStage = candidates.reduce((acc, candidate) => {
      acc[candidate.stage] = (acc[candidate.stage] || 0) + 1;
      return acc;
    }, {} as Record<CandidateStage, number>);

    const approved = byStage.aprovacao_final || 0;
    const rejected = byStage.reprovado || 0;
    const inProcess = total - approved - rejected;

    return {
      total,
      byStage,
      approved,
      rejected,
      inProcess,
      conversionRate: total > 0 ? (approved / total) * 100 : 0
    };
  };

  return {
    columns,
    candidates,
    moveCandidateToStage,
    updateCandidate,
    addCandidate,
    stats: getStats()
  };
}