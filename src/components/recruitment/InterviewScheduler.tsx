import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon, Clock, Users, Loader2 } from 'lucide-react';
import { Candidate, Interview } from '@/types/recruitment';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

interface InterviewSchedulerProps {
  candidate: Candidate;
  onInterviewScheduled: (updatedCandidate: Candidate) => void;
  isRescheduling?: boolean;
}

export function InterviewScheduler({ candidate, onInterviewScheduled, isRescheduling = false }: InterviewSchedulerProps) {
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState(today.getDate().toString());
  const [selectedMonth, setSelectedMonth] = useState((today.getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear().toString());
  const [selectedTime, setSelectedTime] = useState('');
  const [inviteeEmails, setInviteeEmails] = useState('');
  const [notes, setNotes] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  const duration = 15; // Duração fixa de 15 minutos

  const timeSlots = [
    '09:00', '09:15', '09:30', '09:45',
    '10:00', '10:15', '10:30', '10:45',
    '11:00', '11:15', '11:30', '11:45',
    '12:00', '12:15', '12:30', '12:45',
    '13:00', '13:15', '13:30', '13:45',
    '14:00', '14:15', '14:30', '14:45',
    '15:00', '15:15', '15:30', '15:45',
    '16:00', '16:15', '16:30', '16:45',
    '17:00'
  ];

  // Criar arrays para dropdowns
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear + i);
  const months = [
    { value: '1', label: 'Janeiro' },
    { value: '2', label: 'Fevereiro' },
    { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Maio' },
    { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' }
  ];
  
  // Calcular dias do mês
  const getDaysInMonth = () => {
    if (!selectedMonth || !selectedYear) return [];
    const daysInMonth = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  // Obter data selecionada
  const getSelectedDate = () => {
    if (!selectedDay || !selectedMonth || !selectedYear) return undefined;
    return new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, parseInt(selectedDay));
  };

  const handleScheduleInterview = async () => {
    const selectedDate = getSelectedDate();
    if (!selectedDate || !selectedTime) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma data e horário para a entrevista.",
        variant: "destructive",
      });
      return;
    }

    // Verificar se o candidato já possui pré-entrevista agendada (apenas se não for reagendamento)
    const hasPreInterview = candidate.interviews?.some(interview => interview.type === 'pre_interview' && interview.status === 'scheduled');
    if (hasPreInterview && !isRescheduling) {
      toast({
        title: "Pré-entrevista já agendada",
        description: "Este candidato já possui uma pré-entrevista agendada. Cancele a pré-entrevista existente antes de agendar uma nova.",
        variant: "destructive",
      });
      return;
    }

    console.log('=== INICIANDO AGENDAMENTO ===');
    console.log('Data selecionada:', selectedDate);
    console.log('Horário selecionado:', selectedTime);
    console.log('Candidato:', candidate);
    
    setIsScheduling(true);

    try {
      // Combinar data e hora
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const scheduledAt = new Date(selectedDate);
      scheduledAt.setHours(hours, minutes, 0, 0);
      
      console.log('Data/hora combinada:', scheduledAt);
      console.log('ISO String:', scheduledAt.toISOString());

      // Criar nova entrevista ou atualizar existente
      let newInterview: Interview;
      let existingInterviewsForDB;
      
      if (isRescheduling) {
        // Encontrar a entrevista existente para atualizar
        const existingInterviewIndex = candidate.interviews.findIndex(i => i.type === 'pre_interview' && i.status === 'scheduled');
        if (existingInterviewIndex !== -1) {
          // Atualizar entrevista existente
          const existingInterview = candidate.interviews[existingInterviewIndex];
          newInterview = {
            ...existingInterview,
            scheduledAt,
            duration,
          };
          
          // Preparar lista de entrevistas com a atualizada
          existingInterviewsForDB = candidate.interviews.map((interview, index) => ({
            id: interview.id,
            type: interview.type,
            scheduledAt: index === existingInterviewIndex ? scheduledAt.toISOString() : (interview.scheduledAt instanceof Date ? interview.scheduledAt.toISOString() : interview.scheduledAt),
            duration: interview.duration,
            meetingUrl: interview.meetingUrl,
            interviewerIds: interview.interviewerIds,
            status: interview.status,
            location: interview.location,
          }));
        } else {
          throw new Error('Entrevista agendada não encontrada para reagendamento');
        }
      } else {
        // Criar nova entrevista
        newInterview = {
          id: Date.now().toString(),
          type: 'pre_interview',
          scheduledAt,
          duration,
          meetingUrl: '', // Será preenchido pela função do Google Calendar
          interviewerIds: [],
          status: 'scheduled',
        };
        
        // Preparar entrevistas existentes para o banco
        existingInterviewsForDB = candidate.interviews.map(i => ({
          id: i.id,
          type: i.type,
          scheduledAt: i.scheduledAt instanceof Date ? i.scheduledAt.toISOString() : i.scheduledAt,
          duration: i.duration,
          meetingUrl: i.meetingUrl,
          interviewerIds: i.interviewerIds,
          status: i.status,
          location: i.location,
        }));
      }

      console.log('Dados sendo enviados para edge function:', {
        type: 'pre_interview',
        candidate: {
          id: candidate.id,
          name: candidate.name,
          email: candidate.email,
          positionId: candidate.positionId,
        },
        interview: {
          scheduledAt: scheduledAt.toISOString(),
          duration,
          notes,
          inviteeEmails: inviteeEmails.split(',').map(email => email.trim()).filter(Boolean),
        }
      });

      // Chamar edge function para enviar dados ao n8n
      console.log('=== CHAMANDO EDGE FUNCTION SEND-TO-N8N-INTERVIEW ===');
      
      const response = await supabase.functions.invoke('send-to-n8n-interview', {
        body: {
          type: 'pre_interview',
          candidate: {
            id: candidate.id,
            name: candidate.name,
            email: candidate.email,
            positionId: candidate.positionId,
          },
          interview: {
            scheduledAt: scheduledAt.toISOString(),
            duration,
            notes,
            inviteeEmails: inviteeEmails.split(',').map(email => email.trim()).filter(Boolean),
          }
        }
      });

      console.log('=== RESPOSTA DA EDGE FUNCTION ===');
      console.log('Resposta completa da edge function:', response);
      console.log('Response data:', response.data);
      console.log('Response error:', response.error);

      if (response.error) {
        console.error('Erro na edge function:', response.error);
        console.error('Detalhes do erro:', JSON.stringify(response.error, null, 2));
        const errAny: any = response.error as any;
        const requiresReauth = errAny?.context?.requires_reauth || errAny?.context?.details?.requires_reauth || /reautorizar|refresh token expirou|invalid_grant/i.test(errAny?.message ?? '');
        if (requiresReauth) {
          toast({
            title: 'Reautorização do Google necessária',
            description: 'O refresh token expirou/revogado. Obtenha um novo refresh token e salve nas Credenciais Google.',
            variant: 'destructive',
            action: (
              <ToastAction altText="Abrir guia" onClick={() => window.open('https://burxedzkpugyavsqkzaj.supabase.co/functions/v1/get-google-refresh-token','_blank')}>Obter Refresh Token</ToastAction>
            ),
          });
          setIsScheduling(false);
          return;
        }
        throw new Error(`Edge function error: ${response.error.message || JSON.stringify(response.error)}`);
      }

      const { data, error } = response;

      // Atualizar candidato com a entrevista (nova ou atualizada) e Google Meet URL
      const updatedInterview = {
        ...newInterview,
        meetingUrl: data.meetingUrl,
      };

      let updatedCandidate;
      if (isRescheduling) {
        // Para reagendamento, atualizar a entrevista existente
        const updatedInterviews = candidate.interviews.map(interview => 
          interview.type === 'pre_interview' && interview.status === 'scheduled'
            ? updatedInterview
            : interview
        );
        
        updatedCandidate = {
          ...candidate,
          interviews: updatedInterviews,
          updatedAt: new Date(),
        };
      } else {
        // Para novo agendamento, adicionar à lista
        updatedCandidate = {
          ...candidate,
          stage: 'pre_entrevista' as const,
          interviews: [...candidate.interviews, updatedInterview],
          updatedAt: new Date(),
        };
      }

      // Preparar entrevista para o banco (apenas propriedades serializáveis)
      let finalInterviewsForDB;
      if (isRescheduling) {
        finalInterviewsForDB = existingInterviewsForDB.map(interview => 
          interview.type === 'pre_interview' && interview.status === 'scheduled'
            ? {
                ...interview,
                meetingUrl: data.meetingUrl,
                scheduledAt: scheduledAt.toISOString(),
              }
            : interview
        );
      } else {
        const interviewForDB = {
          id: updatedInterview.id,
          type: updatedInterview.type,
          scheduledAt: scheduledAt.toISOString(),
          duration: updatedInterview.duration,
          meetingUrl: updatedInterview.meetingUrl,
          interviewerIds: updatedInterview.interviewerIds,
          status: updatedInterview.status,
          location: updatedInterview.location,
        };
        finalInterviewsForDB = [...existingInterviewsForDB, interviewForDB];
      }

      // Atualizar no Supabase com a entrevista
      const updateData = isRescheduling 
        ? {
            interviews: finalInterviewsForDB,
            updated_at: new Date().toISOString(),
          }
        : {
            stage: 'pre_entrevista',
            interviews: finalInterviewsForDB,
            updated_at: new Date().toISOString(),
          };

      const { error: updateError } = await supabase
        .from('candidates')
        .update(updateData)
        .eq('id', candidate.id);

      if (updateError) {
        throw updateError;
      }

      onInterviewScheduled(updatedCandidate);

      toast({
        title: isRescheduling ? "Entrevista reagendada!" : "Entrevista agendada!",
        description: isRescheduling ? "A pré-entrevista foi reagendada e os emails foram enviados." : "A pré-entrevista foi agendada e os emails foram enviados.",
      });

      // Limpar formulário
      setSelectedDay('');
      setSelectedMonth('');
      setSelectedYear('');
      setSelectedTime('');
      setInviteeEmails('');
      setNotes('');

    } catch (error: any) {
      console.error('=== ERRO COMPLETO NO AGENDAMENTO ===');
      console.error('Erro detalhado:', error);
      console.error('Stack trace:', error.stack);
      console.error('Tipo do erro:', typeof error);
      console.error('Propriedades do erro:', Object.keys(error));

      const msg = (error?.message || '').toString();
      const requiresReauth = /reautorizar|refresh token expirou|invalid_grant/i.test(msg);
      if (requiresReauth) {
        toast({
          title: 'Reautorização do Google necessária',
          description: 'O refresh token expirou/revogado. Obtenha um novo refresh token e salve nas Credenciais Google.',
          variant: 'destructive',
          action: (
            <ToastAction altText="Abrir guia" onClick={() => window.open('https://burxedzkpugyavsqkzaj.supabase.co/functions/v1/get-google-refresh-token','_blank')}>Obter Refresh Token</ToastAction>
          ),
        });
      } else {
        toast({
          title: 'Erro ao agendar',
          description: `Erro: ${error.message || error.toString()}`,
          variant: 'destructive',
        });
      }
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          {isRescheduling ? 'Reagendar Pré-entrevista' : 'Agendar Pré-entrevista'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Seleção de Data */}
          <div className="space-y-3">
            <Label>Data da Entrevista</Label>
            <div className="grid grid-cols-3 gap-2">
              {/* Dia */}
              <div>
                <Label className="text-xs text-muted-foreground">Dia</Label>
                <Select value={selectedDay} onValueChange={setSelectedDay}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Dia" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {getDaysInMonth().map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Mês */}
              <div>
                <Label className="text-xs text-muted-foreground">Mês</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Ano */}
              <div>
                <Label className="text-xs text-muted-foreground">Ano</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Seleção de Horário */}
          <div className="space-y-2">
            <Label>Horário</Label>
            <div className="grid grid-cols-4 gap-1 max-h-48 overflow-y-auto">
              {timeSlots.map((time) => (
                <Button
                  key={time}
                  variant={selectedTime === time ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedTime(time);
                    console.log('Horário selecionado:', time);
                  }}
                  className="text-xs"
                >
                  {time}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Convidados */}
          <div className="space-y-2">
            <Label htmlFor="invitees">Convidados (emails) - Opcional</Label>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Input
                id="invitees"
                placeholder="email1@empresa.com, email2@empresa.com"
                value={inviteeEmails}
                onChange={(e) => setInviteeEmails(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Observações */}
        <div className="space-y-2">
          <Label htmlFor="notes">Observações (opcional)</Label>
          <Textarea
            id="notes"
            placeholder="Informações adicionais sobre a entrevista..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <Button 
          onClick={handleScheduleInterview}
          disabled={!getSelectedDate() || !selectedTime || isScheduling}
          className="w-full"
        >
          {isScheduling ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isRescheduling ? 'Reagendando...' : 'Agendando...'}
            </>
          ) : (
            isRescheduling ? 'Reagendar Pré-entrevista' : 'Agendar Pré-entrevista'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}