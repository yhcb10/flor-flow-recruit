import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

export function TestGoogleCredentials() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testCredentials = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-google-credentials');
      
      if (error) {
        console.error('Erro ao testar credenciais:', error);
        setResult({ error: error.message });
      } else {
        console.log('Resultado do teste:', data);
        setResult(data);
      }
    } catch (error) {
      console.error('Erro:', error);
      setResult({ error: error.message });
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-4">
      <CardHeader>
        <CardTitle>Teste Credenciais Google</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={testCredentials} disabled={loading}>
          {loading ? 'Testando...' : 'Testar Credenciais'}
        </Button>
        
        {result && (
          <div className="p-4 bg-muted rounded-lg">
            <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}