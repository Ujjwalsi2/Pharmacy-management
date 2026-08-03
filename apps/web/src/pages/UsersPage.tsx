import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';

export default function UsersPage() {
  return (
    <>
      <PageHeader title="Users" />
      <Card>
        <CardContent>
          <p className="text-sm text-fg-muted">User management (admin only) will appear here. This section is coming soon.</p>
        </CardContent>
      </Card>
    </>
  );
}
