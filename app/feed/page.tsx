'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUsuario } from '../lib/auth'
import { itensPorPapel, itensAssociado } from '../lib/menus'
import BottomNav, { type ItemMenu } from '../components/BottomNav'
import MenuAdmin from '../components/MenuAdmin'
import Feed from '../components/Feed'
import styles from './layout.module.css'

export default function FeedPage() {
  const router = useRouter()
  const [verificando, setVerificando] = useState(true)
  const [itens, setItens] = useState<ItemMenu[]>(itensAssociado)
  const [ehAdmin, setEhAdmin] = useState(false)

  useEffect(() => {
    const usuario = getUsuario()

    if (!usuario) {
      router.replace('/login')
      return
    }

    setItens(itensPorPapel(usuario.papel))
    setEhAdmin(usuario.papel === 'ADMIN')
    setVerificando(false)
  }, [router])

  if (verificando) {
    return null
  }

  return (
    <div className={styles.layout}>
      {ehAdmin ? <MenuAdmin /> : <BottomNav itens={itens} />}
      <main className={styles.conteudo}>
        <Feed />
      </main>
    </div>
  )
}
