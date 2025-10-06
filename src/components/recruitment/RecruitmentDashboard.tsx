import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Users, TrendingUp, Clock, CheckCircle, XCircle, AlertTriangle, Settings } from 'lucide-react';
import { GoogleCredentialsTest } from './GoogleCredentialsTest';
import { TestGoogleCredentials } from './TestGoogleCredentials';
import { GoogleCredentialsForm } from './GoogleCredentialsForm';
import { GoogleCredentialsSetup } from './GoogleCredentialsSetup';
import { GoogleTokenStatus } from './GoogleTokenStatus';

interface DashboardStats {
  total: number;
  byStage: Record<string, number>;
  approved: number;
  rejected: number;
  inProcess: number;
  conversionRate: number;
}

interface RecruitmentDashboardProps {
  stats: DashboardStats;
}

export function RecruitmentDashboard({ stats }: RecruitmentDashboardProps) {
  const metrics = [
    {
      title: 'Total de Candidatos',
      value: stats.total,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      title: 'Em Processo',
      value: stats.inProcess,
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    },
    {
      title: 'Aprovados',
      value: stats.approved,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    {
      title: 'Taxa de Conversão',
      value: `${stats.conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    }
  ];

  const stageLabels = {
    nova_candidatura: 'Novas Candidaturas',
    criterios_definidos: 'Critérios Definidos',
    analise_ia: 'Análise IA',
    selecao_pre_entrevista: 'Seleção Pré Entrevista',
    pre_entrevista: 'Pré-entrevista',
    selecao_entrevista_presencial: 'Seleção Entrevista Presencial',
    entrevista_presencial: 'Entrevista Presencial',
    decisao_selecao: 'Decisão',
    aprovacao_final: 'Aprovados',
    standby: 'Standby',
    reprovado: 'Não Selecionados'
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title}>
              <CardContent className="flex flex-col sm:flex-row sm:items-center p-3 sm:p-6 gap-2 sm:gap-0">
                <div className={`${metric.bgColor} p-2 sm:p-3 rounded-lg sm:mr-4 self-start`}>
                  <Icon className={`h-4 w-4 sm:h-6 sm:w-6 ${metric.color}`} />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">{metric.title}</p>
                  <p className="text-lg sm:text-2xl font-bold">{metric.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Google Token Status */}
      <GoogleTokenStatus />

      {/* Stage Distribution */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
            Distribuição por Etapa
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {Object.entries(stats.byStage)
              .filter(([_, count]) => count > 0)
              .map(([stage, count]) => (
                <div key={stage} className="text-center p-2 sm:p-0">
                  <div className="text-xl sm:text-2xl font-bold text-primary">{count}</div>
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {stageLabels[stage as keyof typeof stageLabels] || stage}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2 flex-wrap p-4 sm:p-6 pt-0">
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary">
            Importar Currículos Indeed
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary">
            Executar Análise IA
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary">
            Agendar Entrevistas
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary">
            Enviar E-mails Automáticos
          </Badge>
          
          <Dialog>
            <DialogTrigger asChild>
              <Badge variant="outline" className="cursor-pointer hover:bg-secondary flex items-center gap-1">
                <Settings className="w-3 h-3" />
                Diagnóstico Google
              </Badge>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <div className="space-y-6">
                <GoogleCredentialsSetup />
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}