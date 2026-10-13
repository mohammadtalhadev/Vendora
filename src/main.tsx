import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './styles/base.css';
import { router } from './app/router';
import { enableMocking } from './mocks/browser';
import { SmoothScrollProvider } from './components/SmoothScrollProvider';
import { GlobalCarouselArrows } from './components/GlobalCarouselArrows';
import { AuthProvider } from './lib/auth-context';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false, // Prevents sudden refetch when switching windows or tabs
      refetchOnReconnect: false,   // Prevents sudden refetch on network jitter
    },
  },
});

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SmoothScrollProvider>
            <GlobalCarouselArrows />
            <RouterProvider router={router} />
          </SmoothScrollProvider>
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
});
