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
      // Aqui você precisará implementar uma edge function para atualizar o secret
      // Por enquanto, apenas mostro uma mensagem
      console.log('Refresh Token para atualizar:', refreshToken);
      
      toast({
        title: "Sucesso",
        description: "Refresh token copiado para o console. Aguarde a atualização manual.",
      });
      
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
          {loading ? 'Atualizando...' : 'Atualizar Refresh Token'}
        </Button>
      </CardContent>
    </Card>
  );
}