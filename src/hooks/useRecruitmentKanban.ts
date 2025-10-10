import { useState, useMemo, useEffect } from 'react';
import { Candidate, CandidateStage, KanbanColumn } from '@/types/recruitment';
import { mockCandidates, kanbanColumns } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';

export function useRecruitmentKanban() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  // Load candidates from Supabase
  useEffect(() => {
    const loadCandidates = async () => {
      try {
        console.log('🔄 Carregando candidatos do Supabase...');
        const { data, error } = await supabase
          .from('candidates')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading candidates:', error);
          // Fallback to mock data on error
          setCandidates(mockCandidates);
        } else {
          console.log('📊 Total de candidatos carregados do Supabase:', data.length);
          console.log('📋 Candidatos por stage:', data.reduce((acc: any, c: any) => {
            acc[c.stage] = (acc[c.stage] || 0) + 1;
            return acc;
          }, {}));
          // Log candidates with interviews for debugging
          data.forEach(candidate => {
            if (candidate.interviews && Array.isArray(candidate.interviews) && candidate.interviews.length > 0) {
              console.log(`📅 ${candidate.name} tem ${candidate.interviews.length} entrevista(s):`, candidate.interviews);
            }
          });
          
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
            interviews: Array.isArray(candidate.interviews) ? 
              (candidate.interviews as any[]).filter((interview: any, index: number, self: any[]) => 
                interview && interview.id && self.findIndex((i: any) => i?.id === interview.id) === index
              ).map((interview: any) => ({
                id: interview.id,
                type: interview.type,
                scheduledAt: interview.scheduledAt ? new Date(interview.scheduledAt) : new Date(),
                duration: interview.duration,
                meetingUrl: interview.meetingUrl,
                interviewerIds: interview.interviewerIds || [],
                status: interview.status,
                location: interview.location,
                notes: interview.notes
              })) : [],
            rejectionReason: candidate.rejection_reason,
            talentPoolReason: candidate.talent_pool_reason,
            createdAt: new Date(candidate.created_at),
             updatedAt: new Date(candidate.updated_at)
           }));
           console.log('🎯 Candidatos transformados para o estado local:', transformedCandidates.length);
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

  // Set up realtime subscription for new candidates
  useEffect(() => {
    const channel = supabase
      .channel('candidates-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'candidates'
        },
        (payload) => {
          console.log('📥 Novo candidato recebido via realtime:', payload.new);
          const newCandidate = payload.new as any;
          
          // Transform the new candidate to app format
          const transformedCandidate: Candidate = {
            id: newCandidate.id,
            name: newCandidate.name,
            email: newCandidate.email,
            phone: newCandidate.phone || '',
            positionId: newCandidate.position_id || '1',
            resumeUrl: newCandidate.resume_url,
            resumeText: newCandidate.resume_text,
            resumeFileName: newCandidate.resume_file_name,
            source: newCandidate.source as 'indeed' | 'manual' | 'referral',
            stage: newCandidate.stage as CandidateStage,
            aiAnalysis: newCandidate.ai_analysis as any || undefined,
            notes: (newCandidate.notes as any) || [],
            interviews: Array.isArray(newCandidate.interviews) ? 
              (newCandidate.interviews as any[]).map((interview: any) => ({
                id: interview.id,
                type: interview.type,
                scheduledAt: interview.scheduledAt ? new Date(interview.scheduledAt) : new Date(),
                duration: interview.duration,
                meetingUrl: interview.meetingUrl,
                interviewerIds: interview.interviewerIds || [],
                status: interview.status,
                location: interview.location,
                notes: interview.notes
              })) : [],
            rejectionReason: newCandidate.rejection_reason,
            talentPoolReason: newCandidate.talent_pool_reason,
            createdAt: new Date(newCandidate.created_at),
            updatedAt: new Date(newCandidate.updated_at)
          };

          // Add the new candidate to the beginning of the list
          setCandidates(prev => [transformedCandidate, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'candidates'
        },
        (payload) => {
          console.log('📝 Candidato atualizado via realtime:', payload.new);
          const updatedCandidate = payload.new as any;
          
          // Transform the updated candidate to app format
          const transformedCandidate: Candidate = {
            id: updatedCandidate.id,
            name: updatedCandidate.name,
            email: updatedCandidate.email,
            phone: updatedCandidate.phone || '',
            positionId: updatedCandidate.position_id || '1',
            resumeUrl: updatedCandidate.resume_url,
            resumeText: updatedCandidate.resume_text,
            resumeFileName: updatedCandidate.resume_file_name,
            source: updatedCandidate.source as 'indeed' | 'manual' | 'referral',
            stage: updatedCandidate.stage as CandidateStage,
            aiAnalysis: updatedCandidate.ai_analysis as any || undefined,
            notes: (updatedCandidate.notes as any) || [],
            interviews: Array.isArray(updatedCandidate.interviews) ? 
              (updatedCandidate.interviews as any[]).map((interview: any) => ({
                id: interview.id,
                type: interview.type,
                scheduledAt: interview.scheduledAt ? new Date(interview.scheduledAt) : new Date(),
                duration: interview.duration,
                meetingUrl: interview.meetingUrl,
                interviewerIds: interview.interviewerIds || [],
                status: interview.status,
                location: interview.location,
                notes: interview.notes
              })) : [],
            rejectionReason: updatedCandidate.rejection_reason,
            talentPoolReason: updatedCandidate.talent_pool_reason,
            createdAt: new Date(updatedCandidate.created_at),
            updatedAt: new Date(updatedCandidate.updated_at)
          };

          // Update the candidate in the list
          setCandidates(prev => prev.map(candidate => 
            candidate.id === transformedCandidate.id ? transformedCandidate : candidate
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const columns = useMemo(() => {
    const candidatesByStage = candidates.reduce((acc, candidate) => {
      if (!acc[candidate.stage]) {
        acc[candidate.stage] = [];
      }
      acc[candidate.stage].push(candidate);
      return acc;
    }, {} as Record<CandidateStage, Candidate[]>);

    return kanbanColumns.map(column => {
      let sortedCandidates = candidatesByStage[column.id] || [];
      
      // Ordenar por horário de entrevista nas colunas específicas
      if (column.id === 'pre_entrevista' || column.id === 'aguardando_feedback_pre_entrevista' || column.id === 'entrevista_presencial') {
        const targetInterviewType = (column.id === 'pre_entrevista' || column.id === 'aguardando_feedback_pre_entrevista') ? 'pre_interview' : 'in_person';
        
        sortedCandidates = sortedCandidates.sort((a, b) => {
          // Encontrar a próxima entrevista agendada do tipo correto
          const getNextInterview = (candidate: any) => {
            return candidate.interviews
              ?.filter((interview: any) => 
                interview.type === targetInterviewType && 
                interview.status === 'scheduled'
              )
              ?.sort((x: any, y: any) => new Date(x.scheduledAt).getTime() - new Date(y.scheduledAt).getTime())[0];
          };
          
          const nextInterviewA = getNextInterview(a);
          const nextInterviewB = getNextInterview(b);
          
          // Se ambos têm entrevistas, ordenar pela data
          if (nextInterviewA && nextInterviewB) {
            return new Date(nextInterviewA.scheduledAt).getTime() - new Date(nextInterviewB.scheduledAt).getTime();
          }
          
          // Candidatos com entrevistas vêm primeiro
          if (nextInterviewA && !nextInterviewB) return -1;
          if (!nextInterviewA && nextInterviewB) return 1;
          
          // Se nenhum tem entrevistas, manter ordem por data de criação
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      }
      
      return {
        ...column,
        candidates: sortedCandidates
      };
    });
  }, [candidates]);

  const moveCandidateToStage = async (candidateId: string, newStage: CandidateStage, rejectionReason?: string, talentPoolReason?: string) => {
    // Atualizar estado local
    setCandidates(prev => prev.map(candidate => 
      candidate.id === candidateId 
        ? { 
            ...candidate, 
            stage: newStage, 
            rejectionReason: newStage === 'nao_aprovado' ? rejectionReason : undefined,
            talentPoolReason: newStage === 'banco_talentos' ? talentPoolReason : undefined,
            updatedAt: new Date() 
          }
        : candidate
    ));

    // Atualizar no Supabase - preservando as entrevistas
    try {
      const updateData: any = {
        stage: newStage,
        updated_at: new Date().toISOString(),
      };
      
      if (newStage === 'nao_aprovado' && rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }
      
      if (newStage === 'banco_talentos' && talentPoolReason) {
        updateData.talent_pool_reason = talentPoolReason;
      }
      
      const { error } = await supabase
        .from('candidates')
        .update(updateData)
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
    
    // Check for AI automation AFTER updating the candidate
    checkAndApplyAIAutomation(updatedCandidate);
  };

  const checkAndApplyAIAutomation = (candidate: Candidate) => {
    // Only apply automation for candidates in 'analise_ia' stage with AI analysis
    if (candidate.stage === 'analise_ia' && candidate.aiAnalysis) {
      const score = candidate.aiAnalysis.score;
      
      console.log('🤖 Automação IA - Candidato:', candidate.name, 'Nota:', score, 'Stage:', candidate.stage);
      
      // Apply automation immediately for all candidates with AI analysis in this stage
      setTimeout(() => {
        if (score >= 6.5) {
          console.log('✅ Auto-aprovando candidato com nota >= 6.5');
          moveCandidateToStage(candidate.id, 'selecao_pre_entrevista');
        } else {
          console.log('❌ Auto-reprovando candidato com nota < 6.5');
          moveCandidateToStage(candidate.id, 'nao_aprovado', 'Pontuação IA abaixo do mínimo (6.5)');
        }
      }, 1000); // 1 second delay to show the analysis first
    }
  };

  // Function to process all candidates in analise_ia stage on mount
  const processExistingAIAnalyses = () => {
    candidates.forEach(candidate => {
      if (candidate.stage === 'analise_ia' && candidate.aiAnalysis) {
        console.log('🔄 Processando análise IA existente para:', candidate.name, 'Nota:', candidate.aiAnalysis.score);
        checkAndApplyAIAutomation(candidate);
      }
    });
  };

  // Process existing AI analyses when component mounts - only run once
  useEffect(() => {
    if (loading || candidates.length === 0) return;
    
    const timer = setTimeout(() => {
      processExistingAIAnalyses();
    }, 2000); // Wait 2 seconds after mount to process existing analyses
    
    return () => clearTimeout(timer);
  }, [loading]); // Only run when loading changes, not when candidates change

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