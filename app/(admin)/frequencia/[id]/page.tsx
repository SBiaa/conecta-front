'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { apiGet, apiPost } from '../../../lib/api'
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

type AlunaChamadaResposta = {
  matriculaId: number
  nome: string
  presente: boolean | null
}

type ChamadaResposta = {
  alunas: AlunaChamadaResposta[]
}

type AlunaChamada = {
  matriculaId: number
  nome: string
  presente: boolean
}

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function paraISO(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
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

export default function FrequenciaTurmaAdminPage() {
  const { id } = useParams<{ id: string }>()

  const [frequencia, setFrequencia] = useState<Frequencia | null>(null)
  const [erro, setErro] = useState('')

  const hoje = useMemo(() => new Date(), [])
  const [mesAtual, setMesAtual] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() })

  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)
  const [alunasDia, setAlunasDia] = useState<AlunaChamada[]>([])
  const [carregandoDia, setCarregandoDia] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [sucessoDia, setSucessoDia] = useState(false)
  const [erroDia, setErroDia] = useState('')

  function carregarFrequencia() {
    return apiGet<Frequencia>(`/professor/turmas/${id}/frequencia`)
      .then(setFrequencia)
      .catch(() => setErro('Não foi possível carregar a frequência.'))
  }

  useEffect(() => {
    carregarFrequencia()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const datasComRegistro = useMemo(() => new Set(frequencia?.datas ?? []), [frequencia])

  function carregarDia(iso: string) {
    setDiaSelecionado(iso)
    setCarregandoDia(true)
    setErroDia('')
    setSucessoDia(false)

    apiGet<ChamadaResposta>(`/professor/turmas/${id}/chamada?data=${iso}`)
      .then((resposta) => {
        setAlunasDia(
          resposta.alunas.map((aluna) => ({
            matriculaId: aluna.matriculaId,
            nome: aluna.nome,
            presente: aluna.presente ?? true,
          }))
        )
      })
      .catch(() => setErroDia('Não foi possível carregar a chamada deste dia.'))
      .finally(() => setCarregandoDia(false))
  }

  function alternarPresenca(matriculaId: number) {
    setAlunasDia((atual) =>
      atual.map((aluna) =>
        aluna.matriculaId === matriculaId ? { ...aluna, presente: !aluna.presente } : aluna
      )
    )
    setSucessoDia(false)
  }

  async function salvarDia() {
    if (!diaSelecionado) return
    setSalvando(true)
    setErroDia('')
    try {
      await apiPost(`/professor/turmas/${id}/chamada`, {
        data: diaSelecionado,
        presencas: alunasDia.map(({ matriculaId, presente }) => ({ matriculaId, presente })),
      })
      setSucessoDia(true)
      carregarFrequencia()
    } catch {
      setErroDia('Não foi possível salvar a chamada.')
    } finally {
      setSalvando(false)
    }
  }

  function mudarMes(delta: number) {
    setMesAtual((atual) => {
      const data = new Date(atual.ano, atual.mes + delta, 1)
      return { ano: data.getFullYear(), mes: data.getMonth() }
    })
  }

  const celulas = useMemo(() => {
    const primeiroDiaSemana = new Date(mesAtual.ano, mesAtual.mes, 1).getDay()
    const totalDias = new Date(mesAtual.ano, mesAtual.mes + 1, 0).getDate()
    const dias: (number | null)[] = Array(primeiroDiaSemana).fill(null)
    for (let dia = 1; dia <= totalDias; dia++) dias.push(dia)
    return dias
  }, [mesAtual])

  const nomeMesBase = new Date(mesAtual.ano, mesAtual.mes, 1).toLocaleDateString('pt-BR', {
    month: 'long',
  })
  const nomeMes = `${nomeMesBase.charAt(0).toUpperCase()}${nomeMesBase.slice(1)} de ${mesAtual.ano}`

  return (
    <div className={styles.pagina}>
      <div className={styles.header}>
        <h1 className={styles.titulo}>
          {frequencia ? `Frequência — ${frequencia.turma.nome}` : 'Frequência'}
        </h1>
        <Link href={`/turmas/${id}/alunas`} className={styles.botaoVoltar}>
          Ver turma
        </Link>
      </div>

      {erro && <p className={styles.mensagemErro}>{erro}</p>}
      {!erro && !frequencia && <p className={styles.mensagem}>Carregando...</p>}

      {!erro && frequencia && (
        <>
          {frequencia.alunas.length === 0 ? (
            <p className={styles.mensagem}>Nenhuma aluna ativa nesta turma.</p>
          ) : (
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
                  <span
                    className={`${styles.percentual} ${styles[classePercentual(aluna.percentualPresenca)]}`}
                  >
                    {aluna.percentualPresenca === null ? '—' : `${aluna.percentualPresenca}%`}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <h2 className={styles.tituloSecao}>Calendário</h2>

          <div className={styles.calendario}>
            <div className={styles.calendarioHeader}>
              <button
                type="button"
                onClick={() => mudarMes(-1)}
                className={styles.botaoMes}
                aria-label="Mês anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <span className={styles.nomeMes}>{nomeMes}</span>
              <button
                type="button"
                onClick={() => mudarMes(1)}
                className={styles.botaoMes}
                aria-label="Próximo mês"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className={styles.diasSemana}>
              {DIAS_SEMANA.map((dia, index) => (
                <span key={index}>{dia}</span>
              ))}
            </div>

            <div className={styles.grade}>
              {celulas.map((dia, index) => {
                if (dia === null) return <span key={index} className={styles.celulaVazia} />
                const iso = paraISO(mesAtual.ano, mesAtual.mes, dia)
                const temRegistro = datasComRegistro.has(iso)
                const selecionado = iso === diaSelecionado
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => carregarDia(iso)}
                    className={`${styles.celula} ${temRegistro ? styles.celulaComRegistro : ''} ${
                      selecionado ? styles.celulaSelecionada : ''
                    }`}
                  >
                    {dia}
                  </button>
                )
              })}
            </div>
          </div>

          {diaSelecionado && (
            <div className={styles.painelDia}>
              <h2 className={styles.tituloSecao}>{formatarDataDDMM(diaSelecionado)}</h2>

              {carregandoDia && <p className={styles.mensagem}>Carregando...</p>}
              {!carregandoDia && erroDia && <p className={styles.mensagemErro}>{erroDia}</p>}

              {!carregandoDia && !erroDia && alunasDia.length === 0 && (
                <p className={styles.mensagem}>Nenhuma aluna ativa nesta turma.</p>
              )}

              {!carregandoDia && !erroDia && alunasDia.length > 0 && (
                <>
                  <ul className={styles.lista}>
                    {alunasDia.map((aluna) => (
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

                  <div className={styles.rodapeDia}>
                    <button className={styles.botaoSalvar} onClick={salvarDia} disabled={salvando}>
                      {salvando ? 'Salvando...' : 'Salvar chamada'}
                    </button>
                    {sucessoDia && <span className={styles.sucesso}>Chamada salva ✓</span>}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
