'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUsuario } from '../lib/auth'
import { itensAssociado, itensProfessor } from '../lib/menus'
import BottomNav from '../components/BottomNav'
import styles from './layout.module.css'

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [verificando, setVerificando] = useState(true)
  const [papel, setPapel] = useState<'ASSOCIADO' | 'PROFESSOR'>('ASSOCIADO')

  useEffect(() => {
    const usuario = getUsuario()

    if (!usuario) {
      router.replace('/login')
      return
    }

    if (usuario.papel !== 'ASSOCIADO' && usuario.papel !== 'PROFESSOR') {
      router.replace('/inicio-admin')
      return
    }

    setPapel(usuario.papel)
    setVerificando(false)
  }, [router])

  if (verificando) {
    return null
  }

  return (
    <div className={styles.layout}>
      <BottomNav itens={papel === 'PROFESSOR' ? itensProfessor : itensAssociado} />
      <main className={styles.conteudo}>{children}</main>
    </div>
  )
}
