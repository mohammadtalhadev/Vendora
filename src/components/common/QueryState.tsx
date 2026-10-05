import * as React from 'react';
import { AlertCircle, RotateCcw, Inbox, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

/* ==========================================================================
   1. Skeleton Primitives (Shimmer effect with near-solid backgrounds)
   ========================================================================== */

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  roundedPill?: boolean;
}

/**
 * Low-level Skeleton shimmer block with hardware-accelerated shimmer effect.
 */
export function Skeleton({
  className,
  roundedPill = false,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'skeleton-shimmer bg-slate-200/80',
        roundedPill ? 'rounded-full' : 'rounded-xl',
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

/**
 * Presets matching card grids (solid surface bg-white to prevent GPU stutter)
 */
export function CardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-xs">
      <Skeleton className="aspect-square w-full rounded-2xl" />
      <div className="space-y-2 pt-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-xs"
        >
          <Skeleton className="h-16 w-16 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ==========================================================================
   2. Main QueryState Component
   ========================================================================== */

export interface QueryStateProps {
  // Query status props (compatible with TanStack Query and manual state)
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  isRefetching?: boolean;
  isFetching?: boolean;
  isIdle?: boolean;
  status?: 'idle' | 'loading' | 'error' | 'success';

  // Error details & actions
  error?: Error | { message?: string } | string | null;
  errorMessage?: string;
  errorTitle?: string;
  onRetry?: () => void;
  refetch?: () => void;
  errorView?: React.ReactNode;

  // Empty state details & actions
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  emptyView?: React.ReactNode;

  // Skeleton / Loading configuration
  skeleton?: React.ReactNode;
  skeletonType?: 'card' | 'grid' | 'list' | 'default';
  skeletonCount?: number;

  // Idle state view
  idleView?: React.ReactNode;

  // Refetching indicator configuration
  showRefetchIndicator?: boolean;
  refetchLabel?: string;

  // Content
  className?: string;
  children: React.ReactNode | (() => React.ReactNode);
}

/**
 * Reusable QueryState / AsyncSection loader.
 * Handles idle, loading, error, empty, and background refetching states.
 * Guarantees zero layout shift during background refetches.
 */
export function QueryState({
  isLoading,
  isError,
  isEmpty,
  isRefetching,
  isFetching,
  isIdle,
  status,
  error,
  errorMessage,
  errorTitle = 'Unable to load content',
  onRetry,
  refetch,
  errorView,
  emptyTitle = 'No items found',
  emptyMessage = 'There are no items to display at this time.',
  emptyAction,
  emptyView,
  skeleton,
  skeletonType = 'grid',
  skeletonCount = 4,
  idleView = null,
  showRefetchIndicator = true,
  refetchLabel = 'Updating...',
  className,
  children,
}: QueryStateProps) {
  const retryHandler = onRetry || refetch;

  // 1. Determine Idle State
  const effectiveIsIdle =
    isIdle || (status === 'idle' && !isLoading && !isError);
  if (effectiveIsIdle) {
    return <>{idleView}</>;
  }

  // 2. Determine Initial Loading State
  const effectiveIsLoading =
    isLoading || (status === 'loading' && !isRefetching);

  if (effectiveIsLoading) {
    if (skeleton) {
      return <div className={className}>{skeleton}</div>;
    }

    if (skeletonType === 'list') {
      return (
        <div className={className}>
          <ListSkeleton count={skeletonCount} />
        </div>
      );
    }

    if (skeletonType === 'card') {
      return (
        <div className={className}>
          <CardSkeleton />
        </div>
      );
    }

    // Default to GridSkeleton
    return (
      <div className={className}>
        <GridSkeleton count={skeletonCount} />
      </div>
    );
  }

  // 3. Determine Error State
  const effectiveIsError = isError || status === 'error';

  if (effectiveIsError) {
    if (errorView) {
      return <div className={className}>{errorView}</div>;
    }

    const resolvedErrorMessage =
      errorMessage ||
      (typeof error === 'string'
        ? error
        : error instanceof Error
        ? error.message
        : error && typeof error === 'object' && 'message' in error
        ? String(error.message)
        : 'An unexpected error occurred while loading this section.');

    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-3xl border border-coral/20 bg-coral/5 p-8 text-center',
          className,
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-coral/15 text-coral">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h4 className="mt-3 text-base font-semibold text-ink">{errorTitle}</h4>
        <p className="mt-1 max-w-md text-sm text-slate-600">
          {resolvedErrorMessage}
        </p>
        {retryHandler && (
          <Button
            variant="orange-cta"
            size="sm"
            onClick={retryHandler}
            className="mt-4 gap-2"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Try again
          </Button>
        )}
      </div>
    );
  }

  // 4. Determine Empty State
  if (isEmpty) {
    if (emptyView) {
      return <div className={className}>{emptyView}</div>;
    }

    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white/95 p-10 text-center shadow-xs',
          className,
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Inbox className="h-6 w-6" />
        </div>
        <h4 className="mt-3 text-base font-semibold text-ink">{emptyTitle}</h4>
        <p className="mt-1 max-w-sm text-sm text-slate-500">{emptyMessage}</p>
        {emptyAction && <div className="mt-4">{emptyAction}</div>}
      </div>
    );
  }

  // 5. Success State (with optional subtle background refetch indicator)
  const isCurrentlyRefetching =
    Boolean(isRefetching) || (Boolean(isFetching) && !isLoading);

  const renderedContent =
    typeof children === 'function' ? children() : children;

  return (
    <div className={cn('relative', className)}>
      {showRefetchIndicator && isCurrentlyRefetching && (
        <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-xs font-medium text-ink shadow-sm backdrop-blur-[16px] transition-all">
          <Loader2 className="h-3 w-3 animate-spin text-sun-orange" />
          <span>{refetchLabel}</span>
        </div>
      )}
      {renderedContent}
    </div>
  );
}
