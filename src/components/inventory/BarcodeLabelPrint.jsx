import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BarcodeLabelPrint({ product }) {
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
          .price {
            font-size: 13px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 3px;
          }
          svg {
            max-width: 56mm;
          }
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
        <div class="code-text">${product.barcode}</div>
        <div class="divider"></div>
        <div class="price">$${(product.sale_price || 0).toLocaleString('es-CL')}</div>
        <script>
          window.onload = function() {
            JsBarcode("#barcode", "${product.barcode}", {
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
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-primary"
      title="Imprimir etiqueta"
      onClick={handlePrint}
    >
      <Printer className="h-3.5 w-3.5" />
    </Button>
  );
}