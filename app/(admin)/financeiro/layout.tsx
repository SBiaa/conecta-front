'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './abas.module.css'

const ABAS = [
  { label: 'Mensalidades', href: '/financeiro' },
  { label: 'Vendas', href: '/financeiro/vendas' },
  { label: 'Produtos', href: '/financeiro/produtos' },
  { label: 'Gastos', href: '/financeiro/gastos' },
  { label: 'Caixa do dia', href: '/financeiro/caixa' },
  { label: 'Fechamento do mês', href: '/financeiro/fechamento' },
]

export default function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className={styles.wrapper}>
      <nav className={styles.abas}>
        {ABAS.map((aba) => (
          <Link
            key={aba.href}
            href={aba.href}
            className={`${styles.aba} ${pathname === aba.href ? styles.abaAtiva : ''}`}
          >
            {aba.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  )
}
