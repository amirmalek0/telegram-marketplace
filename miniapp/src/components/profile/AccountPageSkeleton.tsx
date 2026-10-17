export function AccountPageSkeleton() {
  return <div className="page profile-page account-page-skeleton" aria-busy="true" aria-label="در حال دریافت اطلاعات">
    <div className="account-skeleton-summary"><span className="skeleton" /><b className="skeleton" /><i className="skeleton" /></div>
    <div className="account-skeleton-options">{[1, 2, 3, 4].map(item => <div key={item}><span className="skeleton" /><b className="skeleton" /></div>)}</div>
  </div>
}
