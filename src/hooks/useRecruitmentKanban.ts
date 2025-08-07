import { useState, useMemo, useEffect } from 'react';
import { Candidate, CandidateStage, KanbanColumn } from '@/types/recruitment';
import { mockCandidates, kanbanColumns } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';

export function useRecruitmentKanban(positionId?: string) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  // Load candidates from Supabase
  useEffect(() => {
    const loadCandidates = async () => {
      try {
        const { data, error } = await supabase
          .from('candidates')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading candidates:', error);
          // Fallback to mock data on error
          setCandidates(mockCandidates);
        } else {
          // Transform data from database format to app format
          const transformedCandidates: Candidate[] = data.map(candidate => ({
            id: candidate.id,
            name: candidate.name,
            email: candidate.email,
            phone: candidate.phone || '',
            positionId: candidate.position_id || '1',
            resumeUrl: candidate.resume_url,
            resumeText: candidate.resume_text,
            resumeFileName: candidate.resume_file_name,
            source: candidate.source as 'indeed' | 'manual' | 'referral',
            stage: candidate.stage as CandidateStage,
            aiAnalysis: candidate.ai_analysis as any || undefined,
            notes: (candidate.notes as any) || [],
            interviews: (candidate.interviews as any) || [],
            createdAt: new Date(candidate.created_at),
            updatedAt: new Date(candidate.updated_at)
          }));
          setCandidates(transformedCandidates);
        }
      } catch (error) {
        console.error('Error loading candidates:', error);
        setCandidates(mockCandidates);
      } finally {
        setLoading(false);
      }
    };

    loadCandidates();
  }, []);

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

  const moveCandidateToStage = async (candidateId: string, newStage: CandidateStage) => {
    // Atualizar estado local
    setCandidates(prev => prev.map(candidate => 
      candidate.id === candidateId 
        ? { ...candidate, stage: newStage, updatedAt: new Date() }
        : candidate
    ));

    // Atualizar no Supabase - preservando as entrevistas
    try {
      const { error } = await supabase
        .from('candidates')
        .update({
          stage: newStage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', candidateId);

      if (error) {
        console.error('Error updating candidate stage:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error updating candidate:', error);
    }
  };

  const updateCandidate = (updatedCandidate: Candidate) => {
    setCandidates(prev => prev.map(candidate => 
      candidate.id === updatedCandidate.id ? updatedCandidate : candidate
    ));
  };

  const addCandidate = (newCandidate: Candidate) => {
    setCandidates(prev => [...prev, newCandidate]);
  };

  const deleteCandidate = async (candidateId: string) => {
    try {
      const { error } = await supabase
        .from('candidates')
        .delete()
        .eq('id', candidateId);

      if (error) {
        console.error('Error deleting candidate:', error);
        throw error;
      }

      setCandidates(prev => prev.filter(candidate => candidate.id !== candidateId));
    } catch (error) {
      console.error('Error deleting candidate:', error);
      throw error;
    }
  };

  const getStats = () => {
    const total = candidates.length;
    const byStage = candidates.reduce((acc, candidate) => {
      acc[candidate.stage] = (acc[candidate.stage] || 0) + 1;
      return acc;
    }, {} as Record<CandidateStage, number>);

    const approved = byStage.aprovado || 0;
    const rejected = byStage.nao_aprovado || 0;
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
    loading,
    moveCandidateToStage,
    updateCandidate,
    addCandidate,
    deleteCandidate,
    stats: getStats()
  };
}