import { redirect } from 'next/navigation';

export default function FinancesPage() {
  redirect('/admin/finances/expenses');
}
