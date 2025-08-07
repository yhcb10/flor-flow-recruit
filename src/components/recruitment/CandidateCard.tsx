import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CalendarDays, Mail, Phone, Star, Clock, MessageSquare, Check, X } from 'lucide-react';
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
}

export function CandidateCard({ candidate, onClick, isDragging, onStageChange }: CandidateCardProps) {
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
    return latestInterview.status;
  };

  const getStatusIcon = () => {
    const status = getInterviewStatus();
    if (!status) return null;
    
    switch (status) {
      case 'scheduled':
        return { icon: '⏰', label: 'Agendado', color: 'text-warning' };
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
    <Card 
      className={cn(
        "bg-kanban-card hover:bg-kanban-card-hover cursor-pointer transition-all duration-200",
        "hover:shadow-md border-border",
        isDragging && "shadow-lg ring-2 ring-primary/20"
      )}
      onClick={onClick}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {candidate.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-medium text-foreground text-sm">{candidate.name}</h4>
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
                    {candidate.aiAnalysis.score.toFixed(1)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-3 w-3" />
            <span className="truncate">{candidate.email}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />
            <span>{candidate.phone}</span>
          </div>
        </div>

        {/* Rejection Reason for rejected candidates */}
        {candidate.stage === 'nao_aprovado' && candidate.rejectionReason && (
          <div className="mb-3 p-2 bg-destructive/10 rounded-md border border-destructive/20">
            <div className="text-xs font-medium text-destructive mb-1">Motivo da Rejeição:</div>
            <div className="text-xs text-muted-foreground">
              {candidate.rejectionReason}
            </div>
          </div>
        )}

        {/* AI Analysis Summary */}
        {candidate.aiAnalysis && (
          <div className="mb-3 p-2 bg-secondary/50 rounded-md">
            <div className="text-xs font-medium text-foreground mb-1">Análise IA:</div>
            <div className="text-xs text-muted-foreground">
              {candidate.aiAnalysis.recommendation === 'advance' && (
                <span className="text-success">✓ Recomendado para próxima etapa</span>
              )}
              {candidate.aiAnalysis.recommendation === 'review' && (
                <span className="text-warning">⚠ Necessita revisão</span>
              )}
              {candidate.aiAnalysis.recommendation === 'reject' && (
                <span className="text-destructive">✗ Não recomendado</span>
              )}
            </div>
            {candidate.aiAnalysis.pontoFortes.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                <strong>Destaque:</strong> {candidate.aiAnalysis.pontoFortes[0]}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {canShowActionButtons && (
          <div className="flex gap-2 mb-3">
            <Button
              size="sm"
              variant="default"
              onClick={handleApprove}
              className="flex-1 h-8 text-xs"
            >
              <Check className="h-3 w-3 mr-1" />
              Aprovar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleReject}
              className="flex-1 h-8 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Reprovar
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(candidate.createdAt, 'dd/MM', { locale: ptBR })}
          </div>
          
          <div className="flex items-center gap-2">
            {statusIcon && (
              <div className={cn("flex items-center gap-1", statusIcon.color)}>
                <span className="text-xs">{statusIcon.icon}</span>
                <span className="text-xs font-medium">{statusIcon.label}</span>
              </div>
            )}
            {candidate.notes.length > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                <span>{candidate.notes.length}</span>
              </div>
            )}
            {candidate.interviews.length > 0 && (
              <div className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                <span>{candidate.interviews.length}</span>
              </div>
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
  );
}