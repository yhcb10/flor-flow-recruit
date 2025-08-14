import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function UpdateRefreshToken() {
  const [refreshToken, setRefreshToken] = useState('');
  const [loading, setLoading] = useState(false);

  const testScheduleInterview = async () => {
    setLoading(true);
    try {
      console.log('Testando agendamento de entrevista...');
      
      const testData = {
        candidate: {
          id: 'test-123',
          name: 'Teste Candidato',
          email: 'teste@example.com',
          position: '1'
        },
        interview: {
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // amanhã
          duration: 30,
          notes: 'Teste de agendamento',
          inviteeEmails: ['yuri.carvalho@coroadefloresnobre.com.br']
        }
      };

      console.log('Dados do teste:', testData);
      
      const { data, error } = await supabase.functions.invoke('schedule-interview', {
        body: testData
      });
      
      console.log('Resposta da edge function:', { data, error });
      
      if (error) {
        console.error('Erro na edge function:', error);
        toast({
          title: "Erro no Agendamento",
          description: `Erro: ${error.message}`,
          variant: "destructive",
        });
      } else {
        console.log('Sucesso:', data);
        toast({
          title: "Sucesso",
          description: "Teste de agendamento executado com sucesso!",
        });
      }
      
    } catch (error) {
      console.error('Erro detalhado:', error);
      toast({
        title: "Erro",
        description: `Erro ao testar: ${error.message}`,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const testCredentials = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-google-credentials');
      
      if (error) {
        console.error('Erro ao testar credenciais:', error);
        toast({
          title: "Erro",
          description: `Erro ao testar: ${error.message}`,
          variant: "destructive",
        });
      } else {
        console.log('Resultado do teste:', data);
        toast({
          title: "Teste de Credenciais",
          description: `Resultado: ${JSON.stringify(data?.credentials || data)}`,
        });
      }
      
    } catch (error) {
      console.error('Erro:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar teste",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-4">
      <CardHeader>
        <CardTitle>Atualizar Refresh Token</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="refreshToken">Refresh Token do Google</Label>
          <Input
            id="refreshToken"
            type="text"
            placeholder="Cole o refresh token aqui..."
            value={refreshToken}
            onChange={(e) => setRefreshToken(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Button 
            onClick={testCredentials} 
            disabled={loading}
            className="w-full"
            variant="outline"
          >
            {loading ? 'Testando...' : 'Testar Credenciais'}
          </Button>
          
          <Button 
            onClick={testScheduleInterview} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Testando...' : 'Testar Agendamento'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}