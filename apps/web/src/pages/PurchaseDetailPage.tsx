import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';

export default function PurchaseDetailPage() {
  return (
    <>
      <PageHeader title="Purchase detail" />
      <Card>
        <CardContent>
          <p className="text-sm text-fg-muted">The full purchase order will appear here. This section is coming soon.</p>
        </CardContent>
      </Card>
    </>
  );
}
