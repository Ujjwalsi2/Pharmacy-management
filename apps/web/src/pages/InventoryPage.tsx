import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';

export default function InventoryPage() {
  return (
    <>
      <PageHeader title="Inventory" />
      <Card>
        <CardContent>
          <p className="text-sm text-fg-muted">Drug catalog with stock levels and alerts will appear here. This section is coming soon.</p>
        </CardContent>
      </Card>
    </>
  );
}
