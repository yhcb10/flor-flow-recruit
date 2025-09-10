import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TokenStatus {
  has_access_token: boolean;
  access_token_valid: boolean;
  expires_at?: string;
  expires_in_minutes?: number;
  next_refresh?: string;
}

export function GoogleTokenStatus() {
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);

  const checkTokenStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('refresh-google-token');
      
      if (error) throw error;
      
      const now = new Date();
      const expiresAt = data.expires_at ? new Date(data.expires_at) : null;
      const expiresInMinutes = expiresAt ? Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60)) : null;
      
      setTokenStatus({
        has_access_token: !!data.access_token,
        access_token_valid: data.success && !!data.access_token,
        expires_at: data.expires_at,
        expires_in_minutes: expiresInMinutes,
        next_refresh: expiresInMinutes && expiresInMinutes > 5 ? 
          new Date(now.getTime() + (expiresInMinutes - 5) * 60000).toISOString() : 
          now.toISOString()
      });

      if (data.source === 'refreshed') {
        toast.success('Token renovado automaticamente');
      }
      
    } catch (error: any) {
      console.error('Erro ao verificar status do token:', error);
      toast.error(`Erro: ${error.message}`);
      setTokenStatus({
        has_access_token: false,
        access_token_valid: false
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: boolean | undefined) => {
    if (status === undefined) return 'secondary';
    return status ? 'default' : 'destructive';
  };

  const getStatusIcon = (status: boolean | undefined) => {
    if (status === undefined) return <Clock className="h-4 w-4" />;
    return status ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />;
  };

  const formatTimeRemaining = (minutes: number | undefined) => {
    if (!minutes) return 'Não disponível';
    if (minutes < 0) return 'Expirado';
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };

  // Auto-refresh logic
  useEffect(() => {
    if (!autoRefreshEnabled || !tokenStatus?.expires_in_minutes) return;

    const refreshInterval = tokenStatus.expires_in_minutes > 10 ? 
      (tokenStatus.expires_in_minutes - 5) * 60 * 1000 : // Refresh 5 minutes before expiry
      5 * 60 * 1000; // Or every 5 minutes if close to expiry

    const timer = setTimeout(() => {
      checkTokenStatus();
    }, refreshInterval);

    return () => clearTimeout(timer);
  }, [tokenStatus, autoRefreshEnabled]);

  useEffect(() => {
    checkTokenStatus();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Status dos Tokens Google
          <Button
            variant="outline"
            size="sm"
            onClick={checkTokenStatus}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Verificar
          </Button>
        </CardTitle>
        <CardDescription>
          Monitoramento automático dos tokens de acesso do Google
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {tokenStatus && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Access Token</span>
                <Badge variant={getStatusColor(tokenStatus.access_token_valid)}>
                  {getStatusIcon(tokenStatus.access_token_valid)}
                  {tokenStatus.access_token_valid ? 'Válido' : 'Inválido'}
                </Badge>
              </div>
              
              {tokenStatus.expires_in_minutes !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Expira em</span>
                  <Badge variant={tokenStatus.expires_in_minutes > 30 ? 'default' : 'destructive'}>
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTimeRemaining(tokenStatus.expires_in_minutes)}
                  </Badge>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Auto Refresh</span>
                <Button
                  variant={autoRefreshEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                >
                  {autoRefreshEnabled ? 'Ativo' : 'Inativo'}
                </Button>
              </div>

              {tokenStatus.next_refresh && autoRefreshEnabled && (
                <div className="text-xs text-muted-foreground">
                  Próximo refresh: {new Date(tokenStatus.next_refresh).toLocaleTimeString('pt-BR')}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground border-t pt-4">
          <p><strong>Sistema Automático:</strong> Os tokens são renovados automaticamente 5 minutos antes de expirarem.</p>
          <p><strong>Duração:</strong> Access tokens duram ~1 hora e são renovados usando o refresh token permanente.</p>
        </div>
      </CardContent>
    </Card>
  );
}