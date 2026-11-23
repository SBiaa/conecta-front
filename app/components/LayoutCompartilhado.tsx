'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUsuario } from '../lib/auth'
import { useItensMenu } from '../lib/useItensMenu'
import BottomNav from './BottomNav'
import MenuAdmin from './MenuAdmin'
import styles from '../feed/layout.module.css'

type Papel = 'ADMIN' | 'PROFESSOR' | 'ASSOCIADO' | 'CONVIDADO'

// Moldura das telas que os papéis abrem (Feed, Viagem): checa o login e
// mostra o menu certo — o lateral da coordenação ou o de baixo das demais.
export default function LayoutCompartilhado({
  children,
}: {
  children: (papel: Papel) => React.ReactNode
}) {
  const router = useRouter()
  const [papel, setPapel] = useState<Papel | null>(null)
  const itens = useItensMenu(papel === 'ASSOCIADO' || papel === 'PROFESSOR' ? papel : null)

  useEffect(() => {
    const usuario = getUsuario()
    if (!usuario) {
      router.replace('/login')
      return
    }
    setPapel(usuario.papel)
  }, [router])

  if (!papel) return null

  // Quem entrou pelo link da viagem só tem a viagem: sem menu do resto do app.
  if (papel === 'CONVIDADO') {
    return (
      <div className={styles.layout}>
        <main className={styles.conteudo}>{children(papel)}</main>
      </div>
    )
  }

  return (
    <div className={styles.layout}>
      {papel === 'ADMIN' ? <MenuAdmin /> : <BottomNav itens={itens} />}
      <main className={styles.conteudo}>{children(papel)}</main>
    </div>
  )
}
