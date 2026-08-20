'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { apiGet } from '../../../../lib/api'
import {
  LABELS_LOCAL_DOR,
  type LocalDor,
  ROTULOS_DISPOSICAO,
  ROTULOS_DOR,
} from '../../../../lib/saude'
import styles from './saude.module.css'

type Registro = {
  id: number
  data: string
  peso: number | null
  nivelDor: number | null
  locaisDor: LocalDor[]
  disposicao: number | null
  observacao: string | null
}

type AlunaSaude = {
  usuarioId: string
  nome: string
  registrosNoPeriodo: number
  ultimoRegistro: Registro | null
}

type SaudeTurma = {
  turma: { id: number; nome: string }
  alunas: AlunaSaude[]
}

function formatarDDMM(iso: string): string {
  const [, mes, dia] = iso.split('-')
  return `${dia}/${mes}`
}

function diasAtras(iso: string): number {
  const [ano, mes, dia] = iso.split('-').map(Number)
  const data = Date.UTC(ano, mes - 1, dia)
  const hoje = new Date()
  const hojeUTC = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  return Math.round((hojeUTC - data) / (24 * 60 * 60 * 1000))
}

function quando(iso: string): string {
  const dias = diasAtras(iso)
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'ontem'
  return `há ${dias} dias`
}

export default function SaudeTurmaPage() {
  const { id } = useParams<{ id: string }>()

  const [saude, setSaude] = useState<SaudeTurma | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    apiGet<SaudeTurma>(`/professor/turmas/${id}/saude`)
      .then(setSaude)
      .catch(() => setErro('Não foi possível carregar os registros da turma.'))
  }, [id])

  // Quem anotou dor moderada ou mais nos últimos 7 dias sobe pro topo: é a
  // informação que muda a aula de hoje.
  const alunas = saude
    ? [...saude.alunas].sort((a, b) => {
        const alerta = (aluna: AlunaSaude) =>
          aluna.ultimoRegistro &&
          aluna.ultimoRegistro.nivelDor !== null &&
          aluna.ultimoRegistro.nivelDor >= 3 &&
          diasAtras(aluna.ultimoRegistro.data) <= 7
            ? 0
            : 1
        return alerta(a) - alerta(b) || a.nome.localeCompare(b.nome)
      })
    : []

  return (
    <div className={styles.pagina}>
      <div className={styles.cabecalho}>
        <h1 className={styles.titulo}>
          {saude ? `Como a turma está — ${saude.turma.nome}` : 'Como a turma está'}
        </h1>
        <Link href={`/turmas/${id}/frequencia`} className={styles.link}>
          Ver frequência
        </Link>
      </div>

      <p className={styles.subtitulo}>
        O que as alunas registraram nos últimos 30 dias sobre dores e disposição.
      </p>

      {erro && <p className={styles.mensagemErro}>{erro}</p>}
      {!erro && !saude && <p className={styles.mensagem}>Carregando...</p>}

      {!erro && saude && saude.alunas.length === 0 && (
        <p className={styles.mensagem}>Nenhuma aluna ativa nesta turma.</p>
      )}

      {!erro && saude && alunas.length > 0 && (
        <ul className={styles.lista}>
          {alunas.map((aluna) => {
            const registro = aluna.ultimoRegistro
            const comDor = registro?.nivelDor !== null && registro?.nivelDor !== undefined && registro.nivelDor >= 3
            const recente = registro ? diasAtras(registro.data) <= 7 : false

            return (
              <li key={aluna.usuarioId} className={`${styles.card} ${comDor && recente ? styles.cardAlerta : ''}`}>
                <div className={styles.topoCard}>
                  <Link href={`/turmas/${id}/saude/${aluna.usuarioId}`} className={styles.nome}>
                    {aluna.nome}
                  </Link>
                  {registro && <span className={styles.quando}>{quando(registro.data)}</span>}
                </div>

                {!registro ? (
                  <p className={styles.semRegistro}>Sem registros no período.</p>
                ) : (
                  <>
                    <div className={styles.chips}>
                      {comDor && recente && (
                        <span className={styles.chipAlerta}>
                          <AlertTriangle size={13} />
                          Atenção
                        </span>
                      )}
                      {registro.nivelDor !== null && (
                        <span className={styles.chip}>Dor: {ROTULOS_DOR[registro.nivelDor]}</span>
                      )}
                      {registro.disposicao !== null && (
                        <span className={styles.chip}>
                          Disposição: {ROTULOS_DISPOSICAO[registro.disposicao]}
                        </span>
                      )}
                      {registro.locaisDor.map((local) => (
                        <span key={local} className={styles.chip}>
                          {LABELS_LOCAL_DOR[local]}
                        </span>
                      ))}
                    </div>

                    {registro.observacao && <p className={styles.observacao}>{registro.observacao}</p>}

                    <p className={styles.rodape}>
                      {aluna.registrosNoPeriodo}{' '}
                      {aluna.registrosNoPeriodo === 1 ? 'registro' : 'registros'} no período · último em{' '}
                      {formatarDDMM(registro.data)}
                    </p>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
