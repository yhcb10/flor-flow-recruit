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
      // Converter o arquivo PDF para base64 e enviar para a edge function processar
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      // Chamar edge function para extrair texto do PDF
      const { data, error } = await supabase.functions.invoke('extract-resume-data', {
        body: {
          pdfData: base64,
          fileName: file.name
        }
      });

      if (error) {
        throw error;
      }

      return data.extractedText || '';
    } catch (error) {
      console.error('Erro ao extrair texto do PDF:', error);
      throw new Error('Falha ao processar PDF');
    }
  };

  const extractResumeData = async (file: File): Promise<ExtractionResult> => {
    setIsExtracting(true);
    
    try {
      // Converter o arquivo PDF para base64 e enviar diretamente para a edge function
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      // Chamar edge function com o PDF em base64
      const { data, error } = await supabase.functions.invoke('extract-resume-data', {
        body: {
          pdfData: base64,
          fileName: file.name
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