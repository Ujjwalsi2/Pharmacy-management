import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';

export default function SaleDetailPage() {
  return (
    <>
      <PageHeader title="Sale detail" />
      <Card>
        <CardContent>
          <p className="text-sm text-fg-muted">The full invoice for this sale will appear here. This section is coming soon.</p>
        </CardContent>
      </Card>
    </>
  );
}
