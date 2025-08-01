import React, { useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';

interface SecretFormProps {
  name: string;
  onSubmit: (value: string) => void;
}

export function SecretForm({ name, onSubmit }: SecretFormProps) {
  const [value, setValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;

    setIsSubmitting(true);
    try {
      onSubmit(value);
      setValue('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Configurar {name}</CardTitle>
        <CardDescription>
          Por favor, insira sua chave da API do OpenAI para habilitar a análise de currículos com IA.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder={`Insira ${name}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={isSubmitting}
          />
          <Button 
            type="submit" 
            disabled={!value.trim() || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Configurando...' : 'Configurar Chave'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}