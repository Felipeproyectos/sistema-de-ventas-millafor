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
  const [quantity, setQuantity] = useState(1);
  const svgRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    loadJsBarcode().then(() => {
      if (svgRef.current) {
        window.JsBarcode(svgRef.current, product.barcode || product.code, {
          format: 'CODE128',
          width: 1.2,
          height: 30,
          displayValue: false,
          margin: 2,
        });
      }
    });
  }, [open, product]);

  const handlePrint = () => {
    const labels = Array.from({ length: quantity }).map(() => `
      <div class="label">
        <div class="product-name">${product.name}</div>
        ${product.category ? `<div class="code-text">${product.category}</div>` : ''}
        <div class="divider"></div>
        <svg class="barcode"></svg>
        <div class="divider"></div>
      </div>
    `).join('');

    const win = window.open('', '_blank', 'width=400,height=600');
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiquetas - ${product.name}</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
        <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; display: flex; flex-wrap: wrap; gap: 4px; padding: 8px; }
        .label {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 4px;
          width: 50mm;
          border: 1px dashed #ccc;
        }
        .product-name {
          font-size: 7px;
          font-weight: bold;
          text-align: center;
          max-width: 48mm;
          word-break: break-word;
          margin-bottom: 2px;
          text-transform: uppercase;
        }
        .code-text { font-size: 6px; text-align: center; margin-bottom: 2px; font-family: monospace; }
        .barcode { max-width: 48mm; }
        .divider { border-top: 1px dashed #000; width: 100%; margin: 2px 0; }
        </style>
      </head>
      <body>
        ${labels}
        <script>
          window.onload = function() {
            document.querySelectorAll('.barcode').forEach(function(el) {
              JsBarcode(el, "${product.barcode || product.code}", {
                format: "CODE128", width: 1.2, height: 28, displayValue: false, margin: 1
              });
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
          <div className="flex flex-col items-center bg-white rounded-lg border border-border p-3" style={{minHeight: '120px', width: '100%'}}>
            <p className="text-[9px] font-bold text-black uppercase text-center mb-0.5 leading-tight" style={{maxWidth: '56mm', wordBreak: 'break-word'}}>
              {product.name}
            </p>
            {product.category && (
              <p className="text-[8px] text-gray-500 mb-0.5">{product.category}</p>
            )}
            <hr className="border-dashed border-black my-1" style={{width: '100%'}} />
            <svg ref={svgRef} style={{maxWidth: '56mm', display: 'block'}} />
            <hr className="border-dashed border-black my-1" style={{width: '100%'}} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Cantidad:</span>
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-7 h-7 rounded border border-border bg-muted text-foreground font-bold text-lg flex items-center justify-center hover:bg-secondary">−</button>
              <span className="w-8 text-center font-semibold text-foreground">{quantity}</span>
              <button onClick={() => setQuantity(q => q + 1)} className="w-7 h-7 rounded border border-border bg-muted text-foreground font-bold text-lg flex items-center justify-center hover:bg-secondary">+</button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" /> Imprimir {quantity > 1 ? `(${quantity})` : ''}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}