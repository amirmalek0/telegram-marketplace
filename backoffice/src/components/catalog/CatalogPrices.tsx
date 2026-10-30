import { StarsAmount } from '@/components/ui/StarsAmount';

/** Independent catalog prices, not a currency conversion or payment-availability indicator. */
export function CatalogPrices({ stars, toman }: { stars: number; toman?: number }) {
  const validStars = Number.isSafeInteger(stars) && stars > 0;
  const validToman = typeof toman === 'number' && Number.isSafeInteger(toman) && toman > 0;
  return <div className="flex min-w-36 flex-col gap-1.5 text-sm" aria-label="قیمت‌های خرید">
    <div className="flex items-center justify-between gap-5"><span className="text-xs text-[rgb(var(--color-text-secondary))]">قیمت (Stars)</span>{validStars ? <StarsAmount value={stars} /> : <span className="text-xs text-[rgb(var(--color-text-secondary))]">تنظیم نشده</span>}</div>
    <div className="flex items-center justify-between gap-5"><span className="text-xs text-[rgb(var(--color-text-secondary))]">قیمت (تومان)</span><span className={validToman ? 'whitespace-nowrap font-semibold' : 'text-xs text-[rgb(var(--color-text-secondary))]'}>{validToman ? toman.toLocaleString('fa-IR') : 'ارائه نمی‌شود'}</span></div>
  </div>;
}
