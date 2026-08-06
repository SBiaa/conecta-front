'use client'

import { useEffect, useState } from 'react'
import { apiGet } from '../../lib/api'
import styles from './frequencia.module.css'

type Registro = {
  data: string
  presente: boolean
}

type FrequenciaTurma = {
  turmaId: number
  nome: string
  projeto: string
  totalRegistros: number
  faltas: number
  percentualPresenca: number | null
  registros: Registro[]
}

function formatarDataDDMM(iso: string): string {
  const [, mes, dia] = iso.split('-')
  return `${dia}/${mes}`
}

function classePercentual(percentual: number | null): string {
  if (percentual === null) return 'percentualSemDados'
  if (percentual >= 90) return 'percentualOk'
  if (percentual >= 75) return 'percentualAtencao'
  return 'percentualCritico'
}

export default function MinhaFrequenciaPage() {
  const [turmas, setTurmas] = useState<FrequenciaTurma[] | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    apiGet<FrequenciaTurma[]>('/me/frequencia')
      .then(setTurmas)
      .catch(() => setErro('Não foi possível carregar sua frequência.'))
  }, [])

  return (
    <div className={styles.pagina}>
      <h1 className={styles.titulo}>Minha Frequência</h1>

      {erro && <p className={styles.mensagemErro}>{erro}</p>}

      {!erro && turmas === null && <p className={styles.mensagem}>Carregando...</p>}

      {!erro && turmas !== null && turmas.length === 0 && (
        <p className={styles.mensagem}>Você ainda não está matriculada em nenhuma turma.</p>
      )}

      {!erro && turmas !== null && turmas.length > 0 && (
        <ul className={styles.lista}>
          {turmas.map((turma) => (
            <li key={turma.turmaId} className={styles.card}>
              <div className={styles.cabecalhoCard}>
                <div>
                  <span className={styles.projeto}>{turma.projeto}</span>
                  <p className={styles.turma}>{turma.nome}</p>
                </div>
                <span className={`${styles.percentual} ${styles[classePercentual(turma.percentualPresenca)]}`}>
                  {turma.percentualPresenca === null ? '—' : `${turma.percentualPresenca}%`}
                </span>
              </div>

              <p className={styles.detalhe}>
                {turma.totalRegistros === 0
                  ? 'Sem chamadas registradas'
                  : `${turma.faltas} ${turma.faltas === 1 ? 'falta' : 'faltas'} em ${turma.totalRegistros}`}
              </p>

              {turma.registros.length > 0 && (
                <ul className={styles.datas}>
                  {turma.registros.map((registro) => (
                    <li
                      key={registro.data}
                      className={`${styles.dataChip} ${
                        registro.presente ? styles.dataPresente : styles.dataAusente
                      }`}
                    >
                      {formatarDataDDMM(registro.data)}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
