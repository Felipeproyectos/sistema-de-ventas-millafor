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

    const isUserTypingInField = () => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      return tag === 'input' || tag === 'textarea' || el.isContentEditable;
    };

    const handleKeyDown = (e) => {
      // If the user is typing in a text field, do NOT intercept — let them type normally
      if (isUserTypingInField()) {
        bufferRef.current = '';
        return;
      }

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // If too slow between keystrokes, reset buffer
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
        e.preventDefault();
        e.stopPropagation();
        bufferRef.current += e.key;

        // Auto-flush after short delay in case Enter is missing
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          if (bufferRef.current.length >= 2) flush();
        }, 150);
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      clearTimeout(timerRef.current);
    };
  }, [enabled, flush]);
}