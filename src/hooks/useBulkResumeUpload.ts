import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProcessedFile {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  file?: File;
}

export function useBulkResumeUpload() {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessing, setCurrentProcessing] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const sanitizeFileName = (fileName: string) => {
    return fileName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
  };

  const validateFile = (file: File, maxSizeMB: number = 10): string | null => {
    const allowedTypes = ['application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return 'Apenas arquivos PDF são permitidos.';
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `Arquivo muito grande. Máximo ${maxSizeMB}MB.`;
    }

    return null;
  };

  const addFiles = (fileList: File[], maxSizeMB: number = 10) => {
    const validFiles: ProcessedFile[] = [];
    const errors: string[] = [];

    fileList.forEach((file, index) => {
      const validationError = validateFile(file, maxSizeMB);
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`);
      } else {
        validFiles.push({
          id: `${Date.now()}-${index}`,
          name: file.name,
          status: 'pending',
          file: file
        });
      }
    });

    if (errors.length > 0) {
      toast({
        title: "Alguns arquivos foram rejeitados",
        description: errors.join(', '),
        variant: "destructive",
      });
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      toast({
        title: `${validFiles.length} arquivo(s) adicionado(s)`,
        description: "Clique em 'Processar Todos' para iniciar o envio.",
      });
    }
  };

  const processFile = async (
    processedFile: ProcessedFile,
    positionId: string,
    positionTitle: string,
    source: 'indeed' | 'linkedin'
  ): Promise<boolean> => {
    if (!processedFile.file) return false;

    try {
      // Update status to processing
      setFiles(prev => prev.map(f => 
        f.id === processedFile.id 
          ? { ...f, status: 'processing' }
          : f
      ));
      setCurrentProcessing(processedFile.name);

      // Buscar a vaga por id (UUID) ou endpoint_id (string do N8N)
      const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
      const byUuid = isUuid(positionId);
      console.log(`🔍 Resolvendo vaga. Valor recebido: ${positionId} (é UUID? ${byUuid})`);

      let jobPosition: { id?: string; endpoint_id?: string; title?: string } | null = null;
      let jobError: any = null;

      if (byUuid) {
        const { data, error } = await supabase
          .from('job_positions')
          .select('id, endpoint_id, title')
          .eq('id', positionId)
          .maybeSingle();
        jobPosition = data;
        jobError = error;
      } else {
        const { data, error } = await supabase
          .from('job_positions')
          .select('id, endpoint_id, title')
          .eq('endpoint_id', positionId)
          .maybeSingle();
        jobPosition = data;
        jobError = error;
      }

      console.log('📋 Vaga encontrada:', jobPosition);
      console.log('❌ Erro ao buscar vaga:', jobError);

      if (jobError) {
        throw new Error(`Erro ao buscar vaga: ${jobError.message}`);
      }

      const endpointForN8n = jobPosition?.endpoint_id || (byUuid ? null : positionId);

      if (!endpointForN8n) {
        throw new Error(`Não foi possível determinar o endpoint_id para a vaga. Configure o endpoint_id nas configurações da vaga.`);
      }

      // Upload file to Supabase Storage
      const timestamp = Date.now();
      const sanitizedFileName = sanitizeFileName(processedFile.file.name);
      const fileName = `temp_${timestamp}_${sanitizedFileName}`;
      const filePath = `curriculums/${fileName}`;

      const { data, error } = await supabase.storage
        .from('resumes')
        .upload(filePath, processedFile.file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);

      console.log(`📤 Enviando currículo para N8N:`, {
        resumeUrl: publicUrl,
        fileName: processedFile.file.name,
        positionId: endpointForN8n,
        positionTitle: positionTitle,
        source: source
      });

      // Send to N8N for analysis - sempre enviar endpoint_id
      const { data: n8nResponse, error: n8nError } = await supabase.functions.invoke('send-resume-to-n8n', {
        body: {
          resumeUrl: publicUrl,
          fileName: processedFile.file.name,
          positionId: endpointForN8n,
          positionTitle: positionTitle,
          source: source
        }
      });

      if (n8nError) {
        throw n8nError;
      }

      console.log(`✅ Currículo enviado com sucesso para N8N`);

      // Update status to completed
      setFiles(prev => prev.map(f => 
        f.id === processedFile.id 
          ? { ...f, status: 'completed' }
          : f
      ));

      return true;

    } catch (error) {
      console.error(`❌ Erro ao processar ${processedFile.name}:`, error);
      
      // Update status to error
      setFiles(prev => prev.map(f => 
        f.id === processedFile.id 
          ? { 
              ...f, 
              status: 'error',
              error: error instanceof Error ? error.message : 'Erro desconhecido'
            }
          : f
      ));

      return false;
    }
  };

  const processAllFiles = async (
    positionId: string,
    positionTitle: string,
    source: 'indeed' | 'linkedin',
    onComplete?: (processed: number, errors: number) => void
  ) => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    console.log(`📊 [BULK UPLOAD] Verificando arquivos pendentes...`);
    console.log(`📊 [BULK UPLOAD] Total de arquivos: ${files.length}`);
    console.log(`📊 [BULK UPLOAD] Arquivos pendentes: ${pendingFiles.length}`);
    console.log(`📊 [BULK UPLOAD] Position ID: ${positionId}`);
    console.log(`📊 [BULK UPLOAD] Position Title: ${positionTitle}`);
    
    if (pendingFiles.length === 0) {
      console.log(`⚠️ [BULK UPLOAD] Nenhum arquivo pendente para processar`);
      toast({
        title: "Nenhum arquivo pendente",
        description: "Adicione arquivos antes de processar.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    let processed = 0;
    let errors = 0;

    console.log(`🚀 [BULK UPLOAD] Iniciando processamento de ${pendingFiles.length} arquivo(s)`);
    console.log(`📍 [BULK UPLOAD] Fonte selecionada: ${source}`);

    for (let i = 0; i < pendingFiles.length; i++) {
      const file = pendingFiles[i];
      console.log(`🔄 [BULK UPLOAD] [${i + 1}/${pendingFiles.length}] Processando: ${file.name}`);
      
      try {
        const success = await processFile(file, positionId, positionTitle, source);
        
        if (success) {
          processed++;
          console.log(`✅ [BULK UPLOAD] [${i + 1}/${pendingFiles.length}] Sucesso: ${file.name}`);
        } else {
          errors++;
          console.log(`❌ [BULK UPLOAD] [${i + 1}/${pendingFiles.length}] Falha: ${file.name}`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ [BULK UPLOAD] [${i + 1}/${pendingFiles.length}] Erro não capturado:`, error);
      }
      
      const newProgress = ((i + 1) / pendingFiles.length) * 100;
      setProgress(newProgress);
      console.log(`📈 [BULK UPLOAD] Progresso: ${Math.round(newProgress)}%`);
      
      // Small delay between files to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    setCurrentProcessing(null);
    setIsProcessing(false);

    console.log(`✨ [BULK UPLOAD] Processamento concluído!`);
    console.log(`✨ [BULK UPLOAD] Sucessos: ${processed}`);
    console.log(`✨ [BULK UPLOAD] Erros: ${errors}`);
    console.log(`✨ [BULK UPLOAD] Total: ${processed + errors}`);

    toast({
      title: "Processamento concluído",
      description: `${processed} arquivo(s) processado(s) com sucesso. ${errors > 0 ? `${errors} erro(s).` : ''}`,
      variant: errors > 0 ? "destructive" : "default"
    });

    onComplete?.(processed, errors);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearAll = () => {
    setFiles([]);
    setProgress(0);
    setCurrentProcessing(null);
  };

  const getStats = () => {
    const total = files.length;
    const pending = files.filter(f => f.status === 'pending').length;
    const completed = files.filter(f => f.status === 'completed').length;
    const error = files.filter(f => f.status === 'error').length;
    const processing = files.filter(f => f.status === 'processing').length;

    return { total, pending, completed, error, processing };
  };

  return {
    files,
    isProcessing,
    currentProcessing,
    progress,
    addFiles,
    processAllFiles,
    removeFile,
    clearAll,
    getStats
  };
}