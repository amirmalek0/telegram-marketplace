export function ProfileSkeleton() {
  return <div className="page profile-page profile-home" aria-busy="true" aria-label="در حال دریافت پروفایل">
    <div className="profile-account-skeleton skeleton" />
    <div className="profile-links-skeleton skeleton" />
    <div className="profile-activity-skeleton skeleton" />
  </div>
}
