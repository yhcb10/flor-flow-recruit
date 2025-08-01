import { useState, useRef } from 'react';
import { Upload, FileText, X, CheckCircle, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useResumeExtraction } from '@/hooks/useResumeExtraction';

interface ExtractedData {
  name: string;
  email: string;
  phone: string;
  experience: string;
  skills: string[];
  education: string;
}

interface ResumeUploadProps {
  candidateId?: string;
  onUploadComplete?: (url: string, fileName: string) => void;
  onDataExtracted?: (data: ExtractedData) => void;
  maxSizeMB?: number;
}

export function ResumeUpload({ 
  candidateId, 
  onUploadComplete,
  onDataExtracted,
  maxSizeMB = 10 
}: ResumeUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { extractResumeData, isExtracting } = useResumeExtraction();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const validateFile = (file: File): string | null => {
    // Verificar tipo de arquivo
    const allowedTypes = ['application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return 'Apenas arquivos PDF são permitidos.';
    }

    // Verificar tamanho
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `Arquivo muito grande. Máximo ${maxSizeMB}MB.`;
    }

    return null;
  };

  const handleFileUpload = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      toast({
        title: "Erro no arquivo",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Função para remover acentos e caracteres especiais
      const sanitizeFileName = (fileName: string) => {
        return fileName
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove acentos
          .replace(/[^a-zA-Z0-9.-]/g, '_') // Substitui caracteres especiais por underscore
          .replace(/_+/g, '_') // Remove underscores duplicados
          .toLowerCase();
      };

      // Gerar nome único e sanitizado para o arquivo
      const timestamp = Date.now();
      const sanitizedFileName = sanitizeFileName(file.name);
      const fileName = `${candidateId || 'temp'}_${timestamp}_${sanitizedFileName}`;
      const filePath = `curriculums/${fileName}`;

      // Upload para o Supabase Storage
      const { data, error } = await supabase.storage
        .from('resumes')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Obter URL pública do arquivo
      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);

      setUploadProgress(100);
      setUploadedFile(publicUrl);
      
      toast({
        title: "Upload concluído",
        description: "Currículo enviado com sucesso!",
      });

      onUploadComplete?.(publicUrl, file.name);

      // Extrair dados automaticamente se a callback foi fornecida
      if (onDataExtracted) {
        try {
          toast({
            title: "Processando currículo",
            description: "Extraindo informações automaticamente...",
          });

          const result = await extractResumeData(file);
          
          console.log('Resultado da extração:', result);
          
          if (result.success) {
            // Verificar se temos dados válidos independente da confiança
            const hasValidData = result.data.name || result.data.email || result.data.phone || 
                                 result.data.experience || (result.data.skills && result.data.skills.length > 0);
            
            if (hasValidData) {
              onDataExtracted(result.data);
              toast({
                title: "Dados extraídos",
                description: result.confidence > 0 
                  ? `Informações extraídas com ${result.confidence}% de confiança.`
                  : "Informações extraídas automaticamente.",
              });
            } else {
              toast({
                title: "Extração parcial",
                description: "Poucos dados foram extraídos. Verifique as informações.",
                variant: "destructive",
              });
            }
          } else {
            toast({
              title: "Extração parcial",
              description: "Alguns dados foram extraídos. Verifique as informações.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error('Erro na extração:', error);
          toast({
            title: "Falha na extração",
            description: "Não foi possível extrair dados automaticamente.",
            variant: "destructive",
          });
        }
      }

    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: "Falha ao enviar o currículo. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  const clearUpload = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        {!uploadedFile ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-all
              ${isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
              }
              ${(isUploading || isExtracting) ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            `}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            
            <h3 className="text-lg font-semibold mb-2">
              {isUploading ? 'Enviando currículo...' : 
               isExtracting ? 'Processando dados...' : 'Envie o currículo'}
            </h3>
            
            <p className="text-muted-foreground mb-4">
              {isExtracting ? 'Extraindo informações automaticamente...' :
               'Arraste e solte o arquivo aqui ou clique para selecionar'}
            </p>
            
            <p className="text-sm text-muted-foreground">
              Formatos aceitos: PDF (máx. {maxSizeMB}MB)
            </p>

            {isUploading && (
              <div className="mt-6">
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-muted-foreground mt-2">
                  {uploadProgress}% concluído
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-success/10 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-success" />
              <div>
                <p className="font-medium text-success">Currículo enviado</p>
                <p className="text-sm text-muted-foreground">
                  Arquivo carregado com sucesso
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearUpload}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {!isUploading && !uploadedFile && (
          <Button 
            variant="outline" 
            className="w-full mt-4"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileText className="w-4 h-4 mr-2" />
            Selecionar arquivo
          </Button>
        )}
      </CardContent>
    </Card>
  );
}