import { Spinner } from '@/components/ui/Spinner';

export function PageFallback() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <Spinner size="lg" label="Loading page" />
    </div>
  );
}
