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
  const [duration, setDuration] = useState(30);
  const [inviteeEmails, setInviteeEmails] = useState('');
  const [notes, setNotes] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

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

    setIsScheduling(true);

    try {
      // Combinar data e hora
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const scheduledAt = new Date(selectedDate);
      scheduledAt.setHours(hours, minutes, 0, 0);

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

      if (error) {
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
      setDuration(30);
      setInviteeEmails('');
      setNotes('');

    } catch (error) {
      console.error('Erro ao agendar entrevista:', error);
      toast({
        title: "Erro ao agendar",
        description: "Não foi possível agendar a entrevista. Tente novamente.",
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
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Seleção de Data */}
          <div className="space-y-2">
            <Label>Data da Entrevista</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
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
                  onClick={() => setSelectedTime(time)}
                  className="text-xs"
                >
                  {time}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Duração */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duração (minutos)</Label>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min={15}
                max={120}
                step={15}
              />
            </div>
          </div>

          {/* Convidados */}
          <div className="space-y-2">
            <Label htmlFor="invitees">Convidados (emails)</Label>
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