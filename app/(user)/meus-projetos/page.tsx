'use client'

import { useEffect, useState } from 'react'
import { apiGet } from '../../lib/api'
import styles from './meus-projetos.module.css'

type ExameMedico = 'APTO' | 'NAO_APTO' | 'AGUARDANDO'

type Matricula = {
  id: number
  ativa: boolean
  exameMedico: ExameMedico
  turmas: {
    nome: string
    horario: string | null
    diasContratados: string[]
    projeto: { nome: string }
  }[]
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

const LABELS_EXAME: Record<ExameMedico, string> = {
  APTO: 'Apto',
  NAO_APTO: 'Não apto',
  AGUARDANDO: 'Exame pendente',
}

const CLASSES_EXAME: Record<ExameMedico, string> = {
  APTO: 'badgeApto',
  NAO_APTO: 'badgeNaoApto',
  AGUARDANDO: 'badgeAguardando',
}

export default function MeusProjetosPage() {
  const [matriculas, setMatriculas] = useState<Matricula[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    apiGet<Matricula[]>('/me/matriculas')
      .then(setMatriculas)
      .catch(() => setErro('Não foi possível carregar seus projetos.'))
  }, [])

  return (
    <div className={styles.pagina}>
      <h1 className={styles.titulo}>Meus Projetos</h1>

      {erro && <p className={styles.mensagemErro}>{erro}</p>}

      {!erro && matriculas === null && <p className={styles.mensagem}>Carregando...</p>}

      {!erro && matriculas !== null && matriculas.length === 0 && (
        <p className={styles.mensagem}>Você ainda não está matriculada em nenhum projeto.</p>
      )}

      {!erro && matriculas !== null && matriculas.length > 0 && (
        <ul className={styles.lista}>
          {matriculas.map((matricula) => (
            <li key={matricula.id} className={styles.card}>
              <span className={styles.projeto}>{matricula.turmas[0]?.projeto.nome ?? '—'}</span>
              <p className={styles.turma}>{matricula.turmas.map((turma) => turma.nome).join(', ')}</p>

              {matricula.turmas.map((turma, indice) => (
                turma.diasContratados.length > 0 && (
                  <p key={indice} className={styles.detalhe}>
                    {turma.diasContratados.map((d) => LABELS_DIA[d] ?? d).join(', ')}
                    {turma.horario ? ` — ${turma.horario}` : ''}
                  </p>
                )
              ))}

              <span className={`${styles.badge} ${styles[CLASSES_EXAME[matricula.exameMedico]]}`}>
                {LABELS_EXAME[matricula.exameMedico]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
