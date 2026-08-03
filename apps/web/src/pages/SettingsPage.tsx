import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <Card>
        <CardContent>
          <p className="text-sm text-fg-muted">Account and application settings will appear here. This section is coming soon.</p>
        </CardContent>
      </Card>
    </>
  );
}
