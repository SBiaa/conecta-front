'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { apiGet } from '../../../../lib/api'
import styles from './frequencia.module.css'

type Aluna = {
  matriculaId: number
  nome: string
  totalRegistros: number
  faltas: number
  percentualPresenca: number | null
}

type Frequencia = {
  turma: { id: number; nome: string }
  datas: string[]
  alunas: Aluna[]
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

export default function FrequenciaPage() {
  const { id } = useParams<{ id: string }>()

  const [frequencia, setFrequencia] = useState<Frequencia | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    apiGet<Frequencia>(`/professor/turmas/${id}/frequencia`)
      .then(setFrequencia)
      .catch(() => setErro('Não foi possível carregar a frequência.'))
  }, [id])

  return (
    <div className={styles.pagina}>
      <div className={styles.cabecalho}>
        <h1 className={styles.titulo}>
          {frequencia ? `Frequência — ${frequencia.turma.nome}` : 'Frequência'}
        </h1>
        <Link href={`/turmas/${id}/chamada`} className={styles.linkChamada}>
          Fazer chamada
        </Link>
      </div>

      {erro && <p className={styles.mensagemErro}>{erro}</p>}

      {!erro && !frequencia && <p className={styles.mensagem}>Carregando...</p>}

      {!erro && frequencia && frequencia.alunas.length === 0 && (
        <p className={styles.mensagem}>Nenhuma aluna ativa nesta turma.</p>
      )}

      {!erro && frequencia && frequencia.alunas.length > 0 && (
        <>
          <ul className={styles.lista}>
            {frequencia.alunas.map((aluna) => (
              <li key={aluna.matriculaId} className={styles.item}>
                <div>
                  <span className={styles.nome}>{aluna.nome}</span>
                  <span className={styles.detalhe}>
                    {aluna.totalRegistros === 0
                      ? 'Sem chamadas registradas'
                      : `${aluna.faltas} ${aluna.faltas === 1 ? 'falta' : 'faltas'} em ${aluna.totalRegistros}`}
                  </span>
                </div>
                <span className={`${styles.percentual} ${styles[classePercentual(aluna.percentualPresenca)]}`}>
                  {aluna.percentualPresenca === null ? '—' : `${aluna.percentualPresenca}%`}
                </span>
              </li>
            ))}
          </ul>

          <h2 className={styles.tituloSecao}>Datas registradas</h2>

          {frequencia.datas.length === 0 ? (
            <p className={styles.mensagem}>Nenhuma chamada registrada ainda.</p>
          ) : (
            <ul className={styles.datas}>
              {frequencia.datas.map((data) => (
                <li key={data}>
                  <Link href={`/turmas/${id}/chamada?data=${data}`} className={styles.dataChip}>
                    {formatarDataDDMM(data)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
