import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The button scrolls through the shared Lenis instance; the provider is
// doubled so the test can observe the scrollTo call (and so no real Lenis
// instance is constructed under jsdom).
const lenisScrollTo = vi.fn();
vi.mock('../../../components/SmoothScrollProvider', () => ({
  useSmoothScroll: () => ({
    lenis: { scrollTo: lenisScrollTo },
    pauseScroll: () => {},
    resumeScroll: () => {},
  }),
}));

import { fireEvent, render, screen, act } from '@testing-library/react';
import { BackToTopButton } from './BackToTopButton';

const setScrollY = (value: number) => {
  Object.defineProperty(window, 'scrollY', { value, configurable: true });
};

let rafQueue: FrameRequestCallback[] = [];

const fireScroll = () => {
  act(() => {
    window.dispatchEvent(new Event('scroll'));
    // Flush the rAF callbacks the scroll handler scheduled, the way the
    // browser would on the next frame.
    const queue = rafQueue;
    rafQueue = [];
    queue.forEach((cb) => cb(0));
  });
};

describe('BackToTopButton', () => {
  beforeEach(() => {
    lenisScrollTo.mockClear();
    setScrollY(0);
    // Queue rAF callbacks instead of running them inline: an inline stub
    // would run the callback before requestAnimationFrame returns its id,
    // leaving the component's rafId stuck non-zero after the first frame.
    rafQueue = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return rafQueue.length;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {
      rafQueue = [];
    });
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: 4000,
      configurable: true,
    });
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stays hidden at the top of the page', () => {
    render(<BackToTopButton />);
    expect(screen.queryByRole('button', { name: 'Scroll back to top' })).toBeNull();
  });

  it('renders through a portal to <body>, not inside its page subtree (Batch 114 regression)', () => {
    const { container } = render(
      <div data-testid="page-subtree">
        <BackToTopButton />
      </div>,
    );
    setScrollY(600);
    fireScroll();

    const button = screen.getByRole('button', { name: 'Scroll back to top' });
    // Portaled: the button must NOT live inside the subtree it was
    // mounted from — an ancestor with a transform animation there was
    // capturing its position:fixed anchoring and planting it at the
    // bottom of the page content.
    expect(container.contains(button)).toBe(false);
    expect(document.body.contains(button)).toBe(true);
    const wrapper = button.closest('div');
    expect(wrapper?.className).toContain('fixed');
    expect(wrapper?.className).toContain('bottom-7');
    expect(wrapper?.className).toContain('right-7');
  });

  it('updates the progress ring without re-rendering and scrolls via Lenis on click', () => {
    render(<BackToTopButton />);
    setScrollY(1600); // (1600 / (4000 - 800)) = 50%
    fireScroll();

    const button = screen.getByRole('button', { name: 'Scroll back to top' });
    expect(screen.getByText('Top (50%)')).toBeTruthy();

    fireEvent.click(button);
    expect(lenisScrollTo).toHaveBeenCalledWith(0);
  });

  it('hides again when scrolled back above the threshold', () => {
    render(<BackToTopButton />);
    setScrollY(900);
    fireScroll();
    expect(screen.getByRole('button', { name: 'Scroll back to top' })).toBeTruthy();

    setScrollY(100);
    fireScroll();
    expect(screen.queryByRole('button', { name: 'Scroll back to top' })).toBeNull();
  });
});
