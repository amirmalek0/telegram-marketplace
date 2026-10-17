export function ProfileSkeleton() {
  return <div className="page profile-page profile-home" aria-busy="true" aria-label="در حال دریافت پروفایل">
    <div className="profile-account-card profile-skeleton-card" aria-hidden="true"><div className="profile-skeleton-identity"><span className="skeleton profile-skeleton-photo" /><div><span className="skeleton" /><span className="skeleton" /></div></div><div className="skeleton profile-skeleton-balance" /><div className="skeleton profile-skeleton-vip" /></div>
    <div className="profile-links-skeleton skeleton" aria-hidden="true" />
    <div className="profile-activity-skeleton skeleton" aria-hidden="true" />
  </div>
}
