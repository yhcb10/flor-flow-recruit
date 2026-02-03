import { useState, useMemo, useEffect, useCallback } from 'react';
import { Candidate, CandidateStage, KanbanColumn, TERMINAL_STAGES, TerminalLoadingState } from '@/types/recruitment';
import { mockCandidates, kanbanColumns } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';

// Constantes de paginação
const PAGE_SIZE = 1000; // Limite do Supabase
const TERMINAL_PAGE_SIZE = 50; // Quantos candidatos carregar por vez nas colunas terminais

// Função helper para transformar candidato do DB para app format
function transformCandidate(dbCandidate: any): Candidate {
  return {
    id: dbCandidate.id,
    name: dbCandidate.name,
    email: dbCandidate.email,
    phone: dbCandidate.phone || '',
    positionId: dbCandidate.position_id || '1',
    resumeUrl: dbCandidate.resume_url,
    resumeText: dbCandidate.resume_text,
    resumeFileName: dbCandidate.resume_file_name,
    source: dbCandidate.source as 'indeed' | 'manual' | 'referral',
    stage: dbCandidate.stage as CandidateStage,
    aiAnalysis: dbCandidate.ai_analysis as any || undefined,
    notes: (dbCandidate.notes as any) || [],
    interviews: Array.isArray(dbCandidate.interviews) ? 
      (dbCandidate.interviews as any[]).filter((interview: any, index: number, self: any[]) => 
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
    rejectionReason: dbCandidate.rejection_reason,
    talentPoolReason: dbCandidate.talent_pool_reason,
    createdAt: new Date(dbCandidate.created_at),
    updatedAt: new Date(dbCandidate.updated_at)
  };
}

// Função de paginação iterativa - garante busca de TODOS os dados
async function fetchAllPaginated(
  filterFn?: (query: any) => any
): Promise<any[]> {
  let allData: any[] = [];
  let offset = 0;
  let hasMore = true;

  console.log('🔄 Iniciando paginação iterativa...');

  while (hasMore) {
    let query = supabase
      .from('candidates')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (filterFn) {
      query = filterFn(query);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro na paginação:', error);
      throw error;
    }

    if (data) {
      allData = [...allData, ...data];
      console.log(`📦 Lote carregado: ${data.length} registros (total: ${allData.length})`);
      
      // Se retornou menos que o tamanho da página, não há mais dados
      if (data.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        offset += PAGE_SIZE;
      }
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ Paginação completa: ${allData.length} registros totais`);
  return allData;
}

export function useRecruitmentKanban() {
  // Estado para candidatos de colunas ATIVAS (não terminais)
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para colunas terminais (lazy loading)
  const [terminalCandidates, setTerminalCandidates] = useState<Map<CandidateStage, Candidate[]>>(new Map());
  const [terminalCounts, setTerminalCounts] = useState<Record<CandidateStage, number>>({} as Record<CandidateStage, number>);
  const [terminalLoadingStates, setTerminalLoadingStates] = useState<Record<CandidateStage, TerminalLoadingState>>({
    nao_aprovado: 'idle',
    aprovado: 'idle',
    banco_talentos: 'idle'
  } as Record<CandidateStage, TerminalLoadingState>);
  const [terminalOffsets, setTerminalOffsets] = useState<Record<CandidateStage, number>>({
    nao_aprovado: 0,
    aprovado: 0,
    banco_talentos: 0
  } as Record<CandidateStage, number>);

  // Helper para verificar se é coluna terminal
  const isTerminalStage = useCallback((stage: CandidateStage) => {
    return TERMINAL_STAGES.includes(stage);
  }, []);

  // Carregar contadores das colunas terminais
  const loadTerminalCounts = useCallback(async () => {
    try {
      console.log('📊 Carregando contadores das colunas terminais...');
      
      const counts: Record<CandidateStage, number> = {} as Record<CandidateStage, number>;
      
      // Buscar count para cada coluna terminal em paralelo
      const countPromises = TERMINAL_STAGES.map(async (stage) => {
        const { count, error } = await supabase
          .from('candidates')
          .select('*', { count: 'exact', head: true })
          .eq('stage', stage);
        
        if (error) {
          console.error(`Erro ao contar ${stage}:`, error);
          return { stage, count: 0 };
        }
        
        return { stage, count: count || 0 };
      });
      
      const results = await Promise.all(countPromises);
      
      results.forEach(({ stage, count }) => {
        counts[stage] = count;
        console.log(`📈 ${stage}: ${count} candidatos`);
      });
      
      setTerminalCounts(counts);
    } catch (error) {
      console.error('Erro ao carregar contadores:', error);
    }
  }, []);

  // Carregar candidatos de coluna terminal (lazy loading)
  const loadMoreFromTerminalColumn = useCallback(async (stage: CandidateStage, pageSize: number = TERMINAL_PAGE_SIZE): Promise<boolean> => {
    if (!isTerminalStage(stage)) {
      console.warn('loadMoreFromTerminalColumn chamado para coluna não-terminal:', stage);
      return false;
    }

    const currentOffset = terminalOffsets[stage] || 0;
    
    console.log(`📥 Carregando mais candidatos de ${stage} (offset: ${currentOffset}, pageSize: ${pageSize})...`);
    
    setTerminalLoadingStates(prev => ({ ...prev, [stage]: 'loading' }));

    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('stage', stage)
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + pageSize - 1);

      if (error) {
        console.error(`Erro ao carregar ${stage}:`, error);
        setTerminalLoadingStates(prev => ({ ...prev, [stage]: 'error' }));
        return false;
      }

      if (data) {
        const transformedCandidates = data.map(transformCandidate);
        
        setTerminalCandidates(prev => {
          const current = prev.get(stage) || [];
          // Evitar duplicatas
          const existingIds = new Set(current.map(c => c.id));
          const newCandidates = transformedCandidates.filter(c => !existingIds.has(c.id));
          const updated = new Map(prev);
          updated.set(stage, [...current, ...newCandidates]);
          return updated;
        });
        
        setTerminalOffsets(prev => ({ ...prev, [stage]: currentOffset + data.length }));
        setTerminalLoadingStates(prev => ({ ...prev, [stage]: 'loaded' }));
        
        console.log(`✅ ${stage}: ${data.length} candidatos carregados (total carregado: ${currentOffset + data.length})`);
        
        // Retorna true se há mais dados para carregar
        return data.length === pageSize;
      }
      
      setTerminalLoadingStates(prev => ({ ...prev, [stage]: 'loaded' }));
      return false;
    } catch (error) {
      console.error(`Erro ao carregar ${stage}:`, error);
      setTerminalLoadingStates(prev => ({ ...prev, [stage]: 'error' }));
      return false;
    }
  }, [isTerminalStage, terminalOffsets]);

  // Verificar se há mais candidatos para carregar em coluna terminal
  const hasMoreInTerminal = useCallback((stage: CandidateStage): boolean => {
    if (!isTerminalStage(stage)) return false;
    const loaded = terminalCandidates.get(stage)?.length || 0;
    const total = terminalCounts[stage] || 0;
    return loaded < total;
  }, [isTerminalStage, terminalCandidates, terminalCounts]);

  // Carregar candidatos iniciais (apenas colunas ativas + contadores terminais)
  useEffect(() => {
    const loadCandidates = async () => {
      try {
        console.log('🔄 Carregando candidatos ativos do Supabase...');
        
        // 1. Carregar candidatos de colunas ATIVAS usando paginação iterativa
        const activeData = await fetchAllPaginated(
          (query) => query.not('stage', 'in', `(${TERMINAL_STAGES.join(',')})`)
        );
        
        console.log('📊 Total de candidatos ATIVOS carregados:', activeData.length);
        
        // Log de candidatos por stage
        const stageCount = activeData.reduce((acc: any, c: any) => {
          acc[c.stage] = (acc[c.stage] || 0) + 1;
          return acc;
        }, {});
        console.log('📋 Candidatos ativos por stage:', stageCount);
        
        // Transformar candidatos
        const transformedCandidates = activeData.map(transformCandidate);
        
        // Log de candidatos com entrevistas
        transformedCandidates.forEach((candidate) => {
          if (candidate.interviews && candidate.interviews.length > 0) {
            console.log(`📅 ${candidate.name} tem ${candidate.interviews.length} entrevista(s)`);
          }
        });
        
        setCandidates(transformedCandidates);
        
        // 2. Carregar contadores das colunas terminais
        await loadTerminalCounts();
        
        // 3. Aplicar automação IA para candidatos que já têm análise
        transformedCandidates.forEach(candidate => {
          if (candidate.stage === 'analise_ia' && candidate.aiAnalysis) {
            console.log('🤖 Aplicando automação para candidato carregado:', candidate.name);
            checkAndApplyAIAutomation(candidate);
          }
        });
        
      } catch (error) {
        console.error('Error loading candidates:', error);
        setCandidates(mockCandidates);
      } finally {
        setLoading(false);
      }
    };

    loadCandidates();
  }, [loadTerminalCounts]);

  // Realtime subscription
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
          const transformedCandidate = transformCandidate(newCandidate);
          
          if (isTerminalStage(transformedCandidate.stage)) {
            // Incrementar contador da coluna terminal
            setTerminalCounts(prev => ({
              ...prev,
              [transformedCandidate.stage]: (prev[transformedCandidate.stage] || 0) + 1
            }));
            
            // Se a coluna já foi carregada, adicionar o candidato
            setTerminalCandidates(prev => {
              if (prev.has(transformedCandidate.stage)) {
                const updated = new Map(prev);
                const current = updated.get(transformedCandidate.stage) || [];
                updated.set(transformedCandidate.stage, [transformedCandidate, ...current]);
                return updated;
              }
              return prev;
            });
          } else {
            // Adicionar a candidatos ativos
            setCandidates(prev => [transformedCandidate, ...prev]);
            
            // Aplicar automação IA se necessário
            if (transformedCandidate.stage === 'analise_ia' && transformedCandidate.aiAnalysis) {
              console.log('🤖 Aplicando automação para novo candidato:', transformedCandidate.name);
              checkAndApplyAIAutomation(transformedCandidate);
            }
          }
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
          const updatedData = payload.new as any;
          const oldData = payload.old as any;
          const transformedCandidate = transformCandidate(updatedData);
          
          const newStage = transformedCandidate.stage;
          const oldStage = oldData?.stage as CandidateStage | undefined;
          
          const newIsTerminal = isTerminalStage(newStage);
          const oldIsTerminal = oldStage ? isTerminalStage(oldStage) : false;
          
          // Caso 1: Moveu DE ativo PARA terminal
          if (!oldIsTerminal && newIsTerminal) {
            // Remover de candidatos ativos
            setCandidates(prev => prev.filter(c => c.id !== transformedCandidate.id));
            
            // Incrementar contador da coluna terminal
            setTerminalCounts(prev => ({
              ...prev,
              [newStage]: (prev[newStage] || 0) + 1
            }));
            
            // Adicionar à coluna terminal se já carregada
            setTerminalCandidates(prev => {
              if (prev.has(newStage)) {
                const updated = new Map(prev);
                const current = updated.get(newStage) || [];
                if (!current.find(c => c.id === transformedCandidate.id)) {
                  updated.set(newStage, [transformedCandidate, ...current]);
                }
                return updated;
              }
              return prev;
            });
          }
          // Caso 2: Moveu DE terminal PARA ativo
          else if (oldIsTerminal && !newIsTerminal) {
            // Decrementar contador da coluna terminal antiga
            if (oldStage) {
              setTerminalCounts(prev => ({
                ...prev,
                [oldStage]: Math.max(0, (prev[oldStage] || 0) - 1)
              }));
              
              // Remover da coluna terminal se carregada
              setTerminalCandidates(prev => {
                if (prev.has(oldStage)) {
                  const updated = new Map(prev);
                  const current = updated.get(oldStage) || [];
                  updated.set(oldStage, current.filter(c => c.id !== transformedCandidate.id));
                  return updated;
                }
                return prev;
              });
            }
            
            // Adicionar a candidatos ativos
            setCandidates(prev => {
              if (!prev.find(c => c.id === transformedCandidate.id)) {
                return [transformedCandidate, ...prev];
              }
              return prev.map(c => c.id === transformedCandidate.id ? transformedCandidate : c);
            });
            
            // Aplicar automação IA se necessário
            if (newStage === 'analise_ia' && transformedCandidate.aiAnalysis) {
              console.log('🤖 Aplicando automação para candidato atualizado:', transformedCandidate.name);
              checkAndApplyAIAutomation(transformedCandidate);
            }
          }
          // Caso 3: Moveu ENTRE terminais
          else if (oldIsTerminal && newIsTerminal && oldStage !== newStage) {
            // Decrementar contador antigo
            if (oldStage) {
              setTerminalCounts(prev => ({
                ...prev,
                [oldStage]: Math.max(0, (prev[oldStage] || 0) - 1)
              }));
              
              // Remover da coluna terminal antiga se carregada
              setTerminalCandidates(prev => {
                if (prev.has(oldStage)) {
                  const updated = new Map(prev);
                  const current = updated.get(oldStage) || [];
                  updated.set(oldStage, current.filter(c => c.id !== transformedCandidate.id));
                  return updated;
                }
                return prev;
              });
            }
            
            // Incrementar contador novo
            setTerminalCounts(prev => ({
              ...prev,
              [newStage]: (prev[newStage] || 0) + 1
            }));
            
            // Adicionar à coluna terminal nova se carregada
            setTerminalCandidates(prev => {
              if (prev.has(newStage)) {
                const updated = new Map(prev);
                const current = updated.get(newStage) || [];
                if (!current.find(c => c.id === transformedCandidate.id)) {
                  updated.set(newStage, [transformedCandidate, ...current]);
                }
                return updated;
              }
              return prev;
            });
          }
          // Caso 4: Atualização dentro de coluna ativa (sem mudança de stage terminal)
          else if (!newIsTerminal) {
            setCandidates(prev => prev.map(candidate => 
              candidate.id === transformedCandidate.id ? transformedCandidate : candidate
            ));
            
            // Aplicar automação IA se necessário
            if (newStage === 'analise_ia' && transformedCandidate.aiAnalysis) {
              console.log('🤖 Aplicando automação para candidato atualizado:', transformedCandidate.name);
              checkAndApplyAIAutomation(transformedCandidate);
            }
          }
          // Caso 5: Atualização dentro de coluna terminal (sem mudança de stage)
          else {
            setTerminalCandidates(prev => {
              if (prev.has(newStage)) {
                const updated = new Map(prev);
                const current = updated.get(newStage) || [];
                updated.set(newStage, current.map(c => 
                  c.id === transformedCandidate.id ? transformedCandidate : c
                ));
                return updated;
              }
              return prev;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'candidates'
        },
        (payload) => {
          console.log('🗑️ Candidato removido via realtime:', payload.old);
          const deletedCandidate = payload.old as any;
          const stage = deletedCandidate.stage as CandidateStage;
          
          if (isTerminalStage(stage)) {
            // Decrementar contador
            setTerminalCounts(prev => ({
              ...prev,
              [stage]: Math.max(0, (prev[stage] || 0) - 1)
            }));
            
            // Remover da coluna terminal se carregada
            setTerminalCandidates(prev => {
              if (prev.has(stage)) {
                const updated = new Map(prev);
                const current = updated.get(stage) || [];
                updated.set(stage, current.filter(c => c.id !== deletedCandidate.id));
                return updated;
              }
              return prev;
            });
          } else {
            setCandidates(prev => prev.filter(c => c.id !== deletedCandidate.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isTerminalStage]);

  // Gerar colunas do Kanban
  const columns = useMemo(() => {
    // Combinar candidatos ativos + candidatos terminais carregados
    const allCandidates = [
      ...candidates,
      ...Array.from(terminalCandidates.values()).flat()
    ];
    
    const candidatesByStage = allCandidates.reduce((acc, candidate) => {
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
          
          if (nextInterviewA && nextInterviewB) {
            return new Date(nextInterviewA.scheduledAt).getTime() - new Date(nextInterviewB.scheduledAt).getTime();
          }
          
          if (nextInterviewA && !nextInterviewB) return -1;
          if (!nextInterviewA && nextInterviewB) return 1;
          
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      }
      
      return {
        ...column,
        candidates: sortedCandidates
      };
    });
  }, [candidates, terminalCandidates]);

  const moveCandidateToStage = async (candidateId: string, newStage: CandidateStage, rejectionReason?: string, talentPoolReason?: string) => {
    // Encontrar candidato em qualquer lugar (ativos ou terminais)
    let candidateToMove = candidates.find(c => c.id === candidateId);
    let oldStage: CandidateStage | undefined;
    
    if (candidateToMove) {
      oldStage = candidateToMove.stage;
    } else {
      // Procurar nas colunas terminais
      for (const [stage, stageCandidates] of terminalCandidates.entries()) {
        const found = stageCandidates.find(c => c.id === candidateId);
        if (found) {
          candidateToMove = found;
          oldStage = stage;
          break;
        }
      }
    }
    
    if (!candidateToMove || !oldStage) {
      console.error('Candidato não encontrado:', candidateId);
      return;
    }
    
    const updatedCandidate: Candidate = {
      ...candidateToMove,
      stage: newStage,
      rejectionReason: newStage === 'nao_aprovado' ? rejectionReason : undefined,
      talentPoolReason: newStage === 'banco_talentos' ? talentPoolReason : undefined,
      updatedAt: new Date()
    };
    
    const oldIsTerminal = isTerminalStage(oldStage);
    const newIsTerminal = isTerminalStage(newStage);
    
    // Atualização otimista do estado local
    if (!oldIsTerminal && !newIsTerminal) {
      // Ativo -> Ativo
      setCandidates(prev => prev.map(c => c.id === candidateId ? updatedCandidate : c));
    } else if (!oldIsTerminal && newIsTerminal) {
      // Ativo -> Terminal
      setCandidates(prev => prev.filter(c => c.id !== candidateId));
      setTerminalCounts(prev => ({ ...prev, [newStage]: (prev[newStage] || 0) + 1 }));
      setTerminalCandidates(prev => {
        if (prev.has(newStage)) {
          const updated = new Map(prev);
          updated.set(newStage, [updatedCandidate, ...(updated.get(newStage) || [])]);
          return updated;
        }
        return prev;
      });
    } else if (oldIsTerminal && !newIsTerminal) {
      // Terminal -> Ativo
      setTerminalCounts(prev => ({ ...prev, [oldStage]: Math.max(0, (prev[oldStage] || 0) - 1) }));
      setTerminalCandidates(prev => {
        if (prev.has(oldStage)) {
          const updated = new Map(prev);
          updated.set(oldStage, (updated.get(oldStage) || []).filter(c => c.id !== candidateId));
          return updated;
        }
        return prev;
      });
      setCandidates(prev => [updatedCandidate, ...prev]);
    } else {
      // Terminal -> Terminal (mesma ou diferente)
      if (oldStage !== newStage) {
        setTerminalCounts(prev => ({
          ...prev,
          [oldStage]: Math.max(0, (prev[oldStage] || 0) - 1),
          [newStage]: (prev[newStage] || 0) + 1
        }));
      }
      setTerminalCandidates(prev => {
        const updated = new Map(prev);
        if (updated.has(oldStage)) {
          updated.set(oldStage, (updated.get(oldStage) || []).filter(c => c.id !== candidateId));
        }
        if (updated.has(newStage)) {
          updated.set(newStage, [updatedCandidate, ...(updated.get(newStage) || [])]);
        }
        return updated;
      });
    }

    // Atualizar no Supabase
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
      // TODO: Rollback otimista em caso de erro
    }
  };

  const updateCandidate = (updatedCandidate: Candidate) => {
    if (isTerminalStage(updatedCandidate.stage)) {
      setTerminalCandidates(prev => {
        if (prev.has(updatedCandidate.stage)) {
          const updated = new Map(prev);
          const current = updated.get(updatedCandidate.stage) || [];
          updated.set(updatedCandidate.stage, current.map(c => 
            c.id === updatedCandidate.id ? updatedCandidate : c
          ));
          return updated;
        }
        return prev;
      });
    } else {
      setCandidates(prev => prev.map(candidate => 
        candidate.id === updatedCandidate.id ? updatedCandidate : candidate
      ));
    }
    
    // Check for AI automation AFTER updating the candidate
    checkAndApplyAIAutomation(updatedCandidate);
  };

  const checkAndApplyAIAutomation = (candidate: Candidate) => {
    // Only apply automation for candidates in 'analise_ia' stage with AI analysis
    if (candidate.stage === 'analise_ia' && candidate.aiAnalysis) {
      const score = candidate.aiAnalysis.score;
      
      console.log('🤖 Automação IA - Candidato:', candidate.name, 'Nota:', score, 'Stage:', candidate.stage);
      
      setTimeout(() => {
        if (score >= 6.5) {
          console.log('✅ Auto-aprovando candidato com nota >= 6.5');
          moveCandidateToStage(candidate.id, 'selecao_pre_entrevista');
        } else {
          console.log('❌ Auto-reprovando candidato com nota < 6.5');
          moveCandidateToStage(candidate.id, 'nao_aprovado', 'Pontuação IA abaixo do mínimo (6.5)');
        }
      }, 1000);
    }
  };

  const addCandidate = (newCandidate: Candidate) => {
    if (isTerminalStage(newCandidate.stage)) {
      setTerminalCounts(prev => ({
        ...prev,
        [newCandidate.stage]: (prev[newCandidate.stage] || 0) + 1
      }));
      setTerminalCandidates(prev => {
        if (prev.has(newCandidate.stage)) {
          const updated = new Map(prev);
          updated.set(newCandidate.stage, [newCandidate, ...(updated.get(newCandidate.stage) || [])]);
          return updated;
        }
        return prev;
      });
    } else {
      setCandidates(prev => [...prev, newCandidate]);
    }
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

      // Remover de candidatos ativos
      setCandidates(prev => prev.filter(candidate => candidate.id !== candidateId));
      
      // Também tentar remover de terminais
      setTerminalCandidates(prev => {
        const updated = new Map(prev);
        for (const [stage, stageCandidates] of updated.entries()) {
          const candidate = stageCandidates.find(c => c.id === candidateId);
          if (candidate) {
            updated.set(stage, stageCandidates.filter(c => c.id !== candidateId));
            // Decrementar contador
            setTerminalCounts(prevCounts => ({
              ...prevCounts,
              [stage]: Math.max(0, (prevCounts[stage] || 0) - 1)
            }));
            break;
          }
        }
        return updated;
      });
    } catch (error) {
      console.error('Error deleting candidate:', error);
      throw error;
    }
  };

  const getStats = () => {
    // Incluir todos os candidatos (ativos + terminais loaded + terminais counts)
    const activeCandidatesCount = candidates.length;
    const terminalLoadedCount = Array.from(terminalCandidates.values()).reduce((acc, arr) => acc + arr.length, 0);
    
    // Total real inclui contadores de terminais (não apenas os carregados)
    const terminalTotalCount = Object.values(terminalCounts).reduce((acc, count) => acc + count, 0);
    const total = activeCandidatesCount + terminalTotalCount;
    
    // By stage combina ativos + contadores terminais
    const byStage: Record<CandidateStage, number> = {} as Record<CandidateStage, number>;
    
    // Contar candidatos ativos por stage
    candidates.forEach(candidate => {
      byStage[candidate.stage] = (byStage[candidate.stage] || 0) + 1;
    });
    
    // Adicionar contadores das colunas terminais
    TERMINAL_STAGES.forEach(stage => {
      byStage[stage] = terminalCounts[stage] || 0;
    });

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
    stats: getStats(),
    // Novos exports para lazy loading
    terminalCounts,
    terminalLoadingStates,
    loadMoreFromTerminalColumn,
    hasMoreInTerminal,
    isTerminalStage
  };
}
