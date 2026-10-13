import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './card';

describe('Card primitive', () => {
  it('renders the admin panel surface treatment', () => {
    render(<Card data-testid="card">Panel body</Card>);
    const card = screen.getByTestId('card');
    expect(card.className).toContain('rounded-xl');
    expect(card.className).toContain('border-slate-200/90');
    expect(card.className).toContain('bg-white');
    expect(card.className).toContain('shadow-2xs');
  });

  it('composes header, title, description, content and footer', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Queue totals</CardTitle>
          <CardDescription>Across the marketplace.</CardDescription>
        </CardHeader>
        <CardContent>42 orders</CardContent>
        <CardFooter>Updated just now</CardFooter>
      </Card>,
    );

    expect(screen.getByRole('heading', { name: 'Queue totals' })).toBeInTheDocument();
    expect(screen.getByText('Across the marketplace.')).toBeInTheDocument();
    expect(screen.getByText('42 orders')).toBeInTheDocument();
    expect(screen.getByText('Updated just now')).toBeInTheDocument();
  });

  it('lets callers extend the surface classes', () => {
    render(
      <Card data-testid="card" className="p-5">
        Padded
      </Card>,
    );
    expect(screen.getByTestId('card').className).toContain('p-5');
  });
});
