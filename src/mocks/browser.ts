import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

export async function enableMocking(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const registration = await worker.start({
      onUnhandledFrame: 'bypass',
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    });
    console.info('[MSW] Mock Service Worker registered successfully', registration);
  } catch (error) {
    console.warn('[MSW] Service Worker failed to start; fallback mode active', error);
  }
}
