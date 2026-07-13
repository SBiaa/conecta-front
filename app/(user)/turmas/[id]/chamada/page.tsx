'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { apiGet, apiPost } from '../../../../lib/api'
import styles from './chamada.module.css'

type AlunaResposta = {
  matriculaId: number
  nome: string
  presente: boolean | null
}

type ChamadaResposta = {
  turma: { id: number; nome: string }
  data: string
  alunas: AlunaResposta[]
}

type AlunaChamada = {
  matriculaId: number
  nome: string
  presente: boolean
}

function dataHojeISO(): string {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export default function ChamadaPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()

  const [data, setData] = useState(searchParams.get('data') || dataHojeISO())
  const [nomeTurma, setNomeTurma] = useState('')
  const [alunas, setAlunas] = useState<AlunaChamada[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    setCarregando(true)
    setErro('')
    setSucesso(false)

    apiGet<ChamadaResposta>(`/professor/turmas/${id}/chamada?data=${data}`)
      .then((resposta) => {
        setNomeTurma(resposta.turma.nome)
        setAlunas(
          resposta.alunas.map((aluna) => ({
            matriculaId: aluna.matriculaId,
            nome: aluna.nome,
            presente: aluna.presente ?? true,
          }))
        )
      })
      .catch(() => setErro('Não foi possível carregar a chamada.'))
      .finally(() => setCarregando(false))
  }, [id, data])

  function alternarPresenca(matriculaId: number) {
    setAlunas((atual) =>
      atual.map((aluna) =>
        aluna.matriculaId === matriculaId ? { ...aluna, presente: !aluna.presente } : aluna
      )
    )
    setSucesso(false)
  }

  function marcarTodasPresentes() {
    setAlunas((atual) => atual.map((aluna) => ({ ...aluna, presente: true })))
    setSucesso(false)
  }

  async function salvar() {
    setSalvando(true)
    setErro('')
    try {
      await apiPost(`/professor/turmas/${id}/chamada`, {
        data,
        presencas: alunas.map(({ matriculaId, presente }) => ({ matriculaId, presente })),
      })
      setSucesso(true)
    } catch {
      setErro('Não foi possível salvar a chamada.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className={styles.pagina}>
      <div className={styles.cabecalho}>
        <h1 className={styles.titulo}>{nomeTurma ? `Chamada — ${nomeTurma}` : 'Chamada'}</h1>
        <Link href={`/turmas/${id}/frequencia`} className={styles.linkFrequencia}>
          Ver frequência
        </Link>
      </div>

      <input
        type="date"
        className={styles.dataInput}
        value={data}
        onChange={(e) => setData(e.target.value)}
      />

      {carregando && <p className={styles.mensagem}>Carregando...</p>}

      {!carregando && erro && <p className={styles.mensagemErro}>{erro}</p>}

      {!carregando && !erro && alunas.length === 0 && (
        <p className={styles.mensagem}>Nenhuma aluna ativa nesta turma.</p>
      )}

      {!carregando && !erro && alunas.length > 0 && (
        <>
          <button type="button" className={styles.marcarTodas} onClick={marcarTodasPresentes}>
            Marcar todas presentes
          </button>

          <ul className={styles.lista}>
            {alunas.map((aluna) => (
              <li key={aluna.matriculaId} className={styles.item}>
                <span className={styles.nome}>{aluna.nome}</span>
                <button
                  type="button"
                  className={`${styles.toggle} ${
                    aluna.presente ? styles.togglePresente : styles.toggleAusente
                  }`}
                  onClick={() => alternarPresenca(aluna.matriculaId)}
                >
                  {aluna.presente ? 'Presente' : 'Ausente'}
                </button>
              </li>
            ))}
          </ul>

          <div className={styles.rodape}>
            <button className={styles.botaoSalvar} onClick={salvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar chamada'}
            </button>
            {sucesso && <span className={styles.sucesso}>Chamada salva ✓</span>}
          </div>
        </>
      )}
    </div>
  )
}
