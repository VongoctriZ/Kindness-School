import { NavLink } from 'react-router-dom'
import styles from './NavItem.module.css'

export default function NavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `${styles.item} ${isActive ? styles.active : ''}`
      }
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      <span className={styles.label}>{label}</span>
    </NavLink>
  )
}
