'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Check, Plus, Search } from 'lucide-react'
import { apiGet, apiPatch } from '../../../../lib/api'
import {
  DIAS_CURTOS,
  DIAS_ORDEM,
  descreverQuando,
  diaSemanaHoje,
  extrairHora,
  faixaPresenca,
  hojeISO,
  type ResumoFrequencia,
} from '../../../../lib/frequencia-resumo'
import styles from './turmas.module.css'

type Turma = {
  id: number
  nome: string
  dias: string[]
  horario: string | null
  ativas: number
  inativas: number
  professor: { id: string; nome: string } | null
}

type Projeto = { id: number; nome: string }
type Professor = { id: string; nome: string }
type Aluna = { id: number; usuario: { id: string; nome: string } }

function iniciais(nome: string): string {
  return nome
    .split(' ')
    .filter((parte) => parte.length > 2)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()
}

export default function TurmasDoProjetoPage() {
  const { id } = useParams<{ id: string }>()
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [nomeProjeto, setNomeProjeto] = useState('')
  const [resumo, setResumo] = useState<ResumoFrequencia | null>(null)
  const [resumoPronto, setResumoPronto] = useState(false)
  const [selecionadaId, setSelecionadaId] = useState<number | null>(null)

  const hoje = useMemo(() => hojeISO(), [])
  const diaHoje = useMemo(() => diaSemanaHoje(), [])

  useEffect(() => {
    apiGet<Turma[]>(`/turmas?projetoId=${id}`)
      .then(setTurmas)
      .catch(() => setErro('Não foi possível carregar as turmas deste projeto'))
      .finally(() => setCarregando(false))
    apiGet<ResumoFrequencia>(`/turmas/frequencia-resumo?projetoId=${id}&hoje=${hoje}`)
      .then(setResumo)
      .catch(() => setResumo(null))
      .finally(() => setResumoPronto(true))
    apiGet<Projeto[]>('/projetos')
      .then((projetos) => setNomeProjeto(projetos.find((p) => String(p.id) === id)?.nome ?? ''))
      .catch(() => {})
  }, [id, hoje])

  const freqPorTurma = useMemo(
    () => new Map((resumo?.turmas ?? []).map((t) => [t.turmaId, t])),
    [resumo]
  )

  const temAulaHoje = (turma: Turma) => turma.dias?.includes(diaHoje) ?? false
  const statusHoje = (turma: Turma): 'semAula' | 'feita' | 'pendente' => {
    if (!temAulaHoje(turma)) return 'semAula'
    return freqPorTurma.get(turma.id)?.chamadaHoje ? 'feita' : 'pendente'
  }

  const turmasNaGrade = useMemo(
    () => turmas.filter((t) => t.dias?.length && extrairHora(t.horario) !== null),
    [turmas]
  )
  const turmasForaDaGrade = useMemo(
    () => turmas.filter((t) => !t.dias?.length || extrairHora(t.horario) === null),
    [turmas]
  )
  const dias = useMemo(
    () => DIAS_ORDEM.filter((dia) => turmasNaGrade.some((t) => t.dias.includes(dia))),
    [turmasNaGrade]
  )
  // Só as horas que têm aula: linha vazia só empurrava a tela pra baixo.
  const horas = useMemo(
    () => Array.from(new Set(turmasNaGrade.map((t) => extrairHora(t.horario) as number))).sort((a, b) => a - b),
    [turmasNaGrade]
  )

  // Turma aberta ao entrar: a do link (?turma=), senão a que tem chamada
  // pendente hoje, senão a primeira da grade.
  useEffect(() => {
    if (selecionadaId !== null || turmas.length === 0 || !resumoPronto) return
    const doLink = Number(new URLSearchParams(window.location.search).get('turma'))
    const inicial =
      turmas.find((t) => t.id === doLink) ??
      turmas.find((t) => t.dias?.includes(diaHoje) && !freqPorTurma.get(t.id)?.chamadaHoje) ??
      turmasNaGrade[0] ??
      turmas[0]
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelecionadaId(inicial.id)
  }, [turmas, turmasNaGrade, freqPorTurma, diaHoje, selecionadaId, resumoPronto])

  const selecionada = turmas.find((t) => t.id === selecionadaId) ?? null

  const totalAtivas = turmas.reduce((soma, t) => soma + t.ativas, 0)
  const totalProfessoras = new Set(turmas.map((t) => t.professor?.id).filter(Boolean)).size
  const pendentesHoje = turmas.filter((t) => statusHoje(t) === 'pendente').length

  function selecionar(turmaId: number) {
    setSelecionadaId(turmaId)
    const url = new URL(window.location.href)
    url.searchParams.set('turma', String(turmaId))
    window.history.replaceState(null, '', url)
  }

  function chip(turma: Turma, formato: 'cartao' | 'etiqueta') {
    const ativa = turma.id === selecionadaId
    const classe = formato === 'cartao' ? styles.chipTurma : styles.etiquetaTurma
    return (
      <button
        key={turma.id}
        type="button"
        aria-pressed={ativa}
        onClick={() => selecionar(turma.id)}
        className={`${classe} ${ativa ? styles.chipAtivo : ''}`}
      >
        {formato === 'cartao' ? (
          <>
            <span className={styles.chipNome}>{turma.nome}</span>
            <span className={styles.chipContagem}>{turma.ativas} alunas</span>
          </>
        ) : (
          `${turma.nome} · ${turma.ativas}`
        )}
      </button>
    )
  }

  return (
    <div className={styles.pagina}>
      <header className={styles.header}>
        <div className={styles.headerTexto}>
          <span className={styles.trilha}>
            <Link href="/projetos">Projetos</Link> / {nomeProjeto || 'Projeto'}
          </span>
          <h1 className={styles.titulo}>{nomeProjeto || 'Turmas do projeto'}</h1>
          {!carregando && turmas.length > 0 && (
            <div className={styles.pilulas}>
              <span className={styles.pilula}>{turmas.length} {turmas.length === 1 ? 'turma' : 'turmas'}</span>
              <span className={styles.pilula}>{totalAtivas} alunas ativas</span>
              <span className={styles.pilula}>
                {totalProfessoras} {totalProfessoras === 1 ? 'professora' : 'professoras'}
              </span>
              {pendentesHoje > 0 && (
                <span className={`${styles.pilula} ${styles.pilulaAviso}`}>
                  {pendentesHoje} {pendentesHoje === 1 ? 'chamada de hoje pendente' : 'chamadas de hoje pendentes'}
                </span>
              )}
            </div>
          )}
        </div>
        <div className={styles.headerAcoes}>
          <Link href={`/projetos/${id}/editar`} className={styles.botaoSecundario}>
            Editar projeto
          </Link>
          <Link href={`/turmas/nova?projetoId=${id}`} className={styles.botaoPrimario}>
            <Plus size={18} aria-hidden="true" /> Nova turma
          </Link>
        </div>
      </header>

      {carregando && <p className={styles.mensagem}>Carregando...</p>}
      {!carregando && erro && <p className={styles.mensagem}>{erro}</p>}
      {!carregando && !erro && turmas.length === 0 && (
        <p className={styles.mensagem}>Nenhuma turma neste projeto ainda</p>
      )}

      {!carregando && !erro && turmas.length > 0 && (
        <div className={styles.corpo}>
          <section className={styles.cartao} aria-label="Grade da semana">
            <div className={styles.cartaoTopo}>
              <h2 className={styles.subtitulo}>Grade da semana</h2>
              <span className={styles.dica}>Clique numa turma para ver as alunas ao lado</span>
            </div>

            {dias.length > 0 && (
              <div className={styles.gradeWrapper}>
                <div
                  className={styles.grade}
                  style={{ gridTemplateColumns: `3.5rem repeat(${dias.length}, minmax(7rem, 1fr))` }}
                >
                  <div />
                  {dias.map((dia) => (
                    <div key={dia} className={`${styles.gradeDia} ${dia === diaHoje ? styles.gradeDiaHoje : ''}`}>
                      {DIAS_CURTOS[dia]}
                      {dia === diaHoje ? ' · hoje' : ''}
                    </div>
                  ))}
                  {horas.map((hora) => (
                    <div key={hora} style={{ display: 'contents' }}>
                      <div className={styles.gradeHora}>{String(hora).padStart(2, '0')}h</div>
                      {dias.map((dia) => (
                        <div key={dia} className={styles.gradeCelula}>
                          {turmasNaGrade
                            .filter((t) => extrairHora(t.horario) === hora && t.dias.includes(dia))
                            .map((t) => chip(t, 'cartao'))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {turmasForaDaGrade.length > 0 && (
              <div className={styles.semHorario}>
                <span className={styles.semHorarioTitulo}>Sem horário definido:</span>
                {turmasForaDaGrade.map((t) => chip(t, 'etiqueta'))}
              </div>
            )}
          </section>

          {selecionada && (
            <PainelTurma
              key={selecionada.id}
              turma={selecionada}
              presenca={freqPorTurma.get(selecionada.id)?.percentualPresenca ?? null}
              hoje={statusHoje(selecionada)}
              onProfessoraSalva={(professor) =>
                setTurmas((atual) => atual.map((t) => (t.id === selecionada.id ? { ...t, professor } : t)))
              }
            />
          )}
        </div>
      )}
    </div>
  )
}

const ROTULO_HOJE = {
  semAula: 'Sem aula hoje',
  feita: 'Feita',
  pendente: 'Pendente',
}

function PainelTurma({
  turma,
  presenca,
  hoje,
  onProfessoraSalva,
}: {
  turma: Turma
  presenca: number | null
  hoje: 'semAula' | 'feita' | 'pendente'
  onProfessoraSalva: (professor: { id: string; nome: string } | null) => void
}) {
  const [alunas, setAlunas] = useState<Aluna[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [professores, setProfessores] = useState<Professor[]>([])
  const [professorId, setProfessorId] = useState(turma.professor?.id ?? '')
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  useEffect(() => {
    apiGet<Aluna[]>(`/turmas/${turma.id}/matriculas?ativa=true`)
      .then((lista) => setAlunas([...lista].sort((a, b) => a.usuario.nome.localeCompare(b.usuario.nome))))
      .catch(() => setAlunas([]))
      .finally(() => setCarregando(false))
    apiGet<Professor[]>('/usuarios?papel=PROFESSOR').then(setProfessores).catch(() => {})
  }, [turma.id])

  async function trocarProfessora(novoId: string) {
    setProfessorId(novoId)
    setAviso(null)
    setSalvando(true)
    try {
      await apiPatch(`/turmas/${turma.id}`, { professorId: novoId || null })
      const professor = professores.find((p) => p.id === novoId) ?? null
      onProfessoraSalva(professor)
      setAviso({ tipo: 'ok', texto: 'Professora atualizada' })
    } catch {
      setAviso({ tipo: 'erro', texto: 'Não foi possível salvar a professora' })
    } finally {
      setSalvando(false)
    }
  }

  const termo = busca.trim().toLowerCase()
  const alunasFiltradas = termo
    ? alunas.filter((a) => a.usuario.nome.toLowerCase().includes(termo))
    : alunas

  const faixa = faixaPresenca(presenca)

  return (
    <aside className={`${styles.cartao} ${styles.painel}`} aria-label={`Turma ${turma.nome}`}>
      <div className={styles.painelTopo}>
        <div className={styles.painelTitulo}>
          <div>
            <h2 className={styles.painelNome}>{turma.nome}</h2>
            <span className={styles.painelQuando}>{descreverQuando(turma.dias, turma.horario)}</span>
          </div>
          <Link href={`/frequencia/${turma.id}`} className={styles.botaoChamada}>
            <Check size={16} aria-hidden="true" /> Fazer chamada
          </Link>
        </div>
        <div className={styles.campoProfessora}>
          <label htmlFor="professora">Professora</label>
          <select
            id="professora"
            value={professorId}
            disabled={salvando}
            onChange={(evento) => trocarProfessora(evento.target.value)}
          >
            <option value="">Sem professora definida</option>
            {professores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
        {aviso && (
          <span className={aviso.tipo === 'ok' ? styles.sucesso : styles.erro} role="status">
            {aviso.texto}
          </span>
        )}
      </div>

      <div className={styles.numeros}>
        <div className={styles.numero}>
          <span className={styles.numeroRotulo}>Ativas</span>
          <span className={styles.numeroValor}>{turma.ativas}</span>
          <span className={styles.numeroDetalhe}>{turma.inativas} inativas</span>
        </div>
        <div className={styles.numero}>
          <span className={styles.numeroRotulo}>Presença</span>
          <span className={`${styles.numeroValor} ${styles[`faixa_${faixa}`]}`}>
            {presenca === null ? '—' : `${presenca}%`}
          </span>
          <span className={styles.numeroDetalhe}>últimos 30 dias</span>
        </div>
        <div className={styles.numero}>
          <span className={styles.numeroRotulo}>Hoje</span>
          <span className={`${styles.etiquetaHoje} ${styles[`hoje_${hoje}`]}`}>{ROTULO_HOJE[hoje]}</span>
        </div>
      </div>

      <div className={styles.painelAlunas}>
        <div className={styles.painelAlunasTopo}>
          <h3 className={styles.subtituloMenor}>Alunas</h3>
          <div className={styles.acoesPequenas}>
            <Link href={`/turmas/${turma.id}/imprimir-lista`} className={styles.botaoPequeno}>
              Lista p/ imprimir
            </Link>
            <Link href={`/turmas/${turma.id}/editar`} className={styles.botaoPequeno}>
              Editar turma
            </Link>
          </div>
        </div>

        <label className={styles.busca}>
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar aluna nesta turma"
            aria-label="Buscar aluna nesta turma"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
          />
        </label>

        {carregando && <p className={styles.mensagem}>Carregando...</p>}
        {!carregando && alunas.length === 0 && <p className={styles.mensagem}>Nenhuma aluna ativa nesta turma</p>}
        {!carregando && alunas.length > 0 && alunasFiltradas.length === 0 && (
          <p className={styles.mensagem}>Nenhuma aluna com esse nome</p>
        )}

        {alunasFiltradas.length > 0 && (
          <ul className={styles.listaAlunas}>
            {alunasFiltradas.map((aluna) => (
              <li key={aluna.id}>
                <Link href={`/associados/${aluna.usuario.id}`} className={styles.aluna}>
                  <span className={styles.avatar} aria-hidden="true">
                    {iniciais(aluna.usuario.nome)}
                  </span>
                  <span className={styles.alunaNome}>{aluna.usuario.nome}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Link href={`/matriculas/nova?turmaId=${turma.id}`} className={styles.botaoNovaAluna}>
          <Plus size={16} aria-hidden="true" /> Nova aluna nesta turma
        </Link>
      </div>
    </aside>
  )
}
