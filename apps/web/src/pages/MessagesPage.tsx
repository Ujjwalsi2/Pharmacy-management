import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';

export default function MessagesPage() {
  return (
    <>
      <PageHeader title="Messages" />
      <Card>
        <CardContent>
          <p className="text-sm text-fg-muted">Your inbox and sent messages will appear here. This section is coming soon.</p>
        </CardContent>
      </Card>
    </>
  );
}
