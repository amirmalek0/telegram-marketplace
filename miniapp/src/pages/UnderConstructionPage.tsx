import { Icon, type IconName } from '../components/ui/Icon'

interface UnderConstructionPageProps {
  icon: IconName
  title: string
}

export function UnderConstructionPage({ icon, title }: UnderConstructionPageProps) {
  return (
    <div className="page centered-page">
      <section className="construction-card">
        <span className="construction-icon"><Icon name={icon} size={34} /></span>
        <p className="eyebrow">COMING SOON</p>
        <h2>{title}</h2>
        <p>این بخش در حال ساخت است.</p>
        <span className="construction-pill">به‌زودی</span>
      </section>
    </div>
  )
}
