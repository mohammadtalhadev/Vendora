import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './dialog';

describe('Dialog primitive', () => {
  it('renders content with data-lenis-prevent and frosted glass overlay', async () => {
    render(
      <Dialog defaultOpen>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Vendora Modal</DialogTitle>
          <DialogDescription>Modal description</DialogDescription>
          <div>Inner scrollable modal body</div>
        </DialogContent>
      </Dialog>,
    );

    const dialogContent = screen.getByRole('dialog');
    expect(dialogContent).toBeInTheDocument();

    // Verify data-lenis-prevent attribute is present to isolate internal scrolling from Lenis
    expect(dialogContent).toHaveAttribute('data-lenis-prevent');

    // Verify dialog styling uses near-solid surface to prevent GPU stutter
    expect(dialogContent.className).toContain('bg-white/95');
    expect(dialogContent.className).toContain('rounded-3xl');

    // Verify overlay has frosted glass styling
    const overlay = document.querySelector('[class*="backdrop-blur-[16px]"]');
    expect(overlay).toBeInTheDocument();
    expect(overlay?.className).toContain('bg-ink/40');
  });
});
