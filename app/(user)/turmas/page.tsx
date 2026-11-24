'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiGet } from '../../lib/api'
import styles from './turmas.module.css'

type Turma = {
  id: number
  nome: string
  horario: string | null
  dias: string[]
  projeto: { nome: string }
  totalAlunas: number
  temAulaHoje?: boolean
  chamadaFeitaHoje?: boolean
}

const LABELS_DIA: Record<string, string> = {
  SEGUNDA: 'Seg',
  TERCA: 'Ter',
  QUARTA: 'Qua',
  QUINTA: 'Qui',
  SEXTA: 'Sex',
  SABADO: 'Sáb',
  DOMINGO: 'Dom',
}

export default function MinhasTurmasPage() {
  const [turmas, setTurmas] = useState<Turma[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    setErro(null)
    apiGet<Turma[]>('/professor/turmas')
      .then(setTurmas)
      .catch(() => setErro('Não foi possível carregar suas turmas.'))
  }, [tentativa])

  return (
    <div className={styles.pagina}>
      <h1 className={styles.titulo}>Minhas Turmas</h1>

      {erro && (
        <div role="alert">
          <p className={styles.mensagemErro}>{erro}</p>
          <button type="button" className={styles.botaoPilula} onClick={() => setTentativa((n) => n + 1)}>
            Tentar de novo
          </button>
        </div>
      )}

      {!erro && turmas === null && <p className={styles.mensagem}>Carregando...</p>}

      {!erro && turmas !== null && turmas.length === 0 && (
        <p className={styles.mensagem}>Nenhuma turma atribuída a você ainda.</p>
      )}

      {!erro && turmas !== null && turmas.length > 0 && (
        <ul className={styles.lista}>
          {turmas.map((turma) => (
            <li key={turma.id} className={styles.card}>
              <Link href={`/turmas/${turma.id}/chamada`} className={styles.cardLink}>
                {(turma.temAulaHoje || turma.chamadaFeitaHoje) && (
                  <span className={styles.selos}>
                    {turma.temAulaHoje && <span className={styles.seloHoje}>Hoje</span>}
                    {turma.chamadaFeitaHoje && <span className={styles.seloFeita}>Chamada feita ✓</span>}
                  </span>
                )}
                <span className={styles.projeto}>{turma.projeto.nome}</span>
                <p className={styles.turma}>{turma.nome}</p>

                {turma.dias.length > 0 && (
                  <span className={styles.detalhe}>
                    {turma.dias.map((d) => LABELS_DIA[d] ?? d).join(', ')}
                    {turma.horario ? ` — ${turma.horario}` : ''}
                  </span>
                )}

                <span className={styles.contagem}>{turma.totalAlunas} alunas</span>
                <span className={styles.fazerChamada}>Fazer chamada →</span>
              </Link>
              <div className={styles.acoes}>
                <Link href={`/turmas/${turma.id}/frequencia`} className={styles.botaoPilula}>
                  Ver frequência
                </Link>
                <Link href={`/turmas/${turma.id}/lista-impressa`} className={styles.botaoPilula}>
                  Lista p/ imprimir
                </Link>
                {/natação|natacao/i.test(turma.projeto.nome) ? (
                  <Link href={`/turmas/${turma.id}/natacao`} className={styles.botaoPilula}>
                    Níveis
                  </Link>
                ) : (
                  <Link href={`/turmas/${turma.id}/saude`} className={styles.botaoPilula}>
                    Como estão
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
