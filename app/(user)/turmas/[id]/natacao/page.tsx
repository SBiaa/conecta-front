'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { apiGet } from '../../../../lib/api'
import { labelNivel, type RegistroNivel } from '../../../../lib/natacao'
import PainelNivelNatacao from '../../../../components/PainelNivelNatacao'
import styles from './natacao.module.css'

type Aluno = {
  usuarioId: string
  nome: string
  nivelAtual: RegistroNivel | null
}

type Resposta = {
  turma: { id: number; nome: string }
  alunos: Aluno[]
}

export default function NiveisNatacaoPage() {
  const { id } = useParams<{ id: string }>()
  const [dados, setDados] = useState<Resposta | null>(null)
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState<string | null>(null)

  function carregar() {
    apiGet<Resposta>(`/professor/turmas/${id}/niveis-natacao`)
      .then(setDados)
      .catch(() => setErro('Não foi possível carregar a turma.'))
  }

  useEffect(carregar, [id])

  return (
    <div className={styles.pagina}>
      <div className={styles.cabecalho}>
        <h1 className={styles.titulo}>{dados ? `Níveis — ${dados.turma.nome}` : 'Níveis'}</h1>
        <Link href={`/turmas/${id}/chamada`} className={styles.link}>
          Fazer chamada
        </Link>
      </div>

      {erro && <p className={styles.mensagemErro}>{erro}</p>}
      {!erro && !dados && <p className={styles.mensagem}>Carregando...</p>}
      {dados && dados.alunos.length === 0 && (
        <p className={styles.mensagem}>Nenhum aluno ativo nesta turma.</p>
      )}

      {dados && dados.alunos.length > 0 && (
        <ul className={styles.lista}>
          {dados.alunos.map((aluno) => (
            <li key={aluno.usuarioId} className={styles.item}>
              <button
                type="button"
                className={styles.linha}
                aria-expanded={aberto === aluno.usuarioId}
                onClick={() => setAberto(aberto === aluno.usuarioId ? null : aluno.usuarioId)}
              >
                <span className={styles.nome}>{aluno.nome}</span>
                <span className={styles.nivel}>{labelNivel(aluno.nivelAtual?.nivel)}</span>
              </button>
              {aberto === aluno.usuarioId && (
                <div className={styles.painel}>
                  <PainelNivelNatacao
                    caminho={`/professor/alunos/${aluno.usuarioId}/niveis-natacao`}
                    aoMudar={carregar}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
