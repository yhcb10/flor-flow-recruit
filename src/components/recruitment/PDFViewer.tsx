import { FileText, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PDFViewerProps {
  pdfUrl: string;
  fileName?: string;
}

export function PDFViewer({ pdfUrl, fileName }: PDFViewerProps) {
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
      <CardContent className="p-0 h-[calc(100%-60px)]">
        <iframe
          src={`${pdfUrl}#view=FitH`}
          className="w-full h-full border-0 rounded-b-lg"
          title="Visualização do Currículo"
        />
      </CardContent>
    </Card>
  );
}