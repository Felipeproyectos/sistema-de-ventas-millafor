import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook to detect barcode scanner input.
 * Barcode guns (HID keyboard mode) type characters rapidly and end with Enter.
 * This hook accumulates keystrokes and fires onScan when Enter is detected
 * after at least 2 characters, if the typing speed is fast (< 50ms per char).
 */
export default function useBarcodeScanner({ onScan, enabled = true }) {
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const timerRef = useRef(null);

  const flush = useCallback(() => {
    const code = bufferRef.current.trim();
    bufferRef.current = '';
    if (code.length >= 2) {
      onScan(code);
    }
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // If too slow between keystrokes, it's manual typing — reset buffer
      if (timeDiff > 100 && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= 2) {
          e.preventDefault();
          e.stopPropagation();
          flush();
        }
        return;
      }

      // Only accumulate printable characters
      if (e.key && e.key.length === 1) {
        // If typing fast (scanner speed), prevent character from going into focused inputs
        if (timeDiff < 50) {
          e.preventDefault();
          e.stopPropagation();
        }
        bufferRef.current += e.key;

        // Auto-flush after short delay in case Enter is missing
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          if (bufferRef.current.length >= 2) flush();
        }, 150);
      }
    };

    // Use capture:true so we intercept before focused inputs receive the keystroke
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      clearTimeout(timerRef.current);
    };
  }, [enabled, flush]);
}