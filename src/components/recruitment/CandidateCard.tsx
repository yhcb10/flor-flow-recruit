import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CalendarDays, Mail, Phone, Star, Clock, MessageSquare } from 'lucide-react';
import { Candidate } from '@/types/recruitment';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CandidateCardProps {
  candidate: Candidate;
  onClick: () => void;
  isDragging?: boolean;
}

export function CandidateCard({ candidate, onClick, isDragging }: CandidateCardProps) {
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
            {candidate.aiAnalysis.strengths.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                <strong>Destaque:</strong> {candidate.aiAnalysis.strengths[0]}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(candidate.createdAt, 'dd/MM', { locale: ptBR })}
          </div>
          
          <div className="flex items-center gap-2">
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
    </Card>
  );
}