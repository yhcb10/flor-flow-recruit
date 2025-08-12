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

  // Check if it's a Google Drive link
  const isGoogleDriveLink = pdfUrl?.includes('drive.google.com');
  
  // Convert Google Drive link to direct view link
  const getViewableUrl = (url: string) => {
    if (url.includes('drive.google.com')) {
      const fileId = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] || 
                     url.match(/id=([a-zA-Z0-9_-]+)/)?.[1];
      if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
      }
    }
    return url;
  };

  const viewableUrl = pdfUrl ? getViewableUrl(pdfUrl) : '';

  useEffect(() => {
    // Always show fallback for better reliability - Chrome often blocks PDF iframes
    setShowFallback(true);
    setIsLoading(false);
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
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {isGoogleDriveLink 
                  ? "Arquivo hospedado no Google Drive. Use o botão 'Abrir' para visualizar."
                  : "Visualização bloqueada pelo navegador. Use o botão 'Abrir' para ver em nova aba."
                }
              </AlertDescription>
            </Alert>
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-muted/20 to-muted/40 rounded-lg border-2 border-dashed border-muted">
              <div className="text-center space-y-4">
                <FileText className="h-20 w-20 mx-auto text-muted-foreground/40" />
                <div>
                  <p className="text-lg font-medium text-foreground">
                    {isGoogleDriveLink ? "Arquivo no Google Drive" : "Currículo Disponível"}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {isGoogleDriveLink 
                      ? "Clique para abrir no Google Drive"
                      : "Clique em 'Abrir' para visualizar"
                    }
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button 
                      onClick={() => window.open(pdfUrl, '_blank')}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Abrir PDF
                    </Button>
                    {!isGoogleDriveLink && (
                      <Button 
                        variant="outline"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = pdfUrl;
                          link.download = fileName || 'curriculum.pdf';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Baixar
                      </Button>
                    )}
                  </div>
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