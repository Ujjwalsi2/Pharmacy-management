import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';

export default function PurchasesPage() {
  return (
    <>
      <PageHeader title="Purchases" />
      <Card>
        <CardContent>
          <p className="text-sm text-fg-muted">A searchable, paginated list of purchase orders will appear here. This section is coming soon.</p>
        </CardContent>
      </Card>
    </>
  );
}
