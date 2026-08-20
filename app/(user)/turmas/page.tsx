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

  useEffect(() => {
    apiGet<Turma[]>('/professor/turmas')
      .then(setTurmas)
      .catch(() => setErro('Não foi possível carregar suas turmas.'))
  }, [])

  return (
    <div className={styles.pagina}>
      <h1 className={styles.titulo}>Minhas Turmas</h1>

      {erro && <p className={styles.mensagemErro}>{erro}</p>}

      {!erro && turmas === null && <p className={styles.mensagem}>Carregando...</p>}

      {!erro && turmas !== null && turmas.length === 0 && (
        <p className={styles.mensagem}>Nenhuma turma atribuída a você ainda.</p>
      )}

      {!erro && turmas !== null && turmas.length > 0 && (
        <ul className={styles.lista}>
          {turmas.map((turma) => (
            <li key={turma.id} className={styles.card}>
              <Link href={`/turmas/${turma.id}/chamada`} className={styles.cardLink}>
                <span className={styles.projeto}>{turma.projeto.nome}</span>
                <p className={styles.turma}>{turma.nome}</p>

                {turma.dias.length > 0 && (
                  <span className={styles.detalhe}>
                    {turma.dias.map((d) => LABELS_DIA[d] ?? d).join(', ')}
                    {turma.horario ? ` — ${turma.horario}` : ''}
                  </span>
                )}

                <span className={styles.contagem}>{turma.totalAlunas} alunas</span>
              </Link>
              <div className={styles.acoes}>
                <Link href={`/turmas/${turma.id}/frequencia`} className={styles.linkFrequencia}>
                  Ver frequência
                </Link>
                <Link href={`/turmas/${turma.id}/saude`} className={styles.linkFrequencia}>
                  Como estão
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
