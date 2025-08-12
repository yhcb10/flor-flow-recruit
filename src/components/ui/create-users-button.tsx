import React, { useState } from 'react';
import { Button } from './button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users } from 'lucide-react';

export function CreateUsersButton() {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const handleCreateUsers = async () => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-default-users');

      if (error) {
        throw error;
      }

      const response = data;
      if (response.success) {
        const createdCount = response.results.filter((r: any) => r.status === 'created').length;
        const existingCount = response.results.filter((r: any) => r.status === 'already_exists').length;
        const errorCount = response.results.filter((r: any) => r.status === 'error').length;

        let message = '';
        if (createdCount > 0) message += `${createdCount} usuários criados com sucesso. `;
        if (existingCount > 0) message += `${existingCount} usuários já existiam. `;
        if (errorCount > 0) message += `${errorCount} erros encontrados.`;

        toast({
          title: "Usuários Processados",
          description: message,
          variant: errorCount > 0 ? "destructive" : "default",
        });

        // Log detailed results
        console.log('User creation results:', response.results);
      } else {
        throw new Error(response.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      console.error('Error creating users:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar usuários",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Button
      onClick={handleCreateUsers}
      disabled={isCreating}
      variant="outline"
      className="flex items-center gap-2"
    >
      {isCreating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Criando Usuários...
        </>
      ) : (
        <>
          <Users className="h-4 w-4" />
          Criar Usuários Padrão
        </>
      )}
    </Button>
  );
}