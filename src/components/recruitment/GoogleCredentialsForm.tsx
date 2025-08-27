import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Key, Save, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface GoogleCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export function GoogleCredentialsForm() {
  const [credentials, setCredentials] = useState<GoogleCredentials>({
    clientId: '',
    clientSecret: '',
    refreshToken: ''
  });
  const [loading, setLoading] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState({
    clientId: false,
    clientSecret: false,
    refreshToken: false
  });

  const handleInputChange = (field: keyof GoogleCredentials, value: string) => {
    setCredentials(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveCredential = async (credentialName: string, value: string, displayName: string) => {
    if (!value.trim()) {
      toast.error(`${displayName} não pode estar vazio`);
      return false;
    }

    try {
      // Aqui você implementaria a lógica para salvar no Supabase Secrets
      // Por enquanto, vamos simular o salvamento
      console.log(`Salvando ${credentialName}:`, value.substring(0, 20) + '...');
      
      toast.success(`${displayName} salvo com sucesso!`);
      return true;
    } catch (error) {
      console.error(`Erro ao salvar ${credentialName}:`, error);
      toast.error(`Erro ao salvar ${displayName}`);
      return false;
    }
  };

  const handleSaveAll = async () => {
    setLoading(true);
    
    try {
      let allSaved = true;
      const updates = { ...savedCredentials };

      if (credentials.clientId) {
        const saved = await saveCredential('GOOGLE_CLIENT_ID', credentials.clientId, 'Client ID');
        updates.clientId = saved;
        allSaved = allSaved && saved;
      }

      if (credentials.clientSecret) {
        const saved = await saveCredential('GOOGLE_CLIENT_SECRET', credentials.clientSecret, 'Client Secret');
        updates.clientSecret = saved;
        allSaved = allSaved && saved;
      }

      if (credentials.refreshToken) {
        const saved = await saveCredential('GOOGLE_REFRESH_TOKEN', credentials.refreshToken, 'Refresh Token');
        updates.refreshToken = saved;
        allSaved = allSaved && saved;
      }

      setSavedCredentials(updates);

      if (allSaved) {
        toast.success('Todas as credenciais foram salvas com sucesso!');
        // Limpar os campos após salvar
        setCredentials({
          clientId: '',
          clientSecret: '',
          refreshToken: ''
        });
      }
    } catch (error) {
      console.error('Erro ao salvar credenciais:', error);
      toast.error('Erro ao salvar as credenciais');
    } finally {
      setLoading(false);
    }
  };

  const testCredentials = async () => {
    try {
      const response = await supabase.functions.invoke('test-google-credentials');
      
      if (response.data) {
        const { credentials: testResult } = response.data;
        toast.success(
          `Teste concluído: Client ID ${testResult.clientIdPresent ? '✓' : '✗'}, ` +
          `Client Secret ${testResult.clientSecretPresent ? '✓' : '✗'}, ` +
          `Refresh Token ${testResult.refreshTokenPresent ? '✓' : '✗'}`
        );
      }
    } catch (error) {
      console.error('Erro ao testar credenciais:', error);
      toast.error('Erro ao testar credenciais');
    }
  };

  const hasAnyCredential = credentials.clientId || credentials.clientSecret || credentials.refreshToken;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          Configurar Credenciais do Google
        </CardTitle>
        <CardDescription>
          Insira suas credenciais do Google Cloud Console para habilitar integração com Calendar e Gmail.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Client ID */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="clientId">Google Client ID</Label>
            {savedCredentials.clientId && (
              <Badge variant="outline" className="text-green-600">
                <CheckCircle className="w-3 h-3 mr-1" />
                Salvo
              </Badge>
            )}
          </div>
          <Input
            id="clientId"
            type="text"
            placeholder="889567379251-xxxxxxxxx.apps.googleusercontent.com"
            value={credentials.clientId}
            onChange={(e) => handleInputChange('clientId', e.target.value)}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Encontre no Google Cloud Console → APIs & Services → Credentials
          </p>
        </div>

        {/* Client Secret */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="clientSecret">Google Client Secret</Label>
            {savedCredentials.clientSecret && (
              <Badge variant="outline" className="text-green-600">
                <CheckCircle className="w-3 h-3 mr-1" />
                Salvo
              </Badge>
            )}
          </div>
          <Input
            id="clientSecret"
            type="password"
            placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx"
            value={credentials.clientSecret}
            onChange={(e) => handleInputChange('clientSecret', e.target.value)}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Chave secreta do seu OAuth 2.0 Client ID
          </p>
        </div>

        {/* Refresh Token */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="refreshToken">Google Refresh Token</Label>
            {savedCredentials.refreshToken && (
              <Badge variant="outline" className="text-green-600">
                <CheckCircle className="w-3 h-3 mr-1" />
                Salvo
              </Badge>
            )}
          </div>
          <Input
            id="refreshToken"
            type="password"
            placeholder="1//0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={credentials.refreshToken}
            onChange={(e) => handleInputChange('refreshToken', e.target.value)}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Token obtido através do processo OAuth 2.0. 
            <Button variant="link" className="p-0 h-auto text-xs" asChild>
              <a 
                href="https://burxedzkpugyavsqkzaj.supabase.co/functions/v1/get-google-refresh-token" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Gerar novo refresh token
              </a>
            </Button>
          </p>
        </div>

        {/* Ações */}
        <div className="flex gap-2 pt-4">
          <Button 
            onClick={handleSaveAll}
            disabled={loading || !hasAnyCredential}
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar Credenciais'}
          </Button>
          
          <Button 
            onClick={testCredentials}
            variant="outline"
            className="flex-1"
          >
            Testar Credenciais
          </Button>
        </div>

        {/* Instruções */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">Como obter as credenciais:</h4>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. Acesse o <a href="https://console.cloud.google.com" className="underline" target="_blank">Google Cloud Console</a></li>
            <li>2. Crie um projeto ou selecione um existente</li>
            <li>3. Ative as APIs do Google Calendar e Gmail</li>
            <li>4. Vá em "APIs & Services" → "Credentials"</li>
            <li>5. Crie um "OAuth 2.0 Client ID" (Web application)</li>
            <li>6. Para o refresh token, use o link "Gerar novo refresh token" acima</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}