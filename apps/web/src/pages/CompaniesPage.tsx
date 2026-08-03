import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';

export default function CompaniesPage() {
  return (
    <>
      <PageHeader title="Companies" />
      <Card>
        <CardContent>
          <p className="text-sm text-fg-muted">Supplier companies and their drug counts will appear here. This section is coming soon.</p>
        </CardContent>
      </Card>
    </>
  );
}
