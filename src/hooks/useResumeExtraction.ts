import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ExtractedData {
  name: string;
  email: string;
  phone: string;
  experience: string;
  skills: string[];
  education: string;
}

interface ExtractionResult {
  success: boolean;
  data: ExtractedData;
  confidence: number;
}

export function useResumeExtraction() {
  const [isExtracting, setIsExtracting] = useState(false);

  const extractPdfText = async (file: File): Promise<string> => {
    try {
      // Para a web, vamos usar uma abordagem diferente
      // Não podemos usar pdf-parse diretamente no frontend
      // Vamos ler como array buffer e enviar para a edge function
      const arrayBuffer = await file.arrayBuffer();
      
      // Por enquanto, vamos simular a extração de texto
      // Em produção, você pode usar uma biblioteca como PDF.js
      return `Simulação de texto extraído do PDF: ${file.name}
Nome: João Silva
Email: joao.silva@email.com
Telefone: (11) 99999-9999
Experiência: 5 anos de experiência em floricultura
Habilidades: arranjos florais, decoração, atendimento ao cliente
Formação: Ensino médio completo`;
    } catch (error) {
      console.error('Erro ao extrair texto do PDF:', error);
      throw new Error('Falha ao processar PDF');
    }
  };

  const extractResumeData = async (file: File): Promise<ExtractionResult> => {
    setIsExtracting(true);
    
    try {
      // Extrair texto do PDF
      const resumeText = await extractPdfText(file);
      
      // Chamar edge function para processar o texto
      const { data, error } = await supabase.functions.invoke('extract-resume-data', {
        body: {
          resumeText: resumeText,
          resumeUrl: null
        }
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erro na extração de dados:', error);
      throw new Error('Falha ao extrair dados do currículo');
    } finally {
      setIsExtracting(false);
    }
  };

  return {
    extractResumeData,
    isExtracting
  };
}