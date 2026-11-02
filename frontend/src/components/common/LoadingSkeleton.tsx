import { clsx } from 'clsx';

interface LoadingSkeletonProps {
  className?: string;
  rows?: number;
  height?: string;
}

export default function LoadingSkeleton({ className, rows = 1, height = 'h-4' }: LoadingSkeletonProps) {
  return (
    <div className={clsx('space-y-2', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={clsx(
            'animate-pulse bg-slate-200 rounded',
            height,
            i === rows - 1 && rows > 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-1/3 mb-4" />
      <div className="h-8 bg-slate-200 rounded w-1/2 mb-2" />
      <div className="h-3 bg-slate-200 rounded w-2/3" />
    </div>
  );
}
