import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" />
      <Card>
        <CardContent>
          <p className="text-sm text-fg-muted">KPIs, revenue trend and alerts will appear here. This section is coming soon.</p>
        </CardContent>
      </Card>
    </>
  );
}
