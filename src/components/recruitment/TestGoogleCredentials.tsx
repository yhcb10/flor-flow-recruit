import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface CredentialTestResult {
  credentials: {
    clientIdPresent: boolean;
    clientSecretPresent: boolean;
    refreshTokenPresent: boolean;
    clientIdStart: string | null;
    refreshTokenStart: string | null;
    accessTokenTest: boolean | null;
    refreshTokenStatus: string;
    errorDetails: any;
  };
  diagnosis: {
    status: string;
    message: string;
  };
}

export function TestGoogleCredentials() {
  const [testResult, setTestResult] = useState<CredentialTestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTestCredentials = async () => {
    setLoading(true);
    try {
      console.log('Testando credenciais do Google...');
      const response = await supabase.functions.invoke('test-google-credentials');
      
      console.log('Resposta completa do teste:', JSON.stringify(response, null, 2));
      console.log('Dados da resposta:', response.data);
      console.log('Erro da resposta:', response.error);
      
      if (response.error) {
        console.error('Erro na resposta:', response.error);
        setTestResult({
          credentials: {
            clientIdPresent: false,
            clientSecretPresent: false,
            refreshTokenPresent: false,
            clientIdStart: null,
            refreshTokenStart: null,
            accessTokenTest: null,
            refreshTokenStatus: 'error',
            errorDetails: response.error
          },
          diagnosis: {
            status: 'error',
            message: `Erro na função: ${JSON.stringify(response.error)}`
          }
        });
      } else {
        setTestResult(response.data);
      }
    } catch (error) {
      console.error('Erro ao testar credenciais:', error);
      setTestResult({
        credentials: {
          clientIdPresent: false,
          clientSecretPresent: false,
          refreshTokenPresent: false,
          clientIdStart: null,
          refreshTokenStart: null,
          accessTokenTest: null,
          refreshTokenStatus: 'exception',
          errorDetails: { message: error.message, stack: error.stack }
        },
        diagnosis: {
          status: 'exception',
          message: `Erro de execução: ${error.message}`
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'expired_or_invalid':
      case 'invalid_credentials':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'bg-green-100 text-green-800';
      case 'expired_or_invalid':
      case 'invalid_credentials':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Teste de Credenciais do Google
        </CardTitle>
        <CardDescription>
          Verifique se as credenciais do Google Calendar e Gmail estão configuradas corretamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleTestCredentials} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Testando...' : 'Testar Credenciais'}
        </Button>

        {testResult && (
          <div className="space-y-4">
            {/* Diagnóstico */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon(testResult.diagnosis.status)}
                <Badge className={getStatusColor(testResult.diagnosis.status)}>
                  {testResult.diagnosis.status}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">
                {testResult.diagnosis.message}
              </p>
            </div>

            {/* Detalhes das credenciais */}
            <div className="space-y-2">
              <h4 className="font-medium">Status das Credenciais:</h4>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Client ID:</span>
                  <Badge variant={testResult.credentials.clientIdPresent ? "default" : "destructive"}>
                    {testResult.credentials.clientIdPresent ? "Presente" : "Ausente"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Client Secret:</span>
                  <Badge variant={testResult.credentials.clientSecretPresent ? "default" : "destructive"}>
                    {testResult.credentials.clientSecretPresent ? "Presente" : "Ausente"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Refresh Token:</span>
                  <Badge variant={testResult.credentials.refreshTokenPresent ? "default" : "destructive"}>
                    {testResult.credentials.refreshTokenPresent ? "Presente" : "Ausente"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Access Token Test:</span>
                  <Badge variant={testResult.credentials.accessTokenTest ? "default" : "destructive"}>
                    {testResult.credentials.accessTokenTest ? "Sucesso" : "Falha"}
                  </Badge>
                </div>
              </div>

              {testResult.credentials.clientIdStart && (
                <p className="text-xs text-gray-500">
                  Client ID início: {testResult.credentials.clientIdStart}...
                </p>
              )}

              {testResult.credentials.refreshTokenStart && (
                <p className="text-xs text-gray-500">
                  Refresh Token início: {testResult.credentials.refreshTokenStart}...
                </p>
              )}
            </div>

            {/* Detalhes do erro */}
            {testResult.credentials.errorDetails && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-800 mb-2">Detalhes do Erro:</h4>
                <pre className="text-xs text-red-600 whitespace-pre-wrap">
                  {JSON.stringify(testResult.credentials.errorDetails, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}