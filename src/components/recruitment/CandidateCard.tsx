import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { CalendarDays, Mail, Phone, Star, Clock, MessageSquare, Check, X, User } from 'lucide-react';
import { Candidate, CandidateStage } from '@/types/recruitment';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RejectionReasonModal } from './RejectionReasonModal';
import { useState } from 'react';

interface CandidateCardProps {
  candidate: Candidate;
  onClick: () => void;
  isDragging?: boolean;
  onStageChange?: (candidateId: string, newStage: CandidateStage, rejectionReason?: string) => void;
  isCompactView?: boolean;
}

export function CandidateCard({ candidate, onClick, isDragging, onStageChange, isCompactView = false }: CandidateCardProps) {
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-success bg-success/10';
    if (score >= 6.5) return 'text-warning bg-warning/10';
    return 'text-destructive bg-destructive/10';
  };

  const getSourceBadge = (source: string) => {
    const sourceMap = {
      indeed: { label: 'Indeed', variant: 'default' as const },
      manual: { label: 'Manual', variant: 'secondary' as const },
      referral: { label: 'Indicação', variant: 'outline' as const }
    };
    return sourceMap[source as keyof typeof sourceMap] || { label: source, variant: 'default' as const };
  };

  const sourceBadge = getSourceBadge(candidate.source);

  const getStageColors = (stage: CandidateStage) => {
    switch (stage) {
      case 'nova_candidatura':
        return {
          bg: 'bg-status-new',
          border: 'border-status-new-border',
          text: 'text-status-new-border'
        };
      case 'analise_ia':
        return {
          bg: 'bg-status-analysis',
          border: 'border-status-analysis-border',
          text: 'text-status-analysis-border'
        };
      case 'selecao_pre_entrevista':
      case 'pre_entrevista':
        return {
          bg: 'bg-status-pre-interview',
          border: 'border-status-pre-interview-border',
          text: 'text-status-pre-interview-border'
        };
      case 'selecao_entrevista_presencial':
      case 'entrevista_presencial':
        return {
          bg: 'bg-status-interview',
          border: 'border-status-interview-border',
          text: 'text-status-interview-border'
        };
      case 'aprovado':
        return {
          bg: 'bg-status-approved',
          border: 'border-status-approved-border',
          text: 'text-status-approved-border'
        };
      case 'nao_aprovado':
        return {
          bg: 'bg-status-rejected',
          border: 'border-status-rejected-border',
          text: 'text-status-rejected-border'
        };
      default:
        return {
          bg: 'bg-muted',
          border: 'border-muted',
          text: 'text-muted-foreground'
        };
    }
  };

  const stageColors = getStageColors(candidate.stage);

  const getNextStage = (currentStage: CandidateStage): CandidateStage | null => {
    switch (currentStage) {
      case 'analise_ia':
        return 'selecao_pre_entrevista';
      case 'pre_entrevista':
        return 'selecao_entrevista_presencial';
      case 'entrevista_presencial':
        return 'aprovado';
      default:
        return null;
    }
  };

  const canShowActionButtons = ['analise_ia', 'pre_entrevista', 'entrevista_presencial'].includes(candidate.stage);

  // Get interview status for visual indicators
  const getInterviewStatus = () => {
    if (candidate.interviews.length === 0) return null;
    const latestInterview = candidate.interviews[candidate.interviews.length - 1];
    return { status: latestInterview.status, interview: latestInterview };
  };

  const getStatusIcon = () => {
    const interviewInfo = getInterviewStatus();
    if (!interviewInfo) return null;
    
    const { status, interview } = interviewInfo;
    
    switch (status) {
      case 'scheduled':
        const scheduledDate = new Date(interview.scheduledAt);
        const dateStr = format(scheduledDate, 'dd/MM', { locale: ptBR });
        const timeStr = format(scheduledDate, 'HH:mm', { locale: ptBR });
        const fullDateStr = format(scheduledDate, 'dd/MM/yyyy \'às\' HH:mm', { locale: ptBR });
        
        return { 
          icon: '⏰', 
          label: `${dateStr} ${timeStr}`, 
          color: 'text-warning',
          fullDate: fullDateStr,
          interview: interview
        };
      case 'completed':
        return { icon: '✅', label: 'Realizada', color: 'text-success' };
      case 'no_show':
        return { icon: '⚠️', label: 'Faltou', color: 'text-destructive' };
      case 'cancelled':
        return { icon: '❌', label: 'Cancelada', color: 'text-muted-foreground' };
      default:
        return null;
    }
  };

  const statusIcon = getStatusIcon();

  const handleApprove = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStage = getNextStage(candidate.stage);
    if (nextStage && onStageChange) {
      onStageChange(candidate.id, nextStage);
    }
  };

  const handleReject = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowRejectionModal(true);
  };

  const handleRejectConfirm = (reason: string) => {
    if (onStageChange) {
      onStageChange(candidate.id, 'nao_aprovado', reason);
    }
  };

  return (
    <TooltipProvider>
      <Card 
        className={cn(
          "cursor-pointer transition-all duration-200 border-l-4",
          "hover:shadow-md hover:scale-[1.02]",
          stageColors.bg,
          stageColors.border,
          isDragging && "shadow-lg ring-2 ring-primary/20",
          isCompactView ? "p-3" : "p-4"
        )}
        onClick={onClick}
      >
        <div className={cn(isCompactView ? "space-y-2" : "space-y-3")}>
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Avatar className={cn(isCompactView ? "h-8 w-8" : "h-10 w-10")}>
                <AvatarFallback className={cn("font-semibold", stageColors.text, stageColors.bg)}>
                  {candidate.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h4 className={cn(
                      "font-semibold text-foreground truncate",
                      isCompactView ? "text-sm" : "text-base"
                    )}>
                      {candidate.name}
                    </h4>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {candidate.name}
                    </div>
                  </TooltipContent>
                </Tooltip>
                
                {!isCompactView && (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge {...sourceBadge} className="text-xs">
                      {sourceBadge.label}
                    </Badge>
                    {candidate.aiAnalysis && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                            getScoreColor(candidate.aiAnalysis.score)
                          )}>
                            <Star className="h-3 w-3" />
                            {candidate.aiAnalysis.score.toFixed(1)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div>
                            <div className="font-medium">Pontuação IA: {candidate.aiAnalysis.score}/10</div>
                            <div className="text-xs text-muted-foreground">
                              {candidate.aiAnalysis.recommendation === 'advance' && 'Recomendado avançar'}
                              {candidate.aiAnalysis.recommendation === 'review' && 'Necessita revisão'}
                              {candidate.aiAnalysis.recommendation === 'reject' && 'Não recomendado'}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Compact view - show AI score on the right */}
            {isCompactView && candidate.aiAnalysis && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ml-2",
                    getScoreColor(candidate.aiAnalysis.score)
                  )}>
                    <Star className="h-3 w-3" />
                    {candidate.aiAnalysis.score.toFixed(1)}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div>
                    <div className="font-medium">Pontuação IA: {candidate.aiAnalysis.score}/10</div>
                    <div className="text-xs text-muted-foreground">
                      {candidate.aiAnalysis.recommendation === 'advance' && 'Recomendado avançar'}
                      {candidate.aiAnalysis.recommendation === 'review' && 'Necessita revisão'}
                      {candidate.aiAnalysis.recommendation === 'reject' && 'Não recomendado'}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Contact Info */}
          <div className={cn("space-y-1", isCompactView ? "text-xs" : "text-sm")}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <Mail className={cn(isCompactView ? "h-3 w-3" : "h-4 w-4")} />
                  <span className="truncate font-normal">{candidate.email}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div>Enviar email para {candidate.email}</div>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <Phone className={cn(isCompactView ? "h-3 w-3" : "h-4 w-4")} />
                  <span className="font-normal">{candidate.phone}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div>Ligar para {candidate.phone}</div>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Rejection Reason for rejected candidates */}
          {candidate.stage === 'nao_aprovado' && candidate.rejectionReason && !isCompactView && (
            <div className="p-2 bg-destructive/10 rounded-md border border-destructive/20">
              <div className="text-xs font-semibold text-destructive mb-1">Motivo da Rejeição:</div>
              <div className="text-xs text-muted-foreground font-normal">
                {candidate.rejectionReason}
              </div>
            </div>
          )}

          {/* AI Analysis Summary - Only in expanded view */}
          {candidate.aiAnalysis && !isCompactView && (
            <div className="p-2 bg-secondary/30 rounded-md">
              <div className="text-xs font-semibold text-foreground mb-1">Análise IA:</div>
              <div className="text-xs text-muted-foreground font-normal">
                {candidate.aiAnalysis.recommendation === 'advance' && (
                  <span className="text-success font-medium">✓ Recomendado para próxima etapa</span>
                )}
                {candidate.aiAnalysis.recommendation === 'review' && (
                  <span className="text-warning font-medium">⚠ Necessita revisão</span>
                )}
                {candidate.aiAnalysis.recommendation === 'reject' && (
                  <span className="text-destructive font-medium">✗ Não recomendado</span>
                )}
              </div>
              {candidate.aiAnalysis.pontoFortes.length > 0 && (
                <div className="text-xs text-muted-foreground mt-1 font-normal">
                  <strong>Destaque:</strong> {candidate.aiAnalysis.pontoFortes[0]}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {canShowActionButtons && !isCompactView && (
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleApprove}
                    className="flex-1 h-8 text-xs font-medium"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Aprovar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div>Avançar para próxima etapa</div>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleReject}
                    className="flex-1 h-8 text-xs font-medium"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Reprovar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div>Rejeitar candidato</div>
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-pointer">
                  <Clock className="h-3 w-3" />
                  <span className="font-normal">{format(candidate.createdAt, 'dd/MM', { locale: ptBR })}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div>Criado em {format(candidate.createdAt, 'dd/MM/yyyy', { locale: ptBR })}</div>
              </TooltipContent>
            </Tooltip>
            
            <div className="flex items-center gap-2">
              {statusIcon && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn("flex items-center gap-1 cursor-pointer", statusIcon.color)}>
                      <span className="text-xs">{statusIcon.icon}</span>
                      {!isCompactView && <span className="text-xs font-medium">{statusIcon.label}</span>}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div>
                      {statusIcon.fullDate ? (
                        <div>
                          <div className="font-medium">Entrevista agendada</div>
                          <div>{statusIcon.fullDate}</div>
                          {statusIcon.interview?.type && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {statusIcon.interview.type === 'in_person' ? 'Entrevista Presencial' : 'Pré-entrevista Online'}
                            </div>
                          )}
                        </div>
                      ) : (
                        `Status da entrevista: ${statusIcon.label}`
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
              
              {candidate.notes.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors">
                      <MessageSquare className="h-3 w-3" />
                      <span className="font-medium">{candidate.notes.length}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div>{candidate.notes.length} nota(s) registrada(s)</div>
                  </TooltipContent>
                </Tooltip>
              )}
              
              {candidate.interviews.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors">
                      <CalendarDays className="h-3 w-3" />
                      <span className="font-medium">{candidate.interviews.length}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div>{candidate.interviews.length} entrevista(s) agendada(s)</div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
        
        <RejectionReasonModal
          isOpen={showRejectionModal}
          onClose={() => setShowRejectionModal(false)}
          onConfirm={handleRejectConfirm}
          candidateName={candidate.name}
        />
      </Card>
    </TooltipProvider>
  );
}