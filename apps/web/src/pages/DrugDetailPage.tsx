import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';

export default function DrugDetailPage() {
  return (
    <>
      <PageHeader title="Drug detail" />
      <Card>
        <CardContent>
          <p className="text-sm text-fg-muted">Full details for this drug will appear here. This section is coming soon.</p>
        </CardContent>
      </Card>
    </>
  );
}
