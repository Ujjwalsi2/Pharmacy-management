import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';

export default function SalesPage() {
  return (
    <>
      <PageHeader title="Sales" />
      <Card>
        <CardContent>
          <p className="text-sm text-fg-muted">A searchable, paginated list of sales invoices will appear here. This section is coming soon.</p>
        </CardContent>
      </Card>
    </>
  );
}
