import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

export function GoogleCredentialsSetup() {
  const [credentials, setCredentials] = useState({
    clientId: '',
    clientSecret: '',
    refreshToken: ''
  });
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<CredentialTestResult | null>(null);
  const [savedCredentials, setSavedCredentials] = useState({
    clientId: false,
    clientSecret: false,
    refreshToken: false
  });

  const handleInputChange = (field: keyof typeof credentials, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
  };

  const saveCredential = async (name: string, value: string) => {
    if (!value.trim()) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('update-secret', {
        body: { name, value }
      });
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Erro ao salvar ${name}:`, error);
      throw error;
    }
  };

  const handleSaveCredentials = async () => {
    setLoading(true);
    try {
      const promises = [];
      
      if (credentials.clientId.trim()) {
        promises.push(
          saveCredential('GOOGLE_CLIENT_ID', credentials.clientId).then(() => {
            setSavedCredentials(prev => ({ ...prev, clientId: true }));
          })
        );
      }
      
      if (credentials.clientSecret.trim()) {
        promises.push(
          saveCredential('GOOGLE_CLIENT_SECRET', credentials.clientSecret).then(() => {
            setSavedCredentials(prev => ({ ...prev, clientSecret: true }));
          })
        );
      }
      
      if (credentials.refreshToken.trim()) {
        promises.push(
          saveCredential('GOOGLE_REFRESH_TOKEN', credentials.refreshToken).then(() => {
            setSavedCredentials(prev => ({ ...prev, refreshToken: true }));
          })
        );
      }

      await Promise.all(promises);
      
      toast.success('Credenciais salvas com sucesso!');
      
      // Limpar campos após salvar
      setCredentials({ clientId: '', clientSecret: '', refreshToken: '' });
    } catch (error) {
      toast.error('Erro ao salvar credenciais');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestCredentials = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-google-credentials');
      
      if (error) throw error;
      
      setTestResult(data);
      
      if (data.diagnosis.status === 'valid') {
        toast.success('Credenciais válidas!');
      } else {
        toast.error(`Erro: ${data.diagnosis.message}`);
      }
    } catch (error) {
      toast.error('Erro ao testar credenciais');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRefreshToken = () => {
    window.open('https://burxedzkpugyavsqkzaj.supabase.co/functions/v1/get-google-refresh-token', '_blank');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'expired_or_invalid':
      case 'invalid_credentials':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuração das Credenciais Google</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="clientId">Google Client ID</Label>
              {savedCredentials.clientId && <Badge className="text-xs bg-green-100 text-green-800">Salvo</Badge>}
            </div>
            <Input
              id="clientId"
              value={credentials.clientId}
              onChange={(e) => handleInputChange('clientId', e.target.value)}
              placeholder="Seu Google Client ID"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="clientSecret">Google Client Secret</Label>
              {savedCredentials.clientSecret && <Badge className="text-xs bg-green-100 text-green-800">Salvo</Badge>}
            </div>
            <Input
              id="clientSecret"
              type="password"
              value={credentials.clientSecret}
              onChange={(e) => handleInputChange('clientSecret', e.target.value)}
              placeholder="Seu Google Client Secret"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="refreshToken">Google Refresh Token</Label>
              {savedCredentials.refreshToken && <Badge className="text-xs bg-green-100 text-green-800">Salvo</Badge>}
            </div>
            <Input
              id="refreshToken"
              type="password"
              value={credentials.refreshToken}
              onChange={(e) => handleInputChange('refreshToken', e.target.value)}
              placeholder="Seu Google Refresh Token"
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleSaveCredentials} 
              disabled={loading}
              className="flex-1"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar Credenciais
            </Button>
            <Button 
              onClick={getRefreshToken} 
              variant="outline"
              className="flex-1"
            >
              Obter Refresh Token
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teste das Credenciais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleTestCredentials} disabled={loading} className="w-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Testar Credenciais
          </Button>

          {testResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getStatusIcon(testResult.diagnosis.status)}
                <Badge className={getStatusColor(testResult.diagnosis.status)}>
                  {testResult.diagnosis.status.toUpperCase()}
                </Badge>
              </div>
              
              <p className="text-sm text-gray-600">
                {testResult.diagnosis.message}
              </p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Client ID:</strong> {testResult.credentials.clientIdPresent ? '✅ Presente' : '❌ Ausente'}
                </div>
                <div>
                  <strong>Client Secret:</strong> {testResult.credentials.clientSecretPresent ? '✅ Presente' : '❌ Ausente'}
                </div>
                <div>
                  <strong>Refresh Token:</strong> {testResult.credentials.refreshTokenPresent ? '✅ Presente' : '❌ Ausente'}
                </div>
                <div>
                  <strong>Access Token Test:</strong> {testResult.credentials.accessTokenTest === true ? '✅ Válido' : testResult.credentials.accessTokenTest === false ? '❌ Inválido' : '⏳ Não testado'}
                </div>
              </div>

              {testResult.credentials.clientIdStart && (
                <p className="text-xs text-gray-500">
                  Client ID: {testResult.credentials.clientIdStart}...
                </p>
              )}

              {testResult.credentials.refreshTokenStart && (
                <p className="text-xs text-gray-500">
                  Refresh Token: {testResult.credentials.refreshTokenStart}...
                </p>
              )}

              {testResult.credentials.errorDetails && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                  <h4 className="font-medium text-red-800">Detalhes do Erro:</h4>
                  <pre className="text-xs text-red-600 mt-1">
                    {JSON.stringify(testResult.credentials.errorDetails, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Como obter as credenciais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>1. Acesse o <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a></p>
          <p>2. Crie um projeto ou selecione um existente</p>
          <p>3. Habilite as APIs do Google Calendar e Gmail</p>
          <p>4. Vá em "Credenciais" e crie uma credencial OAuth 2.0</p>
          <p>5. Configure as URLs de redirecionamento autorizadas</p>
          <p>6. Use o botão "Obter Refresh Token" para gerar o refresh token</p>
        </CardContent>
      </Card>
    </div>
  );
}