import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" />
      <Card>
        <CardContent>
          <p className="text-sm text-fg-muted">Sales, top-drugs and inventory-value reports will appear here. This section is coming soon.</p>
        </CardContent>
      </Card>
    </>
  );
}
