import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useOverlayA11y } from './useOverlayA11y';

const Harness = () => {
  const [open, setOpen] = useState(false);
  const panelRef = useOverlayA11y<HTMLDivElement>(open, () => setOpen(false));
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open overlay
      </button>
      {open && (
        <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Test overlay">
          <button type="button">First action</button>
          <button type="button">Last action</button>
        </div>
      )}
    </div>
  );
};

describe('useOverlayA11y', () => {
  it('moves focus into the panel on open and restores it on Escape-close', () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open overlay' });
    opener.focus();
    fireEvent.click(opener);

    // Focus starts on the first focusable element inside the panel.
    expect(screen.getByRole('button', { name: 'First action' })).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(opener).toHaveFocus();
  });

  it('traps Tab at the last element and Shift+Tab at the first', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open overlay' }));

    const first = screen.getByRole('button', { name: 'First action' });
    const last = screen.getByRole('button', { name: 'Last action' });

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(first).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });
});
