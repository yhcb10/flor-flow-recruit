import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon, Clock, MapPin, Users, Loader2 } from 'lucide-react';
import { Candidate, Interview } from '@/types/recruitment';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

interface InPersonInterviewSchedulerProps {
  candidate: Candidate;
  onInterviewScheduled: (updatedCandidate: Candidate) => void;
  isRescheduling?: boolean;
}

export function InPersonInterviewScheduler({ candidate, onInterviewScheduled, isRescheduling = false }: InPersonInterviewSchedulerProps) {
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState(today.getDate().toString());
  const [selectedMonth, setSelectedMonth] = useState((today.getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear().toString());
  const [selectedTime, setSelectedTime] = useState('');
  const [location, setLocation] = useState('Escritório da Coroa de Flores Nobre - Barra Funda, São Paulo - SP');
  const [inviteeEmails, setInviteeEmails] = useState('');
  const [notes, setNotes] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  const duration = 60; // Duração padrão de 60 minutos para entrevista presencial

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
    if (!selectedDate || !selectedTime || !location.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma data, horário e local para a entrevista.",
        variant: "destructive",
      });
      return;
    }

    // Verificar se o candidato já possui entrevista presencial agendada (apenas se não for reagendamento)
    const hasInPersonInterview = candidate.interviews?.some(interview => interview.type === 'in_person' && interview.status === 'scheduled');
    if (hasInPersonInterview && !isRescheduling) {
      toast({
        title: "Entrevista presencial já agendada",
        description: "Este candidato já possui uma entrevista presencial agendada. Cancele a entrevista existente antes de agendar uma nova.",
        variant: "destructive",
      });
      return;
    }

    console.log('=== AGENDANDO ENTREVISTA PRESENCIAL ===');
    console.log('Data selecionada:', selectedDate);
    console.log('Horário selecionado:', selectedTime);
    console.log('Local:', location);
    console.log('Candidato:', candidate);
    
    setIsScheduling(true);

    try {
      // Combinar data e hora
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const scheduledAt = new Date(selectedDate);
      scheduledAt.setHours(hours, minutes, 0, 0);
      
      console.log('Data/hora combinada:', scheduledAt);

      // Criar nova entrevista presencial ou atualizar existente
      let newInterview: Interview;
      let existingInterviewsForDB;
      
      if (isRescheduling) {
        // Encontrar a entrevista existente para atualizar
        const existingInterviewIndex = candidate.interviews.findIndex(i => i.type === 'in_person' && i.status === 'scheduled');
        if (existingInterviewIndex !== -1) {
          // Atualizar entrevista existente
          const existingInterview = candidate.interviews[existingInterviewIndex];
          newInterview = {
            ...existingInterview,
            scheduledAt,
            duration,
            location,
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
            location: index === existingInterviewIndex ? location : interview.location,
          }));
        } else {
          throw new Error('Entrevista agendada não encontrada para reagendamento');
        }
      } else {
        // Criar nova entrevista
        newInterview = {
          id: Date.now().toString(),
          type: 'in_person',
          scheduledAt,
          duration,
          location,
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
        type: 'in_person',
        candidate: {
          id: candidate.id,
          name: candidate.name,
          email: candidate.email,
          positionId: candidate.positionId,
        },
        interview: {
          scheduledAt: scheduledAt.toISOString(),
          duration,
          location,
          notes,
          inviteeEmails: inviteeEmails.split(',').map(email => email.trim()).filter(Boolean),
        }
      });

      // Chamar edge function para enviar dados ao n8n
      console.log('=== CHAMANDO EDGE FUNCTION SEND-TO-N8N-INTERVIEW ===');
      
      const response = await supabase.functions.invoke('send-to-n8n-interview', {
        body: {
          type: 'in_person',
          candidate: {
            id: candidate.id,
            name: candidate.name,
            email: candidate.email,
            positionId: candidate.positionId,
          },
          interview: {
            scheduledAt: scheduledAt.toISOString(),
            duration,
            location,
            notes,
            inviteeEmails: inviteeEmails.split(',').map(email => email.trim()).filter(Boolean),
          }
        }
      });

      console.log('Resposta da edge function:', response);

      if (response.error) {
        console.error('Erro na edge function:', response.error);
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

      // Atualizar candidato com a entrevista (nova ou atualizada)
      let updatedCandidate;
      if (isRescheduling) {
        // Para reagendamento, atualizar a entrevista existente
        const updatedInterviews = candidate.interviews.map(interview => 
          interview.type === 'in_person' && interview.status === 'scheduled'
            ? newInterview
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
          stage: 'entrevista_presencial' as const,
          interviews: [...candidate.interviews, newInterview],
          updatedAt: new Date(),
        };
      }

      // Preparar entrevista para o banco (apenas propriedades serializáveis)
      let finalInterviewsForDB;
      if (isRescheduling) {
        finalInterviewsForDB = existingInterviewsForDB.map(interview => 
          interview.type === 'in_person' && interview.status === 'scheduled'
            ? {
                ...interview,
                scheduledAt: scheduledAt.toISOString(),
                location,
              }
            : interview
        );
      } else {
        const interviewForDB = {
          id: newInterview.id,
          type: newInterview.type,
          scheduledAt: scheduledAt.toISOString(),
          duration: newInterview.duration,
          location: newInterview.location,
          interviewerIds: newInterview.interviewerIds,
          status: newInterview.status,
        };
        finalInterviewsForDB = [...existingInterviewsForDB, interviewForDB];
      }

      // Atualizar no Supabase
      const updateData = isRescheduling 
        ? {
            interviews: finalInterviewsForDB,
            updated_at: new Date().toISOString(),
          }
        : {
            stage: 'entrevista_presencial',
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
        title: isRescheduling ? "Entrevista reagendada!" : "Entrevista presencial agendada!",
        description: isRescheduling ? "A entrevista presencial foi reagendada e os emails foram enviados." : "A entrevista presencial foi agendada e os emails foram enviados.",
      });

      // Limpar formulário
      setSelectedDay('');
      setSelectedMonth('');
      setSelectedYear('');
      setSelectedTime('');
      setLocation('Escritório da Coroa de Flores Nobre - Barra Funda, São Paulo - SP');
      setInviteeEmails('');
      setNotes('');

    } catch (error: any) {
      console.error('=== ERRO NO AGENDAMENTO DA ENTREVISTA PRESENCIAL ===');
      console.error('Erro detalhado:', error);

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
          {isRescheduling ? 'Reagendar Entrevista Presencial' : 'Agendar Entrevista Presencial'}
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
                  onClick={() => setSelectedTime(time)}
                  className="text-xs"
                >
                  {time}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Local */}
          <div className="space-y-2">
            <Label htmlFor="location">Local da Entrevista</Label>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Input
                id="location"
                placeholder="Endereço da entrevista"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

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
          disabled={!getSelectedDate() || !selectedTime || !location.trim() || isScheduling}
          className="w-full"
        >
          {isScheduling ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isRescheduling ? 'Reagendando...' : 'Agendando...'}
            </>
          ) : (
            isRescheduling ? 'Reagendar Entrevista Presencial' : 'Agendar Entrevista Presencial'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}