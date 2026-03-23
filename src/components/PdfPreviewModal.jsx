import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, X } from 'lucide-react';

export default function PdfPreviewModal({ open, onOpenChange, blobUrl, filename }) {
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename || 'documento.pdf';
    a.click();
  };

  const handlePrint = () => {
    const iframe = document.getElementById('pdf-preview-iframe');
    if (iframe) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col bg-card border-border p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-semibold">Vista previa: {filename}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
              <Button size="sm" onClick={handleDownload} className="gap-1.5">
                <Download className="h-4 w-4" /> Guardar
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-hidden bg-muted/30">
          {blobUrl && (
            <iframe
              id="pdf-preview-iframe"
              src={blobUrl}
              className="w-full h-full border-0"
              title="Vista previa PDF"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}