import { useState, useRef } from 'react';
import { Barcode, X } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Visual barcode input field.
 * Also works as manual barcode entry fallback.
 */
export default function BarcodeScannerInput({ onScan, lastScanned, lastError }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault();
      onScan(value.trim());
      setValue('');
    }
  };

  return (
    <div className="space-y-1">
      <div className="relative">
        <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
        <Input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escanea o escribe el código de barras y presiona Enter..."
          className={cn(
            "pl-9 pr-9 bg-primary/5 border-primary/30 focus:border-primary font-mono text-sm",
            lastError && "border-destructive/50 bg-destructive/5"
          )}
        />
        {value && (
          <button
            onClick={() => setValue('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {lastError && (
        <p className="text-xs text-destructive flex items-center gap-1">
          ⚠ {lastError}
        </p>
      )}
      {lastScanned && !lastError && (
        <p className="text-xs text-green-600 dark:text-green-400">
          ✓ {lastScanned}
        </p>
      )}
    </div>
  );
}