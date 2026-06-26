'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import styles from './BottomNav.module.css'

export type ItemMenu = {
  label: string
  href: string
  icone: LucideIcon
}

export default function BottomNav({ itens }: { itens: ItemMenu[] }) {
  const pathname = usePathname()

  return (
    <nav className={styles.nav}>
      <ul className={styles.lista}>
        {itens.map((item) => {
          const Icone = item.icone
          const ativo = pathname === item.href

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`${styles.link} ${ativo ? styles.linkAtivo : ''}`}
              >
                <Icone size={22} />
                <span className={styles.label}>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
