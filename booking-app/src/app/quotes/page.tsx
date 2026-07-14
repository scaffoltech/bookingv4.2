import { QuotesDashboard } from '@/components/quotes/QuotesDashboard';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';

export default function QuotesPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <QuotesDashboard />
      </MainLayout>
    </ProtectedRoute>
  );
}
