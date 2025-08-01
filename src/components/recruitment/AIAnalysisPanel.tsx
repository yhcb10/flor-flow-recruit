import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Brain, Sparkles, Target, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { JobPosition } from '@/types/recruitment';

interface AIAnalysisPanelProps {
  selectedPosition?: JobPosition;
}

export function AIAnalysisPanel({ selectedPosition }: AIAnalysisPanelProps) {
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

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    
    // Simula processamento IA
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setIsAnalyzing(false);
    toast({
      title: "Análise Concluída",
      description: "3 candidatos foram analisados com sucesso.",
    });
  };

  const analysisStatus = {
    total: 5,
    analyzed: 3,
    pending: 2,
    avgScore: 7.6
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
            {[
              { name: "Maria Silva", score: 8.5, recommendation: "advance", time: "2 min atrás" },
              { name: "João Santos", score: 7.2, recommendation: "review", time: "5 min atrás" },
              { name: "Ana Paula Costa", score: 9.1, recommendation: "advance", time: "8 min atrás" }
            ].map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">
                      {result.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-sm">{result.name}</div>
                    <div className="text-xs text-muted-foreground">{result.time}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="text-lg font-bold text-primary">{result.score}</div>
                  <Badge variant={
                    result.recommendation === 'advance' ? 'default' :
                    result.recommendation === 'review' ? 'secondary' : 'destructive'
                  }>
                    {result.recommendation === 'advance' ? 'Avançar' :
                     result.recommendation === 'review' ? 'Revisar' : 'Rejeitar'}
                  </Badge>
                </div>
              </div>
            ))}
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