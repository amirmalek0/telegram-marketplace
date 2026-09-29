import { Icon, type IconName } from '../ui/Icon'

interface SectionHeadingProps {
  title: string
  meta: string
  icon?: IconName
  tone?: 'blue' | 'purple'
}

export function SectionHeading({ title, meta, icon, tone = 'blue' }: SectionHeadingProps) {
  return (
    <div className={`section-heading ${icon ? `section-heading-featured tone-${tone}` : ''}`}>
      <div className="section-heading-title">
        {icon && <span className="section-heading-icon"><Icon name={icon} size={20} /></span>}
        <h2>{title}</h2>
      </div>
      <span className="section-heading-meta">{meta}</span>
    </div>
  )
}
