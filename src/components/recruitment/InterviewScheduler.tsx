import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon, Clock, Users, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Candidate, Interview } from '@/types/recruitment';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface InterviewSchedulerProps {
  candidate: Candidate;
  onInterviewScheduled: (updatedCandidate: Candidate) => void;
}

export function InterviewScheduler({ candidate, onInterviewScheduled }: InterviewSchedulerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [inviteeEmails, setInviteeEmails] = useState('');
  const [notes, setNotes] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  const duration = 15; // Duração fixa de 15 minutos

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
  ];

  const handleScheduleInterview = async () => {
    if (!selectedDate || !selectedTime) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma data e horário para a entrevista.",
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

      // Criar nova entrevista
      const newInterview: Interview = {
        id: Date.now().toString(),
        type: 'pre_interview',
        scheduledAt,
        duration,
        meetingUrl: '', // Será preenchido pela função do Google Calendar
        interviewerIds: [],
        status: 'scheduled',
      };

      console.log('Dados sendo enviados para edge function:', {
        candidate: {
          id: candidate.id,
          name: candidate.name,
          email: candidate.email,
        },
        interview: {
          scheduledAt: scheduledAt.toISOString(),
          duration,
          notes,
          inviteeEmails: inviteeEmails.split(',').map(email => email.trim()).filter(Boolean),
        }
      });

      // Chamar edge function para criar evento no Google Calendar e enviar emails
      const { data, error } = await supabase.functions.invoke('schedule-interview', {
        body: {
          candidate: {
            id: candidate.id,
            name: candidate.name,
            email: candidate.email,
          },
          interview: {
            scheduledAt: scheduledAt.toISOString(),
            duration,
            notes,
            inviteeEmails: inviteeEmails.split(',').map(email => email.trim()).filter(Boolean),
          }
        }
      });

      console.log('Resposta da edge function:', { data, error });

      if (error) {
        console.error('Erro na edge function:', error);
        throw error;
      }

      // Atualizar candidato com a nova entrevista e Google Meet URL
      const updatedInterview = {
        ...newInterview,
        meetingUrl: data.meetingUrl,
      };

      const updatedCandidate = {
        ...candidate,
        stage: 'pre_entrevista' as const,
        interviews: [...candidate.interviews, updatedInterview],
        updatedAt: new Date(),
      };

      // Atualizar no Supabase
      const { error: updateError } = await supabase
        .from('candidates')
        .update({
          stage: 'pre_entrevista',
          updated_at: new Date().toISOString(),
        })
        .eq('id', candidate.id);

      if (updateError) {
        throw updateError;
      }

      onInterviewScheduled(updatedCandidate);

      toast({
        title: "Entrevista agendada!",
        description: "A pré-entrevista foi agendada e os emails foram enviados.",
      });

      // Limpar formulário
      setSelectedDate(undefined);
      setSelectedTime('');
      setInviteeEmails('');
      setNotes('');

    } catch (error) {
      console.error('=== ERRO COMPLETO NO AGENDAMENTO ===');
      console.error('Erro detalhado:', error);
      console.error('Stack trace:', error.stack);
      console.error('Tipo do erro:', typeof error);
      console.error('Propriedades do erro:', Object.keys(error));
      
      toast({
        title: "Erro ao agendar",
        description: `Erro: ${error.message || error.toString()}`,
        variant: "destructive",
      });
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Agendar Pré-entrevista
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Seleção de Data */}
          <div className="space-y-2">
            <Label>Data da Entrevista</Label>
            <Input
              type="date"
              value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(new Date(e.target.value + 'T12:00:00'));
                  console.log('Data selecionada via input:', new Date(e.target.value + 'T12:00:00'));
                } else {
                  setSelectedDate(undefined);
                }
              }}
              min={new Date().toISOString().split('T')[0]}
              className="w-full"
            />
          </div>

          {/* Seleção de Horário */}
          <div className="space-y-2">
            <Label>Horário</Label>
            <div className="grid grid-cols-3 gap-2">
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
          disabled={!selectedDate || !selectedTime || isScheduling}
          className="w-full"
        >
          {isScheduling ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Agendando...
            </>
          ) : (
            'Agendar Pré-entrevista'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}