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

  const updateRefreshToken = async () => {
    if (!refreshToken.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira o refresh token",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Testar as credenciais
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
      
      setRefreshToken('');
    } catch (error) {
      console.error('Erro:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar refresh token",
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
        
        <Button 
          onClick={updateRefreshToken} 
          disabled={loading || !refreshToken.trim()}
          className="w-full"
        >
          {loading ? 'Testando...' : 'Testar Credenciais'}
        </Button>
      </CardContent>
    </Card>
  );
}