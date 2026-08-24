'use client'

import { useCallback, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import FormularioAvaliacao from '../../../../../components/FormularioAvaliacao'
import FormularioRegistroSaude from '../../../../../components/FormularioRegistroSaude'
import RelatorioSaude from '../../../../../components/RelatorioSaude'
import type { Avaliacao, RegistroSaude, RelatorioDaAluna } from '../../../../../lib/saude'
import styles from './aluna.module.css'

export default function AlunaDaTurmaPage() {
  const { id, usuarioId } = useParams<{ id: string; usuarioId: string }>()
  const [nome, setNome] = useState('')
  const [alturaCm, setAlturaCm] = useState<number | null>(null)
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [registros, setRegistros] = useState<RegistroSaude[]>([])
  // Trocar a key remonta o relatório, que é como ele recarrega depois que uma
  // avaliação ou um registro novo é salvo.
  const [versao, setVersao] = useState(0)

  // useCallback porque o RelatorioSaude tem esse callback nas dependências do
  // efeito — sem isso ele recarregaria a cada render.
  const aoCarregar = useCallback((relatorio: RelatorioDaAluna) => {
    setNome(relatorio.aluna.nome)
    setAlturaCm(relatorio.alturaCm)
    setAvaliacoes(relatorio.avaliacoes)
    setRegistros(relatorio.registros)
  }, [])

  return (
    <div className={styles.pagina}>
      <Link href={`/turmas/${id}/saude`} className={styles.voltar}>
        <ArrowLeft size={16} />
        Voltar para a turma
      </Link>

      <h1 className={styles.titulo}>{nome || 'Carregando...'}</h1>

      <div className={styles.cartao}>
        <FormularioRegistroSaude
          caminho={`/professor/alunas/${usuarioId}/registros-saude`}
          registros={registros}
          aoSalvar={() => setVersao((v) => v + 1)}
        />

        <FormularioAvaliacao
          caminho={`/professor/alunas/${usuarioId}/avaliacoes`}
          alturaAtual={alturaCm}
          avaliacoes={avaliacoes}
          aoSalvar={() => setVersao((v) => v + 1)}
        />

        <RelatorioSaude
          key={versao}
          caminho={`/professor/alunas/${usuarioId}/saude`}
          aoCarregar={aoCarregar}
        />
      </div>
    </div>
  )
}
