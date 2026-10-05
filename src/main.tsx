import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import { router } from './app/router';
import { enableMocking } from './mocks/browser';
import { SmoothScrollProvider } from './components/SmoothScrollProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
    },
  },
});

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <SmoothScrollProvider>
          <RouterProvider router={router} />
        </SmoothScrollProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
});
