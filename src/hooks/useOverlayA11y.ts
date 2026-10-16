import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessibility behaviour for hand-rolled overlays. While open:
 * Escape closes, Tab cycles inside the panel instead of escaping into the
 * page behind it, focus starts on the first focusable element (or the
 * panel itself when it has none), and closing returns focus to whatever
 * opened the overlay. Radix-based dialogs (ui/dialog, ConfirmDialog)
 * already do all of this natively — this hook exists for the overlays
 * that predate them (PDP image zoom, live chat, send-offer).
 *
 * Usage: const panelRef = useOverlayA11y(isOpen, onClose); attach
 * ref={panelRef} tabIndex={-1} to the overlay's panel element.
 */
export function useOverlayA11y<T extends HTMLElement>(isOpen: boolean, onClose: () => void) {
  const panelRef = useRef<T | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    if (!panel) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () => Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    (focusables()[0] ?? panel).focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  return panelRef;
}
