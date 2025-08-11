import { FileText, Download, ExternalLink, AlertCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState, useEffect } from 'react';

interface PDFViewerProps {
  pdfUrl: string;
  fileName?: string;
}

export function PDFViewer({ pdfUrl, fileName }: PDFViewerProps) {
  const [showFallback, setShowFallback] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    setShowFallback(false);
    
    // Test if PDF can be loaded
    if (pdfUrl) {
      const timer = setTimeout(() => {
        setIsLoading(false);
        setShowFallback(true);
      }, 3000); // Show fallback after 3 seconds if not loaded

      return () => clearTimeout(timer);
    } else {
      setIsLoading(false);
    }
  }, [pdfUrl]);

  if (!pdfUrl) {
    return (
      <Card className="h-96">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum currículo disponível</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[600px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {fileName || 'Currículo'}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(pdfUrl, '_blank')}
              className="flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Abrir
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const link = document.createElement('a');
                link.href = pdfUrl;
                link.download = fileName || 'curriculum.pdf';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="flex items-center gap-1"
            >
              <Download className="h-3 w-3" />
              Baixar
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 h-[calc(100%-60px)]">
        {showFallback ? (
          <div className="h-full flex flex-col gap-4">
            <Alert>
              <Eye className="h-4 w-4" />
              <AlertDescription>
                Para melhor visualização, use o botão "Abrir" acima para ver o PDF em uma nova aba.
              </AlertDescription>
            </Alert>
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-muted/20 to-muted/40 rounded-lg border-2 border-dashed border-muted">
              <div className="text-center space-y-4">
                <FileText className="h-20 w-20 mx-auto text-muted-foreground/40" />
                <div>
                  <p className="text-lg font-medium text-foreground">Currículo Disponível</p>
                  <p className="text-sm text-muted-foreground mb-4">Clique em "Abrir" para visualizar</p>
                  <Button 
                    onClick={() => window.open(pdfUrl, '_blank')}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Visualizar PDF
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-2 flex items-center justify-center bg-background/80 rounded-lg z-10">
                <div className="text-center">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Carregando PDF...</p>
                </div>
              </div>
            )}
            <iframe
              src={`${pdfUrl}#view=FitH&toolbar=1`}
              className="w-full h-full rounded-lg border"
              title="Visualização do Currículo"
              onLoad={() => {
                setIsLoading(false);
                setShowFallback(false);
              }}
              onError={() => {
                setIsLoading(false);
                setShowFallback(true);
              }}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}