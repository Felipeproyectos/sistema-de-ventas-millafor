import { useState, useEffect, useRef } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

function loadJsBarcode() {
  return new Promise((resolve) => {
    if (window.JsBarcode) return resolve();
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js';
    s.onload = resolve;
    document.head.appendChild(s);
  });
}

export default function BarcodeLabelPrint({ product }) {
  const [open, setOpen] = useState(false);
  const svgRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    loadJsBarcode().then(() => {
      if (svgRef.current) {
        window.JsBarcode(svgRef.current, product.barcode || product.code, {
          format: 'CODE128',
          width: 1.5,
          height: 40,
          displayValue: false,
          margin: 2,
        });
      }
    });
  }, [open, product]);

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=400,height=300');
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiqueta - ${product.name}</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 8px;
            width: 58mm;
          }
          .product-name {
            font-size: 9px;
            font-weight: bold;
            text-align: center;
            max-width: 56mm;
            word-break: break-word;
            margin-bottom: 3px;
            text-transform: uppercase;
          }
          svg { max-width: 56mm; }
          .code-text {
            font-size: 8px;
            text-align: center;
            margin-top: 2px;
            font-family: monospace;
          }
          .divider {
            border-top: 1px dashed #000;
            width: 100%;
            margin: 4px 0;
          }
        </style>
      </head>
      <body>
        <div class="product-name">${product.name}</div>
        ${product.category ? `<div class="code-text">${product.category}</div>` : ''}
        <div class="divider"></div>
        <svg id="barcode"></svg>
        <div class="divider"></div>
        <script>
          window.onload = function() {
            JsBarcode("#barcode", "${product.barcode || product.code}", {
              format: "CODE128",
              width: 1.5,
              height: 40,
              displayValue: false,
              margin: 2
            });
            setTimeout(function() { window.print(); window.close(); }, 500);
          };
        <\/script>
      </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-primary"
        title="Previsualizar etiqueta"
        onClick={() => setOpen(true)}
      >
        <Printer className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border max-w-xs">
          <DialogHeader>
            <DialogTitle>Vista previa de etiqueta</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-4 bg-white rounded-lg border border-border p-4">
            <p className="text-xs font-bold text-black uppercase text-center mb-1 max-w-[56mm] break-words">
              {product.name}
            </p>
            {product.category && (
              <p className="text-[10px] text-gray-500 mb-1">{product.category}</p>
            )}
            <hr className="w-full border-dashed border-black my-1" />
            <svg ref={svgRef} className="max-w-[56mm]" />
            <hr className="w-full border-dashed border-black my-1" />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}