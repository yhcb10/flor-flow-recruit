import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

import { CalendarDays, Mail, Phone, Star, Clock, MessageSquare, Check, X, User, MessageCircle, RotateCcw } from 'lucide-react';
import { Candidate, CandidateStage } from '@/types/recruitment';
import { cn, normalizeWhatsappPhoneBR } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RejectionReasonModal } from './RejectionReasonModal';
import { TalentPoolReasonModal } from './TalentPoolReasonModal';
import { InterviewScheduler } from './InterviewScheduler';
import { InPersonInterviewScheduler } from './InPersonInterviewScheduler';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';

interface CandidateCardProps {
  candidate: Candidate;
  onClick: () => void;
  isDragging?: boolean;
  onStageChange?: (candidateId: string, newStage: CandidateStage, rejectionReason?: string, talentPoolReason?: string) => void;
  onCandidateUpdate?: (candidate: Candidate) => void;
  isCompactView?: boolean;
  selectionEnabled?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (candidateId: string) => void;
}

export function CandidateCard({
  candidate,
  onClick,
  isDragging,
  onStageChange,
  onCandidateUpdate,
  isCompactView = false,
  selectionEnabled = false,
  isSelected = false,
  onToggleSelect,
}: CandidateCardProps) {
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showTalentPoolModal, setShowTalentPoolModal] = useState(false);
  const [showInterviewScheduler, setShowInterviewScheduler] = useState(false);
  const [showInPersonScheduler, setShowInPersonScheduler] = useState(false);
  const { toast } = useToast();
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-success bg-success/10';
    if (score >= 6.5) return 'text-warning bg-warning/10';
    return 'text-destructive bg-destructive/10';
  };

  const getSourceBadge = (source: string) => {
    const normalizeSource = (value?: string) => {
      if (!value) return 'unknown';
      const val = String(value).trim().toLowerCase();
      const plain = val.normalize('NFD').replace(/\p{Diacritic}/gu, '');
      if (plain.includes('linkedin')) return 'linkedin';
      if (plain.includes('indeed')) return 'indeed';
      if (plain.includes('infojobs')) return 'infojobs';
      if (plain.includes('instagram')) return 'instagram';
      if (plain.includes('facebook')) return 'facebook';
      if (plain.includes('indicacao')) return 'referral';
      if (plain.includes('referral')) return 'referral';
      if (plain.includes('manual')) return 'manual';
      return plain;
    };

    const key = normalizeSource(source);
    const sourceMap = {
      indeed: { label: 'Indeed', variant: 'default' as const },
      linkedin: { label: 'LinkedIn', variant: 'default' as const },
      infojobs: { label: 'Infojobs', variant: 'default' as const },
      instagram: { label: 'Instagram', variant: 'secondary' as const },
      facebook: { label: 'Facebook', variant: 'secondary' as const },
      manual: { label: 'Manual', variant: 'secondary' as const },
      referral: { label: 'Indicação', variant: 'outline' as const },
    };
    return (sourceMap as Record<string, {label: string; variant: 'default' | 'secondary' | 'outline'}>)[key] || { label: source, variant: 'default' as const };
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
      case 'aguardando_feedback_pre_entrevista':
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
      case 'banco_talentos':
        return {
          bg: 'bg-status-talent-bank',
          border: 'border-status-talent-bank-border',
          text: 'text-status-talent-bank-border'
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

  const canShowActionButtons = ['analise_ia', 'pre_entrevista', 'entrevista_presencial', 'selecao_pre_entrevista', 'selecao_entrevista_presencial', 'aguardando_feedback_pre_entrevista'].includes(candidate.stage);
  const canShowTalentPoolButton = ['aprovado', 'nao_aprovado'].includes(candidate.stage);

  // Get interview status for visual indicators
  const getInterviewStatus = () => {
    if (!Array.isArray(candidate.interviews) || candidate.interviews.length === 0) return null;
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

  // Get status badge and message based on stage
  const getStatusBadge = () => {
    switch (candidate.stage) {
      case 'aprovado':
        return (
          <div className="bg-success text-success-foreground rounded-full px-2 py-1 shadow-md border border-success/20 flex items-center gap-1">
            <span className="text-sm">✅</span>
            {!isCompactView && <span className="text-xs font-medium">Aprovado</span>}
          </div>
        );
      case 'nao_aprovado':
        return (
          <div className="bg-destructive text-destructive-foreground rounded-full px-2 py-1 shadow-md border border-destructive/20 flex items-center gap-1">
            <span className="text-sm">❌</span>
            {!isCompactView && <span className="text-xs font-medium">Rejeitado</span>}
          </div>
        );
      case 'selecao_pre_entrevista':
        return (
          <div className="bg-warning text-warning-foreground rounded-full px-2 py-1 shadow-md border border-warning/20 flex items-center gap-1">
            <span className="text-sm">⚠️</span>
            {!isCompactView && <span className="text-xs font-medium">Agendar</span>}
          </div>
        );
      case 'pre_entrevista':
        const hasScheduledInterview = Array.isArray(candidate.interviews) && candidate.interviews.some(i => i.status === 'scheduled' && i.type === 'pre_interview');
        return (
          <div className={cn(
            "rounded-full px-2 py-1 shadow-md border flex items-center gap-1",
            hasScheduledInterview 
              ? "bg-info text-info-foreground border-info/20" 
              : "bg-warning text-warning-foreground border-warning/20"
          )}>
            <span className="text-sm">{hasScheduledInterview ? '📅' : '⚠️'}</span>
            {!isCompactView && <span className="text-xs font-medium">{hasScheduledInterview ? 'Agendado' : 'Agendar'}</span>}
          </div>
        );
      case 'selecao_entrevista_presencial':
        return (
          <div className="bg-warning text-warning-foreground rounded-full px-2 py-1 shadow-md border border-warning/20 flex items-center gap-1">
            <span className="text-sm">⚠️</span>
            {!isCompactView && <span className="text-xs font-medium">Agendar</span>}
          </div>
        );
      case 'entrevista_presencial':
        const hasScheduledInPersonInterview = Array.isArray(candidate.interviews) && candidate.interviews.some(i => i.status === 'scheduled' && i.type === 'in_person');
        return (
          <div className={cn(
            "rounded-full px-2 py-1 shadow-md border flex items-center gap-1",
            hasScheduledInPersonInterview 
              ? "bg-info text-info-foreground border-info/20" 
              : "bg-warning text-warning-foreground border-warning/20"
          )}>
            <span className="text-sm">{hasScheduledInPersonInterview ? '📅' : '⚠️'}</span>
            {!isCompactView && <span className="text-xs font-medium">{hasScheduledInPersonInterview ? 'Agendado' : 'Agendar'}</span>}
          </div>
        );
      case 'analise_ia':
        return (
          <div className="bg-primary text-primary-foreground rounded-full px-2 py-1 shadow-md border border-primary/20 flex items-center gap-1">
            <span className="text-sm">🤖</span>
            {!isCompactView && <span className="text-xs font-medium">Analisando</span>}
          </div>
        );
      case 'banco_talentos':
        return (
          <div className="bg-status-talent-bank text-status-talent-bank-foreground rounded-full px-2 py-1 shadow-md border border-status-talent-bank/20 flex items-center gap-1">
            <span className="text-sm">🏦</span>
            {!isCompactView && <span className="text-xs font-medium">Banco de Talentos</span>}
          </div>
        );
      case 'nova_candidatura':
      default:
        return (
          <div className="bg-secondary text-secondary-foreground rounded-full px-2 py-1 shadow-md border border-secondary/20 flex items-center gap-1">
            <span className="text-sm">🆕</span>
            {!isCompactView && <span className="text-xs font-medium">Nova</span>}
          </div>
        );
    }
  };

  const getStatusMessage = () => {
    switch (candidate.stage) {
      case 'aprovado':
        return {
          title: 'Candidato Aprovado',
          description: 'Processo seletivo concluído com sucesso.'
        };
      case 'nao_aprovado':
        return {
          title: 'Candidato Rejeitado',
          description: candidate.rejectionReason || 'Não atendeu aos critérios do processo.'
        };
      case 'selecao_pre_entrevista':
        return {
          title: 'Aguardando Ação',
          description: 'Agende ou dispare mensagem para o candidato.'
        };
      case 'pre_entrevista':
        const hasScheduledInterview = Array.isArray(candidate.interviews) && candidate.interviews.some(i => i.status === 'scheduled' && i.type === 'pre_interview');
        return {
          title: hasScheduledInterview ? 'Pré-entrevista Agendada' : 'Aguardando Agendamento',
          description: hasScheduledInterview 
            ? 'Pré-entrevista agendada. Aguardando realização.'
            : 'Você precisa agendar a pré-entrevista com este candidato.'
        };
      case 'aguardando_feedback_pre_entrevista':
        return {
          title: 'Aguardando Feedback',
          description: 'Pré-entrevista realizada. Aguardando retorno e avaliação.'
        };
      case 'selecao_entrevista_presencial':
        return {
          title: 'Aguardando Agendamento',
          description: 'Você precisa agendar a entrevista presencial com este candidato.'
        };
      case 'entrevista_presencial':
        const hasScheduledInPersonInterview = Array.isArray(candidate.interviews) && candidate.interviews.some(i => i.status === 'scheduled' && i.type === 'in_person');
        return {
          title: hasScheduledInPersonInterview ? 'Entrevista Presencial Agendada' : 'Aguardando Agendamento',
          description: hasScheduledInPersonInterview 
            ? 'Entrevista presencial agendada. Aguardando realização.'
            : 'Você precisa agendar a entrevista presencial com este candidato.'
        };
      case 'analise_ia':
        return {
          title: 'Análise em Andamento',
          description: 'IA está analisando o perfil do candidato.'
        };
      case 'banco_talentos':
        return {
          title: 'Banco de Talentos',
          description: candidate.talentPoolReason || 'Candidato adicionado ao banco de talentos para futuras oportunidades.'
        };
      case 'nova_candidatura':
      default:
        return {
          title: 'Nova Candidatura',
          description: 'Candidato recém cadastrado. Aguardando análise inicial.'
        };
    }
  };

  const handleScheduleInterview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowInterviewScheduler(true);
  };

  const handleSendWhatsAppMessage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      toast({
        title: 'Enviando mensagem...',
        description: 'Disparando mensagem via WhatsApp.',
      });

      const { error } = await supabase.functions.invoke('send-whatsapp-notification', {
        body: {
          candidateId: candidate.id,
          candidateName: candidate.name,
          candidatePhone: candidate.phone,
          positionId: candidate.positionId
        }
      });

      if (error) throw error;

      // Update candidate stage in database BEFORE showing success message
      const { error: updateError } = await supabase
        .from('candidates')
        .update({ 
          stage: 'aguardando_feedback_pre_entrevista',
          updated_at: new Date().toISOString()
        })
        .eq('id', candidate.id);

      if (updateError) throw updateError;

      toast({
        title: 'Mensagem enviada!',
        description: 'O candidato foi movido para Análise Vídeo.',
      });

      // Move candidate to aguardando_feedback_pre_entrevista stage
      if (onStageChange) {
        onStageChange(candidate.id, 'aguardando_feedback_pre_entrevista');
      }
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: 'Erro ao enviar mensagem',
        description: error.message || 'Não foi possível disparar a mensagem.',
        variant: 'destructive',
      });
    }
  };

  const handleApprove = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Para seleção de entrevista presencial, abrir modal de agendamento
    if (candidate.stage === 'selecao_entrevista_presencial') {
      setShowInPersonScheduler(true);
      return;
    }
    
    // Para outros estágios, seguir fluxo normal
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

  const handleTalentPool = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTalentPoolModal(true);
  };

  const handleTalentPoolConfirm = (reason: string) => {
    if (onStageChange) {
      onStageChange(candidate.id, 'banco_talentos', undefined, reason);
    }
  };

  const handleInterviewScheduled = (updatedCandidate: Candidate) => {
    setShowInterviewScheduler(false);
    if (onCandidateUpdate) {
      onCandidateUpdate(updatedCandidate);
    }
    // Move to pre_entrevista stage
    if (onStageChange) {
      onStageChange(candidate.id, 'pre_entrevista');
    }
  };

  const handleInPersonScheduled = (updatedCandidate: Candidate) => {
    setShowInPersonScheduler(false);
    if (onCandidateUpdate) {
      onCandidateUpdate(updatedCandidate);
    }
    // Move to entrevista_presencial stage
    if (onStageChange) {
      onStageChange(candidate.id, 'entrevista_presencial');
    }
  };

  const handleReanalyzeN8n = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      toast({
        title: 'Reanálise solicitada',
        description: 'Enviando candidato para reanálise no n8n...'
      });

      const { error, data } = await supabase.functions.invoke('reanalyze-candidates-n8n', {
        body: { candidateIds: [candidate.id] }
      });

      if (error) {
        throw error;
      }

      // Garantir o efeito no funil imediatamente no UI
      if (onStageChange) {
        onStageChange(candidate.id, 'analise_ia');
      }

      toast({
        title: 'Reanálise disparada',
        description: data?.message || 'O n8n irá retornar a nova análise e o candidato será atualizado.'
      });
    } catch (err: any) {
      console.error('Erro ao disparar reanálise no n8n:', err);
      toast({
        title: 'Erro ao reanalisar',
        description: err?.message || 'Não foi possível disparar a reanálise no n8n.',
        variant: 'destructive'
      });
    }
  };

  return (
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
                <h4 className={cn(
                  "font-semibold text-foreground truncate",
                  isCompactView ? "text-sm" : "text-base"
                )}>
                  {candidate.name}
                </h4>
                
                {!isCompactView && (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge {...sourceBadge} className="text-xs">
                      {sourceBadge.label}
                    </Badge>
                    {candidate.aiAnalysis && (
                      <div className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                        getScoreColor(candidate.aiAnalysis.score)
                      )}>
                        <Star className="h-3 w-3" />
                        {Number(candidate.aiAnalysis.score).toFixed(1)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
              {selectionEnabled && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect?.(candidate.id);
                  }}
                  className="flex items-center"
                >
                  <Checkbox checked={isSelected} aria-label="Selecionar candidato" />
                </div>
              )}

              {/* Compact view - show AI score on the right */}
              {isCompactView && candidate.aiAnalysis && (
                <div className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                  getScoreColor(candidate.aiAnalysis.score)
                )}>
                  <Star className="h-3 w-3" />
                  {Number(candidate.aiAnalysis.score).toFixed(1)}
                </div>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className={cn("space-y-1", isCompactView ? "text-xs" : "text-sm")}>
            <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              <Mail className={cn(isCompactView ? "h-3 w-3" : "h-4 w-4")} />
              <span className="truncate font-normal">{candidate.email}</span>
            </div>
            
            <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <Phone className={cn(isCompactView ? "h-3 w-3" : "h-4 w-4")} />
              <span className="font-normal">{candidate.phone}</span>
              {candidate.phone && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 ml-1 hover:bg-success/20 hover:text-success"
                  title="Abrir WhatsApp"
                  onClick={(e) => {
                    e.stopPropagation();
                    const normalized = normalizeWhatsappPhoneBR(candidate.phone);
                    if (!normalized) {
                      toast({
                        title: 'Telefone inválido',
                        description: 'Verifique DDD e número. Ex.: (11) 9XXXX-XXXX',
                        variant: 'destructive',
                      });
                      return;
                    }
                    const text = 'Olá! Vi seu currículo e gostaria de conversar sobre a vaga.';
                    const encoded = encodeURIComponent(text);
                    const whatsappUrl = `https://wa.me/${normalized}?text=${encoded}`;
                    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
                  }}
                >
                  <MessageCircle className="h-3 w-3" />
                </Button>
              )}
            </div>
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

          {/* Talent Pool Reason for talent bank candidates */}
          {candidate.stage === 'banco_talentos' && candidate.talentPoolReason && !isCompactView && (
            <div className="p-2 bg-status-talent-bank/10 rounded-md border border-status-talent-bank/20">
              <div className="text-xs font-semibold text-status-talent-bank-foreground mb-1">Motivo Banco de Talentos:</div>
              <div className="text-xs text-muted-foreground font-normal">
                {candidate.talentPoolReason}
              </div>
            </div>
          )}

          {/* Status and Interview Info */}
          <div className={cn("flex items-center justify-between", isCompactView ? "mt-2" : "mt-3")}>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              
              {statusIcon && !isCompactView && (
                <div className={cn("flex items-center gap-1 text-xs", statusIcon.color)}>
                  <span>{statusIcon.icon}</span>
                  <span className="font-medium" title={statusIcon.fullDate}>
                    {statusIcon.label}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons - Always at bottom */}
          {canShowActionButtons && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-muted/20">
              {/* Reanálise sempre disponível (n8n reprocessa e atualiza o candidato existente) */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleReanalyzeN8n}
                className="h-8 px-2"
                title="Reanalisar candidato no n8n"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>

              {candidate.stage === 'selecao_pre_entrevista' ? (
                <>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onStageChange) {
                        onStageChange(candidate.id, 'nao_aprovado', 'Reprovado manualmente (Seleção Pré-Entrevista)');
                      }
                    }}
                    className="h-8 px-3 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    title="Mover para Não aprovado"
                  >
                    <X className="h-3 w-3 mr-2" />
                    Reprovar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleScheduleInterview}
                    className="flex-1 h-8 bg-warning text-warning-foreground hover:bg-warning/90"
                  >
                    <Clock className="h-3 w-3 mr-2" />
                    Agendar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSendWhatsAppMessage}
                    className="flex-1 h-8 bg-success text-success-foreground hover:bg-success/90"
                  >
                    <MessageCircle className="h-3 w-3 mr-2" />
                    Disparar
                  </Button>
                </>
              ) : candidate.stage === 'selecao_entrevista_presencial' ? (
                <Button
                  size="sm"
                  onClick={handleApprove}
                  className="flex-1 h-8 bg-warning text-warning-foreground hover:bg-warning/90"
                >
                  <Clock className="h-3 w-3 mr-2" />
                  Agendar
                </Button>
              ) : candidate.stage === 'aguardando_feedback_pre_entrevista' ? (
                <>
                  <Button
                    size="sm"
                    onClick={handleReject}
                    className="flex-1 h-8 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    <X className="h-3 w-3 mr-2" />
                    Recusar
                  </Button>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onStageChange) {
                        onStageChange(candidate.id, 'selecao_entrevista_presencial');
                      }
                    }}
                    className="flex-1 h-8 bg-success text-success-foreground hover:bg-success/90"
                  >
                    <Check className="h-3 w-3 mr-2" />
                    Aprovar
                  </Button>
                </>
              ) : candidate.stage === 'pre_entrevista' && Array.isArray(candidate.interviews) && candidate.interviews.some(i => i.status === 'scheduled' && i.type === 'pre_interview') ? (
                <>
                  <Button
                    size="sm"
                    onClick={handleReject}
                    className="flex-1 h-8 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    <X className="h-3 w-3 mr-2" />
                    Recusar
                  </Button>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowInterviewScheduler(true);
                    }}
                    className="h-8 px-2 bg-info text-info-foreground hover:bg-info/90"
                    title="Reagendar pré-entrevista"
                  >
                    <Clock className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleApprove}
                    className="flex-1 h-8 bg-success text-success-foreground hover:bg-success/90"
                  >
                    <Check className="h-3 w-3 mr-2" />
                    Aprovar
                  </Button>
                </>
              ) : candidate.stage === 'entrevista_presencial' && Array.isArray(candidate.interviews) && candidate.interviews.some(i => i.status === 'scheduled' && i.type === 'in_person') ? (
                <>
                  <Button
                    size="sm"
                    onClick={handleReject}
                    className="flex-1 h-8 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    <X className="h-3 w-3 mr-2" />
                    Recusar
                  </Button>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowInPersonScheduler(true);
                    }}
                    className="h-8 px-2 bg-info text-info-foreground hover:bg-info/90"
                    title="Reagendar entrevista presencial"
                  >
                    <Clock className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleApprove}
                    className="flex-1 h-8 bg-success text-success-foreground hover:bg-success/90"
                  >
                    <Check className="h-3 w-3 mr-2" />
                    Aprovar
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    onClick={handleReject}
                    className="flex-1 h-8 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    <X className="h-3 w-3 mr-2" />
                    Recusar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleApprove}
                    className="flex-1 h-8 bg-success text-success-foreground hover:bg-success/90"
                  >
                    <Check className="h-3 w-3 mr-2" />
                    Aprovar
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Talent Pool Button for approved/rejected candidates */}
          {canShowTalentPoolButton && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-muted/20">
              <Button
                size="sm"
                onClick={handleTalentPool}
                className="flex-1 h-8 bg-status-talent-bank text-status-talent-bank-foreground hover:bg-status-talent-bank/90"
              >
                <User className="h-3 w-3 mr-2" />
                Banco de Talentos
              </Button>
            </div>
          )}

          {/* Application Date */}
          {!isCompactView && candidate.createdAt && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-muted/20">
              <CalendarDays className="h-3 w-3" />
              <span>
                Candidatura: {format(new Date(candidate.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
              </span>
            </div>
          )}
        </div>
        
        {/* Modais ficaram dentro do card, mas com stopPropagation */}
        <RejectionReasonModal
          isOpen={showRejectionModal}
          onClose={() => setShowRejectionModal(false)}
          onConfirm={handleRejectConfirm}
          candidateName={candidate.name}
        />

        <TalentPoolReasonModal
          isOpen={showTalentPoolModal}
          onClose={() => setShowTalentPoolModal(false)}
          onConfirm={handleTalentPoolConfirm}
          candidateName={candidate.name}
        />
        
        <Dialog open={showInterviewScheduler} onOpenChange={setShowInterviewScheduler}>
          <DialogContent 
            className="max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <DialogHeader>
              <DialogTitle>
                {candidate.stage === 'pre_entrevista' && Array.isArray(candidate.interviews) && candidate.interviews.some(i => i.status === 'scheduled' && i.type === 'pre_interview') 
                  ? `Reagendar Pré-entrevista - ${candidate.name}` 
                  : `Agendar Pré-entrevista - ${candidate.name}`}
              </DialogTitle>
            </DialogHeader>
            <InterviewScheduler
              candidate={candidate}
              onInterviewScheduled={handleInterviewScheduled}
              isRescheduling={candidate.stage === 'pre_entrevista' && Array.isArray(candidate.interviews) && candidate.interviews.some(i => i.status === 'scheduled' && i.type === 'pre_interview')}
            />
          </DialogContent>
        </Dialog>
        
        <Dialog open={showInPersonScheduler} onOpenChange={setShowInPersonScheduler}>
          <DialogContent 
            className="max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <DialogHeader>
              <DialogTitle>
                {candidate.stage === 'entrevista_presencial' && Array.isArray(candidate.interviews) && candidate.interviews.some(i => i.status === 'scheduled' && i.type === 'in_person') 
                  ? `Reagendar Entrevista Presencial - ${candidate.name}` 
                  : `Agendar Entrevista Presencial - ${candidate.name}`}
              </DialogTitle>
            </DialogHeader>
            <InPersonInterviewScheduler
              candidate={candidate}
              onInterviewScheduled={handleInPersonScheduled}
              isRescheduling={candidate.stage === 'entrevista_presencial' && Array.isArray(candidate.interviews) && candidate.interviews.some(i => i.status === 'scheduled' && i.type === 'in_person')}
            />
          </DialogContent>
        </Dialog>
    </Card>
  );
}