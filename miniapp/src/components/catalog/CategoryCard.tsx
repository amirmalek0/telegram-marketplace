import { NavLink } from 'react-router-dom'
import type { Category } from '../../features/catalog/types'
import { publicAssetURL } from '../../utils/assets'
import { Icon } from '../ui/Icon'

interface CategoryCardProps {
  category: Category
}

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <NavLink to={`/categories/${category.id}`} className="category-card pressable">
      <div className="category-card-visual">
        <span className="category-icon-wrap">
          {category.icon_url
            ? <img src={publicAssetURL(category.icon_url)} alt="" onError={(event) => { event.currentTarget.style.display = 'none' }} />
            : <Icon name="box" size={35} />}
        </span>
      </div>
      <div className="category-card-copy">
        <strong>{category.title}</strong>
      </div>
      <span className="category-card-open"><Icon name="arrow" size={14} /></span>
    </NavLink>
  )
}
