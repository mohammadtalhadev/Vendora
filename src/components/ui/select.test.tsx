import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

// jsdom does not implement pointer capture or scrollIntoView, both of which
// Radix Select calls while opening. Stub them so the interaction can run.
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.hasPointerCapture = () => false;
  window.HTMLElement.prototype.setPointerCapture = () => undefined;
  window.HTMLElement.prototype.releasePointerCapture = () => undefined;
  window.Element.prototype.scrollIntoView = () => undefined;
}

const renderSelect = (props: { hasError?: boolean } = {}) => {
  const onValueChange = vi.fn();
  render(
    <Select defaultValue="placed" onValueChange={onValueChange}>
      <SelectTrigger aria-label="Status" hasError={props.hasError}>
        <SelectValue placeholder="Pick a status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="placed">Placed</SelectItem>
        <SelectItem value="delivered">Delivered</SelectItem>
      </SelectContent>
    </Select>,
  );
  return { onValueChange };
};

describe('Select primitive', () => {
  it('renders a capsule trigger showing the selected value', () => {
    renderSelect();
    const trigger = screen.getByRole('combobox', { name: 'Status' });
    expect(trigger).toHaveTextContent('Placed');
    expect(trigger.className).toContain('rounded-full');
    expect(trigger.className).toContain('h-11');
    expect(trigger.className).toContain('border-slate-200');
    // Chevron affordance from lucide.
    expect(trigger.querySelector('svg')).not.toBeNull();
  });

  it('applies error styling to the trigger when hasError is set', () => {
    renderSelect({ hasError: true });
    const trigger = screen.getByRole('combobox', { name: 'Status' });
    expect(trigger.className).toContain('border-coral');
  });

  it('opens the dropdown and reports the chosen value', () => {
    const { onValueChange } = renderSelect();
    const trigger = screen.getByRole('combobox', { name: 'Status' });
    fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' });
    const option = screen.getByRole('option', { name: 'Delivered' });
    fireEvent.click(option);
    expect(onValueChange).toHaveBeenCalledWith('delivered');
  });
});
