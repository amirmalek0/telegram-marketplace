import { Badge } from '@/components/ui';
import { statusLabels } from './types';

export function ManualStatusBadge({ status }: { status: string }) {
  const variant = status === 'approved' ? 'success' : status === 'submitted' ? 'warning' : status === 'rejected' ? 'error' : status === 'awaiting_proof' ? 'info' : 'default';
  return <Badge variant={variant} dot>{statusLabels[status] || status}</Badge>;
}
