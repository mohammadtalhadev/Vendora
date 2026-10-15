import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Reveal } from './Reveal';

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  observed = new Set<Element>();
  unobserved: Element[] = [];
  disconnected = false;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    FakeIntersectionObserver.instances.push(this);
  }
  observe(el: Element) {
    this.observed.add(el);
  }
  unobserve(el: Element) {
    this.observed.delete(el);
    this.unobserved.push(el);
  }
  disconnect() {
    this.disconnected = true;
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  root = null;
  rootMargin = '';
  thresholds = [0];

  fire(el: Element, isIntersecting: boolean) {
    this.callback(
      [{ target: el, isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

const stubMatchMedia = (reducedMotion: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: reducedMotion && query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe('Reveal', () => {
  afterEach(() => {
    FakeIntersectionObserver.instances = [];
    vi.unstubAllGlobals();
  });

  it('renders children inside a .reveal element', () => {
    stubMatchMedia(false);
    render(
      <Reveal>
        <span>Card body</span>
      </Reveal>,
    );
    const el = screen.getByText('Card body').parentElement;
    expect(el).toHaveClass('reveal');
  });

  it('reveals immediately when IntersectionObserver is unavailable', () => {
    stubMatchMedia(false);
    // jsdom ships no IntersectionObserver: the component must not leave
    // content hidden in that environment.
    expect('IntersectionObserver' in window).toBe(false);
    render(
      <Reveal>
        <span>No observer</span>
      </Reveal>,
    );
    const el = screen.getByText('No observer').parentElement;
    expect(el).toHaveClass('reveal-visible');
  });

  it('reveals immediately for reduced-motion users even with an observer', () => {
    stubMatchMedia(true);
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    render(
      <Reveal>
        <span>Reduced motion</span>
      </Reveal>,
    );
    const el = screen.getByText('Reduced motion').parentElement;
    expect(el).toHaveClass('reveal-visible');
    expect(FakeIntersectionObserver.instances).toHaveLength(0);
  });

  it('reveals once when the element first intersects, then unobserves it', () => {
    stubMatchMedia(false);
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    render(
      <Reveal>
        <span>Observed</span>
      </Reveal>,
    );
    const el = screen.getByText('Observed').parentElement as HTMLElement;
    expect(el).not.toHaveClass('reveal-visible');

    const observer = FakeIntersectionObserver.instances[0];
    act(() => observer.fire(el, false));
    expect(el).not.toHaveClass('reveal-visible');

    act(() => observer.fire(el, true));
    expect(el).toHaveClass('reveal-visible');
    expect(observer.unobserved).toContain(el);
  });

  it('staggers by index with the delay capped at the eighth item', () => {
    stubMatchMedia(false);
    render(
      <Reveal index={3}>
        <span>Fourth</span>
      </Reveal>,
    );
    expect(screen.getByText('Fourth').parentElement).toHaveStyle({
      transitionDelay: '180ms',
    });

    render(
      <Reveal index={40}>
        <span>Late</span>
      </Reveal>,
    );
    expect(screen.getByText('Late').parentElement).toHaveStyle({
      transitionDelay: '480ms',
    });
  });
});
