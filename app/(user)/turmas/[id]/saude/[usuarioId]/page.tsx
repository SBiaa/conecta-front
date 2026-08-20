'use client'

import { useCallback, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import RelatorioSaude from '../../../../../components/RelatorioSaude'
import type { RelatorioDaAluna } from '../../../../../lib/saude'
import styles from './aluna.module.css'

export default function AlunaDaTurmaPage() {
  const { id, usuarioId } = useParams<{ id: string; usuarioId: string }>()
  const [nome, setNome] = useState('')

  // useCallback porque o RelatorioSaude tem esse callback nas dependências do
  // efeito — sem isso ele recarregaria a cada render.
  const aoCarregar = useCallback((relatorio: RelatorioDaAluna) => {
    setNome(relatorio.aluna.nome)
  }, [])

  return (
    <div className={styles.pagina}>
      <Link href={`/turmas/${id}/saude`} className={styles.voltar}>
        <ArrowLeft size={16} />
        Voltar para a turma
      </Link>

      <h1 className={styles.titulo}>{nome || 'Carregando...'}</h1>

      <div className={styles.cartao}>
        <RelatorioSaude caminho={`/professor/alunas/${usuarioId}/saude`} aoCarregar={aoCarregar} />
      </div>
    </div>
  )
}
