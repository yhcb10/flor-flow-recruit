import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

interface GoogleCredentialsTestProps {
  onRefreshTokenExpired?: () => void;
}

export function GoogleCredentialsTest({ onRefreshTokenExpired }: GoogleCredentialsTestProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const handleTestCredentials = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-google-credentials');
      
      if (error) {
        console.error('Erro ao testar credenciais:', error);
        return;
      }
      
      setTestResult(data);
      
      // Se o refresh token expirou, notificar o componente pai
      if (data.diagnosis.status === 'expired_or_invalid' && onRefreshTokenExpired) {
        onRefreshTokenExpired();
      }
      
    } catch (error) {
      console.error('Erro na função de teste:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'expired_or_invalid':
      case 'invalid_credentials':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'network_error':
      case 'unknown_error':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <RefreshCw className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'bg-green-100 text-green-800';
      case 'expired_or_invalid':
      case 'invalid_credentials':
        return 'bg-red-100 text-red-800';
      case 'network_error':
      case 'unknown_error':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Diagnóstico das Credenciais Google
          {testResult && getStatusIcon(testResult.diagnosis.status)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleTestCredentials} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Testando...
            </>
          ) : (
            'Testar Credenciais Google'
          )}
        </Button>

        {testResult && (
          <div className="space-y-4">
            <Alert>
              <div className="flex items-center gap-2">
                {getStatusIcon(testResult.diagnosis.status)}
                <AlertDescription>
                  {testResult.diagnosis.message}
                </AlertDescription>
              </div>
            </Alert>

            <div className="grid gap-3">
              <h4 className="font-semibold">Status das Credenciais:</h4>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span>Google Client ID</span>
                <Badge variant={testResult.credentials.clientIdPresent ? 'default' : 'destructive'}>
                  {testResult.credentials.clientIdPresent ? 'Configurado' : 'Faltando'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span>Google Client Secret</span>
                <Badge variant={testResult.credentials.clientSecretPresent ? 'default' : 'destructive'}>
                  {testResult.credentials.clientSecretPresent ? 'Configurado' : 'Faltando'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span>Google Refresh Token</span>
                <Badge variant={testResult.credentials.refreshTokenPresent ? 'default' : 'destructive'}>
                  {testResult.credentials.refreshTokenPresent ? 'Configurado' : 'Faltando'}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span>Status do Token</span>
                <Badge className={getStatusColor(testResult.diagnosis.status)}>
                  {testResult.diagnosis.status}
                </Badge>
              </div>
            </div>

            {testResult.diagnosis.status === 'expired_or_invalid' && (
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  <strong>Ação Necessária:</strong> O refresh token expirou. 
                  Você precisa acessar a função <code>get-google-refresh-token</code> no Supabase 
                  para obter um novo refresh token.
                </AlertDescription>
              </Alert>
            )}

            {testResult.credentials.errorDetails && (
              <details className="mt-4">
                <summary className="cursor-pointer font-medium">Detalhes do Erro</summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-sm overflow-auto">
                  {JSON.stringify(testResult.credentials.errorDetails, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}