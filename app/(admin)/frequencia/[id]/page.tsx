'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Check, ChevronLeft, ChevronRight, CircleCheck, Eraser } from 'lucide-react'
import { descreverQuando } from '../../../lib/frequencia-resumo'
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
const DIA_POR_INDICE = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO']
const QTD_RESUMO = 5

type InfoTurma = {
  dias: string[]
  horario: string | null
  projeto: { id: number; nome: string } | null
  professor: { id: string; nome: string } | null
}

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
  const [infoTurma, setInfoTurma] = useState<InfoTurma | null>(null)
  const [verTodasNoResumo, setVerTodasNoResumo] = useState(false)

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
    apiGet<InfoTurma>(`/turmas/${id}`).then(setInfoTurma).catch(() => {})
  }, [id])

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

  function limparMarcacoes() {
    setAlunasDia((atual) => atual.map((aluna) => ({ ...aluna, presente: null })))
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
  const presentesMarcadas = alunasDia.filter((aluna) => aluna.presente === true).length

  // Dia de aula da turma que já passou (ou é hoje) e ainda não tem chamada.
  const diasDeAula = new Set(infoTurma?.dias ?? [])
  function ehDiaDeAulaSemChamada(iso: string, dia: number): boolean {
    if (datasComRegistro.has(iso) || iso > hojeISO) return false
    return diasDeAula.has(DIA_POR_INDICE[new Date(mesAtual.ano, mesAtual.mes, dia).getDay()])
  }

  const resumoOrdenado = frequencia
    ? [...frequencia.alunas].sort(
        (a, b) => (a.percentualPresenca ?? 101) - (b.percentualPresenca ?? 101) || a.nome.localeCompare(b.nome)
      )
    : []
  const resumoVisivel = verTodasNoResumo ? resumoOrdenado : resumoOrdenado.slice(0, QTD_RESUMO)
  const comRegistro = resumoOrdenado.filter((a) => a.percentualPresenca !== null)
  const mediaTurma = comRegistro.length
    ? Math.round(comRegistro.reduce((soma, a) => soma + (a.percentualPresenca ?? 0), 0) / comRegistro.length)
    : null

  const subtitulo = [
    infoTurma ? descreverQuando(infoTurma.dias, infoTurma.horario) : '',
    infoTurma?.professor ? `Profª ${infoTurma.professor.nome}` : '',
    frequencia ? `${frequencia.alunas.length} alunas` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  const linkTurma = infoTurma?.projeto
    ? `/projetos/${infoTurma.projeto.id}/turmas?turma=${id}`
    : `/turmas/${id}/alunas`

  return (
    <div className={styles.pagina}>
      <header className={styles.header}>
        <div className={styles.headerTexto}>
          <span className={styles.trilha}>
            <Link href="/frequencia">Frequência</Link>
            {infoTurma?.projeto ? ` / ${infoTurma.projeto.nome}` : ''}
          </span>
          <h1 className={styles.titulo}>{frequencia ? frequencia.turma.nome : 'Frequência'}</h1>
          {subtitulo && <span className={styles.subtituloTurma}>{subtitulo}</span>}
        </div>
        <Link href={linkTurma} className={styles.botaoVoltar}>
          Ver turma
        </Link>
      </header>

      {erro && <p className={styles.mensagemErro}>{erro}</p>}
      {!erro && !frequencia && <p className={styles.mensagem}>Carregando...</p>}

      {!erro && frequencia && (
        <div className={styles.corpo}>
          <div className={styles.colunaLateral}>
            <section className={styles.cartao} aria-label="Calendário">
              <div className={styles.calendarioHeader}>
                <button type="button" onClick={() => mudarMes(-1)} className={styles.botaoMes} aria-label="Mês anterior">
                  <ChevronLeft size={18} />
                </button>
                <span className={styles.nomeMes}>{nomeMes}</span>
                <button type="button" onClick={() => mudarMes(1)} className={styles.botaoMes} aria-label="Próximo mês">
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
                  const pendente = ehDiaDeAulaSemChamada(iso, dia)
                  const selecionado = iso === diaSelecionado
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => escolherDia(iso)}
                      aria-pressed={selecionado}
                      className={`${styles.celula} ${temRegistro ? styles.celulaComRegistro : ''} ${
                        pendente ? styles.celulaPendente : ''
                      } ${selecionado ? styles.celulaSelecionada : ''} ${iso === hojeISO ? styles.celulaHoje : ''}`}
                    >
                      {dia}
                    </button>
                  )
                })}
              </div>

              <div className={styles.legenda}>
                <span>
                  <span className={`${styles.amostra} ${styles.amostraRegistro}`} />
                  Chamada registrada
                </span>
                {infoTurma?.dias?.length ? (
                  <span>
                    <span className={`${styles.amostra} ${styles.amostraPendente}`} />
                    Dia de aula sem chamada
                  </span>
                ) : null}
                <span>
                  <span className={`${styles.amostra} ${styles.amostraSelecionado}`} />
                  Dia selecionado
                </span>
              </div>
            </section>

            <section className={styles.cartao} aria-label="Resumo da turma">
              <div className={styles.resumoTopo}>
                <h2 className={styles.tituloCartao}>Resumo da turma</h2>
                {mediaTurma !== null && (
                  <span className={`${styles.media} ${styles[classePercentual(mediaTurma)]}`}>média {mediaTurma}%</span>
                )}
              </div>
              {frequencia.alunas.length === 0 ? (
                <p className={styles.mensagem}>Nenhuma aluna ativa nesta turma.</p>
              ) : (
                <>
                  <span className={styles.detalhe}>Menor presença primeiro</span>
                  <ul className={styles.listaResumo}>
                    {resumoVisivel.map((aluna) => (
                      <li key={aluna.matriculaId} className={styles.itemResumo}>
                        <div className={styles.itemResumoTexto}>
                          <span className={styles.nomeResumo}>{aluna.nome}</span>
                          <span className={styles.detalhe}>
                            {aluna.totalRegistros === 0
                              ? 'Sem chamadas registradas'
                              : aluna.faltas === 0
                                ? `Nenhuma falta em ${aluna.totalRegistros}`
                                : `${aluna.faltas} ${aluna.faltas === 1 ? 'falta' : 'faltas'} em ${aluna.totalRegistros}`}
                          </span>
                        </div>
                        <span className={`${styles.percentual} ${styles[classePercentual(aluna.percentualPresenca)]}`}>
                          {aluna.percentualPresenca === null ? '—' : `${aluna.percentualPresenca}%`}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {resumoOrdenado.length > QTD_RESUMO && (
                    <button type="button" className={styles.botaoLink} onClick={() => setVerTodasNoResumo((v) => !v)}>
                      {verTodasNoResumo ? 'Mostrar só as que mais faltam' : `Ver todas as ${resumoOrdenado.length} alunas`}
                    </button>
                  )}
                </>
              )}
            </section>
          </div>

          {diaSelecionado && (
            <section className={`${styles.cartao} ${styles.painelDia}`} aria-label="Lançar chamada">
              <div className={styles.cabecalhoDia}>
                <div className={styles.cabecalhoDiaTitulo}>
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
                {!carregandoDia && alunasDia.length > 0 && (
                  <div className={styles.acoesEmMassa}>
                    <button type="button" className={styles.botaoMassa} onClick={() => marcarTodas(true)}>
                      <Check size={16} aria-hidden="true" /> Todas presentes
                    </button>
                    <button type="button" className={styles.botaoMassa} onClick={limparMarcacoes}>
                      <Eraser size={16} aria-hidden="true" /> Limpar
                    </button>
                  </div>
                )}
              </div>

              {carregandoDia && <p className={styles.mensagemPainel}>Carregando...</p>}
              {!carregandoDia && erroDia && alunasDia.length === 0 && (
                <p className={`${styles.mensagemPainel} ${styles.mensagemErro}`}>{erroDia}</p>
              )}
              {!carregandoDia && alunasDia.length === 0 && !erroDia && (
                <p className={styles.mensagemPainel}>Nenhuma aluna ativa nesta turma.</p>
              )}

              {!carregandoDia && alunasDia.length > 0 && (
                <>
                  <ul className={styles.listaChamada}>
                    {alunasDia.map((aluna) => (
                      <li
                        key={aluna.matriculaId}
                        className={`${styles.itemChamada} ${
                          aluna.presente === true ? styles.itemPresente : aluna.presente === false ? styles.itemAusente : ''
                        }`}
                      >
                        <span className={styles.nomeChamada}>{aluna.nome}</span>
                        <div className={styles.opcoes} role="group" aria-label={`Presença de ${aluna.nome}`}>
                          <button
                            type="button"
                            aria-pressed={aluna.presente === true}
                            aria-label="Presente"
                            title="Presente"
                            className={`${styles.opcao} ${styles.opcaoP} ${aluna.presente === true ? styles.opcaoPresente : ''}`}
                            onClick={() => marcar(aluna.matriculaId, true)}
                          >
                            P
                          </button>
                          <button
                            type="button"
                            aria-pressed={aluna.presente === false}
                            aria-label="Ausente"
                            title="Ausente"
                            className={`${styles.opcao} ${styles.opcaoF} ${aluna.presente === false ? styles.opcaoAusente : ''}`}
                            onClick={() => marcar(aluna.matriculaId, false)}
                          >
                            F
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className={styles.rodapeDia}>
                    <button className={styles.botaoSalvar} onClick={salvarDia} disabled={salvando}>
                      {salvando ? 'Salvando...' : 'Salvar chamada'}
                    </button>
                    <span className={styles.contagemMarcadas}>
                      {totalMarcadas === 0
                        ? 'Nenhuma aluna marcada ainda'
                        : `${totalMarcadas} de ${alunasDia.length} marcadas · ${presentesMarcadas} ${
                            presentesMarcadas === 1 ? 'presente' : 'presentes'
                          }`}
                    </span>
                    {sujo && !salvando && <span className={styles.aviso}>Alterações não salvas</span>}
                    {sucessoDia && (
                      <span className={styles.sucesso}>
                        <CircleCheck size={16} aria-hidden="true" /> Chamada salva
                      </span>
                    )}
                    {erroDia && <span className={styles.mensagemErro}>{erroDia}</span>}
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  )
}

