import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  User, Mail, Phone, Calendar, Star, TrendingUp, TrendingDown, 
  MessageSquare, Video, MapPin, Clock, ExternalLink, Trash2, MessageCircle 
} from 'lucide-react';
import { Candidate } from '@/types/recruitment';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ResumeUpload } from './ResumeUpload';
import { InterviewScheduler } from './InterviewScheduler';
import { InPersonInterviewScheduler } from './InPersonInterviewScheduler';
import { PDFViewer } from './PDFViewer';
import { useToast } from '@/hooks/use-toast';
import { normalizeWhatsappPhoneBR } from '@/lib/utils';
interface CandidateModalProps {
  candidate: Candidate;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (candidate: Candidate) => void;
  onDelete?: (candidateId: string) => void;
}

export function CandidateModal({ candidate, isOpen, onClose, onUpdate, onDelete }: CandidateModalProps) {
  const [newNote, setNewNote] = useState('');
  const { toast } = useToast();

  const handleResumeUpload = (url: string, fileName: string) => {
    const updatedCandidate = {
      ...candidate,
      resumeUrl: url,
      resumeFileName: fileName,
      updatedAt: new Date()
    };
    onUpdate(updatedCandidate);
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-success';
    if (score >= 6.5) return 'text-warning';
    return 'text-destructive';
  };

  const getRecommendationBadge = (recommendation: string) => {
    const map = {
      advance: { label: 'Avançar', variant: 'default' as const, color: 'bg-success' },
      review: { label: 'Revisar', variant: 'secondary' as const, color: 'bg-warning' },
      reject: { label: 'Rejeitar', variant: 'destructive' as const, color: 'bg-destructive' }
    };
    return map[recommendation as keyof typeof map] || map.review;
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    
    const note = {
      id: Date.now().toString(),
      content: newNote,
      authorId: '1',
      authorName: 'Ana Santos',
      createdAt: new Date(),
      type: 'general' as const
    };

    const updatedCandidate = {
      ...candidate,
      notes: [...candidate.notes, note],
      updatedAt: new Date()
    };

    onUpdate(updatedCandidate);
    setNewNote('');
  };

  const handleDelete = () => {
    if (window.confirm(`Tem certeza que deseja excluir o candidato ${candidate.name}?`)) {
      onDelete?.(candidate.id);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {candidate.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-xl font-bold">{candidate.name}</div>
                <div className="text-sm text-muted-foreground">Candidato • {candidate.positionId}</div>
              </div>
            </div>
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="curriculum">Currículo</TabsTrigger>
            <TabsTrigger value="ai-analysis">Análise IA</TabsTrigger>
            <TabsTrigger value="interviews">Entrevistas</TabsTrigger>
            <TabsTrigger value="notes">Anotações</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Informações Pessoais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{candidate.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{candidate.phone}</span>
                    {candidate.phone && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 ml-1 hover:bg-success/20 hover:text-success"
                        title="Abrir WhatsApp"
                        onClick={() => {
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
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Candidatura: {candidate.createdAt ? format(new Date(candidate.createdAt), 'dd/MM/yyyy', { locale: ptBR }) : 'Data não disponível'}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Status Atual</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Etapa:</div>
                    <Badge variant="outline">{candidate.stage.replace('_', ' ').toUpperCase()}</Badge>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Origem:</div>
                    <Badge variant="secondary">{candidate.source}</Badge>
                  </div>
                  {candidate.aiAnalysis && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Pontuação IA:</div>
                      <div className={`text-lg font-bold ${getScoreColor(candidate.aiAnalysis.score)}`}>
                        {Number(candidate.aiAnalysis.score).toFixed(1)}/10
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Currículo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {candidate.resumeUrl ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {candidate.resumeFileName || 'curriculum.pdf'}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(candidate.resumeUrl, '_blank')}
                      >
                        Visualizar
                      </Button>
                    </div>
                    <ResumeUpload
                      candidateId={candidate.id}
                      onUploadComplete={handleResumeUpload}
                    />
                  </div>
                ) : (
                  <ResumeUpload
                    candidateId={candidate.id}
                    onUploadComplete={handleResumeUpload}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Curriculum Tab */}
          <TabsContent value="curriculum" className="space-y-4">
            <PDFViewer 
              pdfUrl={candidate.resumeUrl || ''}
              fileName={candidate.resumeFileName}
            />
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Atualizar Currículo</CardTitle>
              </CardHeader>
              <CardContent>
                <ResumeUpload
                  candidateId={candidate.id}
                  onUploadComplete={handleResumeUpload}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Analysis Tab */}
          <TabsContent value="ai-analysis" className="space-y-4">
            {candidate.aiAnalysis ? (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className={`text-3xl font-bold ${getScoreColor(candidate.aiAnalysis.score)}`}>
                        {Number(candidate.aiAnalysis.score).toFixed(1)}
                      </div>
                      <div className="text-sm text-muted-foreground">Pontuação Geral</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Badge {...getRecommendationBadge(candidate.aiAnalysis.recommendation)} className="mb-2">
                        {getRecommendationBadge(candidate.aiAnalysis.recommendation).label}
                      </Badge>
                      <div className="text-sm text-muted-foreground">Recomendação</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className="text-lg font-semibold text-foreground">
                        {candidate.aiAnalysis.analyzedAt ? format(new Date(candidate.aiAnalysis.analyzedAt), 'dd/MM') : '--'}
                      </div>
                      <div className="text-sm text-muted-foreground">Data da Análise</div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-success" />
                      Pontos Fortes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {(Array.isArray(candidate.aiAnalysis.pontoFortes) ? candidate.aiAnalysis.pontoFortes : []).map((pontoForte, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <div className="w-2 h-2 bg-success rounded-full mt-2 flex-shrink-0" />
                          {pontoForte}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-warning" />
                      Pontos de Atenção
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {(Array.isArray(candidate.aiAnalysis.pontosAtencao) ? candidate.aiAnalysis.pontosAtencao : []).map((pontoAtencao, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <div className="w-2 h-2 bg-warning rounded-full mt-2 flex-shrink-0" />
                          {pontoAtencao}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Avaliação Detalhada</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Experiência Profissional:</span>
                        <span className="font-bold">{candidate.aiAnalysis.experienciaProfissional}/4</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Habilidades Técnicas:</span>
                        <span className="font-bold">{candidate.aiAnalysis.habilidadesTecnicas}/2</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Competências Comportamentais:</span>
                        <span className="font-bold">{candidate.aiAnalysis.competenciasComportamentais}/1</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Formação Acadêmica:</span>
                        <span className="font-bold">{candidate.aiAnalysis.formacaoAcademica}/1</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Diferenciais relevantes:</span>
                        <span className="font-bold">{candidate.aiAnalysis.diferenciaisRelevantes}/2</span>
                      </div>
                      <hr className="my-2" />
                      <div className="flex justify-between font-bold">
                        <span>Total:</span>
                        <span className={getScoreColor(candidate.aiAnalysis.score)}>{candidate.aiAnalysis.score}/10</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Recomendação Final</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      {candidate.aiAnalysis.recomendacaoFinal === 'aprovado' ? (
                        <div className="text-success">
                          <div className="font-bold">Aprovado para entrevista</div>
                        </div>
                      ) : (
                        <div className="text-destructive">
                          <div className="font-bold">Não recomendado neste momento</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Análise Detalhada</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{candidate.aiAnalysis.reasoning}</p>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-muted-foreground">Análise IA não realizada</div>
                  <Button className="mt-4" size="sm">Solicitar Análise</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Interviews Tab */}
          <TabsContent value="interviews" className="space-y-4">
            {candidate.stage === 'selecao_pre_entrevista' && (
              <InterviewScheduler 
                candidate={candidate}
                onInterviewScheduled={(updatedCandidate) => {
                  onUpdate(updatedCandidate);
                }}
              />
            )}

            {candidate.stage === 'selecao_entrevista_presencial' && (
              <InPersonInterviewScheduler 
                candidate={candidate}
                onInterviewScheduled={(updatedCandidate) => {
                  onUpdate(updatedCandidate);
                }}
              />
            )}
            
            {Array.isArray(candidate.interviews) && candidate.interviews.length > 0 ? (
              candidate.interviews.map((interview) => (
                <Card key={interview.id}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      {interview.type === 'pre_interview' ? 'Pré-entrevista' : 'Entrevista Presencial'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {interview.scheduledAt ? format(new Date(interview.scheduledAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'Data não definida'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {interview.duration} minutos
                      </div>
                      {interview.meetingUrl && (
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4 text-muted-foreground" />
                          <a href={interview.meetingUrl} target="_blank" rel="noopener noreferrer" 
                             className="text-primary hover:underline">
                            Link da Reunião
                          </a>
                        </div>
                      )}
                      {interview.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {interview.location}
                        </div>
                      )}
                    </div>
                    <Badge variant={
                      interview.status === 'completed' ? 'default' :
                      interview.status === 'scheduled' ? 'secondary' : 'destructive'
                    }>
                      {interview.status === 'completed' ? 'Concluída' :
                       interview.status === 'scheduled' ? 'Agendada' :
                       interview.status === 'cancelled' ? 'Cancelada' : 'Faltou'}
                    </Badge>
                  </CardContent>
                </Card>
              ))
            ) : !['selecao_pre_entrevista', 'selecao_entrevista_presencial'].includes(candidate.stage) ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-muted-foreground">Nenhuma entrevista agendada</div>
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Nova Anotação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Adicione uma anotação sobre este candidato..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleAddNote} size="sm" disabled={!newNote.trim()}>
                  Adicionar Anotação
                </Button>
              </CardContent>
            </Card>

            {candidate.notes.length > 0 ? (
              <div className="space-y-3">
                {candidate.notes.map((note) => (
                  <Card key={note.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <MessageSquare className="h-4 w-4 text-muted-foreground mt-1" />
                        <div className="flex-1">
                          <p className="text-sm">{note.content}</p>
                          <div className="text-xs text-muted-foreground mt-2">
                            {note.authorName} • {format(note.createdAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-muted-foreground">Nenhuma anotação registrada</div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}