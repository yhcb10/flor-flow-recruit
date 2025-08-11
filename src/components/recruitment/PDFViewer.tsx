import { FileText, Download, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState } from 'react';

interface PDFViewerProps {
  pdfUrl: string;
  fileName?: string;
}

export function PDFViewer({ pdfUrl, fileName }: PDFViewerProps) {
  const [loadError, setLoadError] = useState(false);

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
        {loadError ? (
          <div className="h-full flex flex-col gap-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Não foi possível carregar o PDF nesta visualização. Use os botões "Abrir" ou "Baixar" acima.
              </AlertDescription>
            </Alert>
            <div className="flex-1 flex items-center justify-center bg-muted/20 rounded-lg border-2 border-dashed border-muted">
              <div className="text-center text-muted-foreground">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Visualização não disponível</p>
                <p className="text-sm">Clique em "Abrir" para ver o PDF</p>
              </div>
            </div>
          </div>
        ) : (
          <object
            data={pdfUrl}
            type="application/pdf"
            className="w-full h-full rounded-lg"
            onError={() => setLoadError(true)}
          >
            <embed
              src={pdfUrl}
              type="application/pdf"
              className="w-full h-full rounded-lg"
              onError={() => setLoadError(true)}
            />
            <div className="h-full flex flex-col gap-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Seu navegador não suporta visualização de PDF. Use o botão "Abrir" acima.
                </AlertDescription>
              </Alert>
              <div className="flex-1 flex items-center justify-center bg-muted/20 rounded-lg border-2 border-dashed border-muted">
                <div className="text-center text-muted-foreground">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">Plugin PDF não encontrado</p>
                  <Button 
                    onClick={() => window.open(pdfUrl, '_blank')}
                    className="mt-2"
                  >
                    Abrir PDF em nova aba
                  </Button>
                </div>
              </div>
            </div>
          </object>
        )}
      </CardContent>
    </Card>
  );
}