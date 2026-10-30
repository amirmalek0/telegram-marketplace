import { bankLogos } from './bankLogos';
import { Landmark } from 'lucide-react';

export function BankLogo({ bank }: { bank: { key: string; name: string } }) {
  const Icon = bankLogos[bank.key];
  return <span className="bank-logo" title={bank.name}>{Icon ? <Icon width={28} height={28} aria-label={bank.name} /> : <Landmark size={26} />}</span>;
}
