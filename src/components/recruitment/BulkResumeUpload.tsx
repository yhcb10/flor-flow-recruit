import { useRef } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useBulkResumeUpload } from '@/hooks/useBulkResumeUpload';

interface BulkResumeUploadProps {
  positionId: string;
  positionTitle: string;
  onProcessingComplete?: (totalProcessed: number, totalErrors: number) => void;
  maxSizeMB?: number;
}

export function BulkResumeUpload({ 
  positionId,
  positionTitle,
  onProcessingComplete,
  maxSizeMB = 10 
}: BulkResumeUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    files,
    isProcessing,
    currentProcessing,
    progress,
    addFiles,
    processAllFiles,
    removeFile,
    clearAll,
    getStats
  } = useBulkResumeUpload();

  const stats = getStats();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles, maxSizeMB);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      addFiles(Array.from(selectedFiles), maxSizeMB);
    }
  };

  const handleProcessAll = async () => {
    await processAllFiles(positionId, positionTitle, onProcessingComplete);
  };

  const getStatusIcon = (status: 'pending' | 'processing' | 'completed' | 'error') => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      case 'processing':
        return <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload em Massa - {positionTitle}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-all
            border-muted-foreground/25 hover:border-primary/50
            ${isProcessing ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          `}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">
            Adicionar Currículos
          </h3>
          <p className="text-muted-foreground mb-2">
            Arraste múltiplos arquivos aqui ou clique para selecionar
          </p>
          <p className="text-sm text-muted-foreground">
            Formatos aceitos: PDF (máx. {maxSizeMB}MB cada)
          </p>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {stats.total} arquivo(s) | 
                {stats.pending} pendente(s) | 
                {stats.completed} concluído(s) | 
                {stats.error} erro(s)
              </div>
              <div className="flex gap-2">
                {!isProcessing && stats.pending > 0 && (
                  <Button onClick={handleProcessAll} size="sm">
                    Processar Todos
                  </Button>
                )}
                <Button 
                  onClick={clearAll} 
                  variant="outline" 
                  size="sm"
                  disabled={isProcessing}
                >
                  Limpar Tudo
                </Button>
              </div>
            </div>

            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Processando: {currentProcessing}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}

            <div className="max-h-60 overflow-y-auto space-y-2">
              {files.map((file) => (
                <div 
                  key={file.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(file.status)}
                    <div>
                      <p className="font-medium text-sm">{file.name}</p>
                      {file.error && (
                        <p className="text-xs text-red-600">{file.error}</p>
                      )}
                    </div>
                  </div>
                  
                  {!isProcessing && file.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {files.length === 0 && (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileText className="w-4 h-4 mr-2" />
            Selecionar Múltiplos Arquivos
          </Button>
        )}
      </CardContent>
    </Card>
  );
}