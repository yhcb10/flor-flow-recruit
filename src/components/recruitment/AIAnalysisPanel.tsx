import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Brain, Sparkles, Target, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { JobPosition, Candidate } from '@/types/recruitment';

interface AIAnalysisPanelProps {
  selectedPosition?: JobPosition;
  candidates: Candidate[];
  onCandidateUpdate: (candidate: Candidate) => void;
}

export function AIAnalysisPanel({ selectedPosition, candidates, onCandidateUpdate }: AIAnalysisPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisPrompt, setAnalysisPrompt] = useState(
    selectedPosition?.aiAnalysisPrompt || 
    `Analise este currículo com base nos critérios da vaga.

Para cada critério, avalie de 0 a 10 e forneça:
- Pontuação final (0-10)
- 3 principais pontos fortes
- 2 principais pontos de atenção
- Recomendação: Avançar, Revisar ou Rejeitar
- Justificativa detalhada

Mantenha tom respeitoso e profissional.`
  );
  
  useEffect(() => {
    if (selectedPosition?.aiAnalysisPrompt) {
      setAnalysisPrompt(selectedPosition.aiAnalysisPrompt);
    }
  }, [selectedPosition]);
  
  const { toast } = useToast();

  // Filtrar candidatos na fase de análise IA
  const pendingAnalysis = candidates.filter(c => c.stage === 'analise_ia');
  const analyzedCandidates = candidates.filter(c => c.aiAnalysis);
  
  const handleRunAnalysis = async () => {
    if (!selectedPosition?.aiAnalysisPrompt) {
      toast({
        title: "Erro",
        description: "Prompt de análise não configurado para esta vaga.",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    
    try {
      let analyzed = 0;
      
      for (const candidate of pendingAnalysis) {
        console.log(`Analisando candidato: ${candidate.name}`);
        
        if (!candidate.resumeText) {
          console.warn(`Candidato ${candidate.name} não tem texto do currículo`);
          continue;
        }

        try {
          const { data, error } = await supabase.functions.invoke('analyze-candidate', {
            body: {
              resumeText: candidate.resumeText,
              analysisPrompt: selectedPosition.aiAnalysisPrompt,
              candidateName: candidate.name
            }
          });

          if (error) {
            console.error(`Erro ao analisar ${candidate.name}:`, error);
            continue;
          }

          // Atualizar o candidato com a análise
          const updatedCandidate = {
            ...candidate,
            aiAnalysis: {
              score: data.score,
              experienciaProfissional: data.experienciaProfissional,
              habilidadesTecnicas: data.habilidadesTecnicas,
              competenciasComportamentais: data.competenciasComportamentais,
              formacaoAcademica: data.formacaoAcademica,
              diferenciaisRelevantes: data.diferenciaisRelevantes,
              recommendation: data.recommendation as 'advance' | 'reject' | 'review',
              pontoFortes: data.pontoFortes,
              pontosAtencao: data.pontosAtencao,
              reasoning: data.reasoning,
              recomendacaoFinal: data.recomendacaoFinal as 'aprovado' | 'nao_recomendado',
              analyzedAt: new Date(data.analyzedAt)
            }
          };

          onCandidateUpdate(updatedCandidate);
          analyzed++;
          
          // Pequena pausa entre análises
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (candidateError) {
          console.error(`Erro específico para ${candidate.name}:`, candidateError);
        }
      }
      
      setIsAnalyzing(false);
      
      if (analyzed > 0) {
        toast({
          title: "Análise Concluída",
          description: `${analyzed} candidatos foram analisados com sucesso.`,
        });
      } else {
        toast({
          title: "Nenhuma Análise Realizada",
          description: "Não foi possível analisar nenhum candidato. Verifique se há candidatos com currículo na fase de análise IA.",
          variant: "destructive"
        });
      }
    } catch (error) {
      setIsAnalyzing(false);
      console.error('Erro geral na análise:', error);
      toast({
        title: "Erro na Análise",
        description: "Ocorreu um erro durante a análise dos candidatos.",
        variant: "destructive"
      });
    }
  };

  const analysisStatus = {
    total: candidates.length,
    analyzed: analyzedCandidates.length,
    pending: pendingAnalysis.length,
    avgScore: analyzedCandidates.length > 0 
      ? analyzedCandidates.reduce((acc, c) => acc + (c.aiAnalysis?.score || 0), 0) / analyzedCandidates.length
      : 0
  };

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Status da Análise IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{analysisStatus.analyzed}</div>
              <div className="text-sm text-muted-foreground">Analisados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">{analysisStatus.pending}</div>
              <div className="text-sm text-muted-foreground">Pendentes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{analysisStatus.avgScore}</div>
              <div className="text-sm text-muted-foreground">Média Geral</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{analysisStatus.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso da Análise</span>
              <span>{Math.round((analysisStatus.analyzed / analysisStatus.total) * 100)}%</span>
            </div>
            <Progress 
              value={(analysisStatus.analyzed / analysisStatus.total) * 100} 
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* AI Prompt Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Configuração da Análise
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Prompt de Análise IA
            </label>
            <Textarea
              value={analysisPrompt}
              onChange={(e) => setAnalysisPrompt(e.target.value)}
              rows={12}
              className="w-full text-sm"
              placeholder="Configure o prompt para análise IA..."
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Executar Análise IA
                </>
              )}
            </Button>
            
            <Button variant="outline" size="sm">
              Salvar Prompt
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Resultados Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analyzedCandidates.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Nenhum candidato analisado ainda
              </div>
            ) : (
              analyzedCandidates
                .sort((a, b) => new Date(b.aiAnalysis?.analyzedAt || 0).getTime() - new Date(a.aiAnalysis?.analyzedAt || 0).getTime())
                .slice(0, 5)
                .map((candidate, index) => (
                  <div key={candidate.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">
                          {candidate.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-sm">{candidate.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {candidate.aiAnalysis?.analyzedAt 
                            ? new Date(candidate.aiAnalysis.analyzedAt).toLocaleString('pt-BR')
                            : 'Há pouco'
                          }
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-bold text-primary">{candidate.aiAnalysis?.score}</div>
                      <Badge variant={
                        candidate.aiAnalysis?.recommendation === 'advance' ? 'default' :
                        candidate.aiAnalysis?.recommendation === 'review' ? 'secondary' : 'destructive'
                      }>
                        {candidate.aiAnalysis?.recommendation === 'advance' ? 'Avançar' :
                         candidate.aiAnalysis?.recommendation === 'review' ? 'Revisar' : 'Rejeitar'}
                      </Badge>
                    </div>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Status das Integrações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { service: "OpenAI GPT-4", status: "connected", description: "Análise de currículos" },
              { service: "Indeed API", status: "connected", description: "Importação de candidatos" },
              { service: "Google Calendar", status: "pending", description: "Agendamento de entrevistas" },
              { service: "Gmail SMTP", status: "connected", description: "Envio de e-mails automáticos" }
            ].map((integration, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium text-sm">{integration.service}</div>
                  <div className="text-xs text-muted-foreground">{integration.description}</div>
                </div>
                <Badge variant={integration.status === 'connected' ? 'default' : 'secondary'}>
                  {integration.status === 'connected' ? 'Conectado' : 'Pendente'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}