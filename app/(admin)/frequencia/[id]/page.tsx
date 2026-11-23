'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Check, ChevronLeft, ChevronRight, CircleCheck, X } from 'lucide-react'
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

// presente === null: ainda sem marcação (o dia não tem registro, ou ninguém mexeu).
type AlunaChamada = {
  matriculaId: number
  nome: string
  presente: boolean | null
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

  const hojeISO = paraISO(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(hojeISO)
  const [sujo, setSujo] = useState(false)
  const [alunasDia, setAlunasDia] = useState<AlunaChamada[]>([])
  const [carregandoDia, setCarregandoDia] = useState(true)
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

  const carregarDia = useCallback(
    (iso: string) => {
      setDiaSelecionado(iso)
      setCarregandoDia(true)
      setErroDia('')
      setSucessoDia(false)
      setSujo(false)

      apiGet<ChamadaResposta>(`/professor/turmas/${id}/chamada?data=${iso}`)
        .then((resposta) => {
          setAlunasDia(
            resposta.alunas.map((aluna) => ({
              matriculaId: aluna.matriculaId,
              nome: aluna.nome,
              // Sem registro naquele dia = sem marcação. Nada é presumido.
              presente: aluna.presente ?? null,
            }))
          )
        })
        .catch(() => setErroDia('Não foi possível carregar a chamada deste dia.'))
        .finally(() => setCarregandoDia(false))
    },
    [id]
  )

  // O dia de hoje já abre selecionado: é o que a coordenação quase sempre quer.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarDia(hojeISO)
  }, [carregarDia, hojeISO])

  // Trocar de dia com marcações não salvas perderia o trabalho: confirma antes.
  function escolherDia(iso: string) {
    if (iso === diaSelecionado) return
    if (sujo && !window.confirm('Há marcações não salvas neste dia. Trocar de dia e descartá-las?')) return
    carregarDia(iso)
  }

  // Aviso ao sair da página (fechar aba, recarregar, ou clicar num link do menu).
  useEffect(() => {
    if (!sujo) return
    function aoSair(evento: BeforeUnloadEvent) {
      evento.preventDefault()
    }
    function aoClicarLink(evento: MouseEvent) {
      const link = (evento.target as HTMLElement | null)?.closest?.('a[href]')
      if (!link || (link as HTMLAnchorElement).target === '_blank') return
      if (!window.confirm('Você tem marcações de chamada não salvas. Sair mesmo assim?')) {
        evento.preventDefault()
        evento.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', aoSair)
    document.addEventListener('click', aoClicarLink, true)
    return () => {
      window.removeEventListener('beforeunload', aoSair)
      document.removeEventListener('click', aoClicarLink, true)
    }
  }, [sujo])

  function marcar(matriculaId: number, presente: boolean) {
    setAlunasDia((atual) =>
      atual.map((aluna) => (aluna.matriculaId === matriculaId ? { ...aluna, presente } : aluna))
    )
    setSucessoDia(false)
    setErroDia('')
    setSujo(true)
  }

  function marcarTodas(presente: boolean) {
    setAlunasDia((atual) => atual.map((aluna) => ({ ...aluna, presente })))
    setSucessoDia(false)
    setErroDia('')
    setSujo(true)
  }

  async function salvarDia() {
    if (!diaSelecionado) return
    const semMarcacao = alunasDia.filter((aluna) => aluna.presente === null).length
    if (semMarcacao > 0) {
      setErroDia(
        semMarcacao === alunasDia.length
          ? 'Marque a presença das alunas (ou use "Todas presentes") antes de salvar.'
          : `Ainda faltam ${semMarcacao} ${semMarcacao === 1 ? 'aluna' : 'alunas'} sem marcação.`
      )
      return
    }
    setSalvando(true)
    setErroDia('')
    try {
      await apiPost(`/professor/turmas/${id}/chamada`, {
        data: diaSelecionado,
        presencas: alunasDia.map(({ matriculaId, presente }) => ({
          matriculaId,
          presente: presente === true,
        })),
      })
      setSucessoDia(true)
      setSujo(false)
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

  const totalMarcadas = alunasDia.filter((aluna) => aluna.presente !== null).length
  const diaTemRegistro = diaSelecionado ? datasComRegistro.has(diaSelecionado) : false
  const ehHoje = diaSelecionado === hojeISO

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
        <div className={styles.corpo}>
          {/* Lançamento: fica no topo, com o dia de hoje já selecionado */}
          {diaSelecionado && (
            <section className={styles.painelDia} aria-label="Lançar chamada">
              <div className={styles.cabecalhoDia}>
                <h2 className={styles.tituloDia}>
                  Chamada de {formatarDataDDMM(diaSelecionado)}
                  {ehHoje ? ' (hoje)' : ''}
                </h2>
                <span
                  className={`${styles.etiquetaDia} ${
                    diaTemRegistro ? styles.etiquetaComRegistro : styles.etiquetaSemRegistro
                  }`}
                >
                  {diaTemRegistro ? 'Chamada registrada' : 'Sem registro'}
                </span>
              </div>

              {carregandoDia && <p className={styles.mensagem}>Carregando...</p>}
              {!carregandoDia && erroDia && alunasDia.length === 0 && (
                <p className={styles.mensagemErro}>{erroDia}</p>
              )}

              {!carregandoDia && alunasDia.length === 0 && !erroDia && (
                <p className={styles.mensagem}>Nenhuma aluna ativa nesta turma.</p>
              )}

              {!carregandoDia && alunasDia.length > 0 && (
                <>
                  <div className={styles.acoesEmMassa}>
                    <button type="button" className={styles.botaoMassa} onClick={() => marcarTodas(true)}>
                      <Check size={16} aria-hidden="true" /> Todas presentes
                    </button>
                    <button type="button" className={styles.botaoMassa} onClick={() => marcarTodas(false)}>
                      <X size={16} aria-hidden="true" /> Todas ausentes
                    </button>
                    <span className={styles.contagemMarcadas}>
                      {totalMarcadas} de {alunasDia.length} marcadas
                    </span>
                  </div>

                  <ul className={styles.lista}>
                    {alunasDia.map((aluna) => (
                      <li key={aluna.matriculaId} className={styles.item}>
                        <div>
                          <span className={styles.nome}>{aluna.nome}</span>
                          {aluna.presente === null && <span className={styles.detalhe}>Sem marcação</span>}
                        </div>
                        <div className={styles.opcoes} role="group" aria-label={`Presença de ${aluna.nome}`}>
                          <button
                            type="button"
                            aria-pressed={aluna.presente === true}
                            className={`${styles.opcao} ${aluna.presente === true ? styles.opcaoPresente : ''}`}
                            onClick={() => marcar(aluna.matriculaId, true)}
                          >
                            <Check size={15} aria-hidden="true" /> Presente
                          </button>
                          <button
                            type="button"
                            aria-pressed={aluna.presente === false}
                            className={`${styles.opcao} ${aluna.presente === false ? styles.opcaoAusente : ''}`}
                            onClick={() => marcar(aluna.matriculaId, false)}
                          >
                            <X size={15} aria-hidden="true" /> Ausente
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {erroDia && <p className={styles.mensagemErro}>{erroDia}</p>}

                  <div className={styles.rodapeDia}>
                    <button className={styles.botaoSalvar} onClick={salvarDia} disabled={salvando}>
                      {salvando ? 'Salvando...' : 'Salvar chamada'}
                    </button>
                    {sujo && !salvando && <span className={styles.aviso}>Alterações não salvas</span>}
                    {sucessoDia && (
                      <span className={styles.sucesso}>
                        <CircleCheck size={16} aria-hidden="true" /> Chamada salva
                      </span>
                    )}
                  </div>
                </>
              )}
            </section>
          )}

          <section className={styles.colunaLateral}>
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
                      onClick={() => escolherDia(iso)}
                      aria-pressed={selecionado}
                      className={`${styles.celula} ${temRegistro ? styles.celulaComRegistro : ''} ${
                        selecionado ? styles.celulaSelecionada : ''
                      } ${iso === hojeISO ? styles.celulaHoje : ''}`}
                    >
                      {dia}
                    </button>
                  )
                })}
              </div>
            </div>

            <h2 className={styles.tituloSecao}>Resumo da turma</h2>
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
          </section>
        </div>
      )}
    </div>
  )
}
