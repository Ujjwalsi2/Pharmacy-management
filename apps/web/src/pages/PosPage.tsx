import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';

export default function PosPage() {
  return (
    <>
      <PageHeader title="Point of Sale" />
      <Card>
        <CardContent>
          <p className="text-sm text-fg-muted">The POS screen for scanning drugs and checking out sales will appear here. This section is coming soon.</p>
        </CardContent>
      </Card>
    </>
  );
}
