'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUsuario } from '../lib/auth'
import { itensPorPapel, itensAssociado } from '../lib/menus'
import BottomNav, { type ItemMenu } from '../components/BottomNav'
import Feed from '../components/Feed'
import styles from './layout.module.css'

export default function FeedPage() {
  const router = useRouter()
  const [verificando, setVerificando] = useState(true)
  const [itens, setItens] = useState<ItemMenu[]>(itensAssociado)

  useEffect(() => {
    const usuario = getUsuario()

    if (!usuario) {
      router.replace('/login')
      return
    }

    setItens(itensPorPapel(usuario.papel))
    setVerificando(false)
  }, [router])

  if (verificando) {
    return null
  }

  return (
    <div className={styles.layout}>
      <BottomNav itens={itens} />
      <main className={styles.conteudo}>
        <Feed />
      </main>
    </div>
  )
}
