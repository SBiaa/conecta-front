'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { apiGet } from '../../lib/api'
import {
  descreverQuando,
  diaSemanaHoje,
  extrairHora,
  faixaPresenca,
  hojeISO,
  type ResumoFrequencia,
} from '../../lib/frequencia-resumo'
import styles from './frequencia.module.css'

type Turma = {
  id: number
  nome: string
  projetoId: number
  projeto: { nome: string } | null
  dias: string[]
  horario: string | null
  ativas: number
}

// Uma cor por projeto, na ordem em que aparecem — só pra separar visualmente.
const CORES_PROJETO = [
  'var(--accent-hidro)',
  'var(--accent-corpo)',
  'var(--accent-corpo-2)',
  'var(--accent-cinema)',
  'var(--accent-cinema-2)',
]

export default function FrequenciaListaPage() {
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [resumo, setResumo] = useState<ResumoFrequencia | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')

  const hoje = useMemo(() => hojeISO(), [])
  const diaHoje = useMemo(() => diaSemanaHoje(), [])
  const dataExtenso = useMemo(() => {
    const texto = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    return texto.charAt(0).toUpperCase() + texto.slice(1)
  }, [])

  useEffect(() => {
    apiGet<Turma[]>('/turmas')
      .then(setTurmas)
      .catch(() => setErro('Não foi possível carregar as turmas.'))
      .finally(() => setCarregando(false))
    apiGet<ResumoFrequencia>(`/turmas/frequencia-resumo?hoje=${hoje}`)
      .then(setResumo)
      .catch(() => setResumo(null))
  }, [hoje])

  const freqPorTurma = useMemo(
    () => new Map((resumo?.turmas ?? []).map((t) => [t.turmaId, t])),
    [resumo]
  )

  const corPorProjeto = useMemo(() => {
    const mapa = new Map<number, string>()
    turmas.forEach((t) => {
      if (!mapa.has(t.projetoId)) mapa.set(t.projetoId, CORES_PROJETO[mapa.size % CORES_PROJETO.length])
    })
    return mapa
  }, [turmas])

  const termo = busca.trim().toLowerCase()
  const turmasFiltradas = termo ? turmas.filter((t) => t.nome.toLowerCase().includes(termo)) : turmas

  const aulasHoje = useMemo(
    () =>
      turmas
        .filter((t) => t.dias?.includes(diaHoje))
        .sort((a, b) => (extrairHora(a.horario) ?? 99) - (extrairHora(b.horario) ?? 99)),
    [turmas, diaHoje]
  )
  const feitasHoje = aulasHoje.filter((t) => freqPorTurma.get(t.id)?.chamadaHoje).length

  const porProjeto = useMemo(() => {
    const grupos = new Map<string, Turma[]>()
    for (const turma of turmasFiltradas) {
      const nome = turma.projeto?.nome ?? 'Sem projeto'
      if (!grupos.has(nome)) grupos.set(nome, [])
      grupos.get(nome)!.push(turma)
    }
    return Array.from(grupos.entries())
  }, [turmasFiltradas])

  return (
    <div className={styles.pagina}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.titulo}>Frequência</h1>
          <span className={styles.data}>{dataExtenso}</span>
        </div>
        <label className={styles.busca}>
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar turma"
            aria-label="Buscar turma"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
          />
        </label>
      </header>

      {carregando && <p className={styles.mensagem}>Carregando...</p>}
      {!carregando && erro && <p className={styles.mensagem}>{erro}</p>}
      {!carregando && !erro && turmas.length === 0 && <p className={styles.mensagem}>Nenhuma turma cadastrada</p>}

      {!carregando && !erro && turmas.length > 0 && (
        <div className={styles.corpo}>
          <div className={styles.colunaPrincipal}>
            <section aria-label="Aulas de hoje" className={styles.secao}>
              <div className={styles.secaoTopo}>
                <h2 className={styles.subtitulo}>Aulas de hoje</h2>
                {aulasHoje.length > 0 && (
                  <span className={styles.secaoDetalhe}>
                    {aulasHoje.length} {aulasHoje.length === 1 ? 'aula' : 'aulas'} · {feitasHoje}{' '}
                    {feitasHoje === 1 ? 'chamada feita' : 'chamadas feitas'}
                  </span>
                )}
              </div>
              {aulasHoje.length === 0 ? (
                <p className={styles.mensagem}>Nenhuma turma tem aula hoje.</p>
              ) : (
                <div className={styles.gradeHoje}>
                  {aulasHoje.map((turma) => {
                    const freq = freqPorTurma.get(turma.id)
                    const feita = !!freq?.chamadaHoje
                    return (
                      <div
                        key={turma.id}
                        className={styles.cartaoHoje}
                        style={{ borderTopColor: corPorProjeto.get(turma.projetoId) }}
                      >
                        <div className={styles.cartaoHojeTopo}>
                          <span className={styles.hora}>{turma.horario || '—'}</span>
                          <span className={`${styles.status} ${feita ? styles.statusFeita : styles.statusPendente}`}>
                            {feita ? 'Chamada feita' : 'Pendente'}
                          </span>
                        </div>
                        <div>
                          <div className={styles.nomeTurma}>{turma.nome}</div>
                          <div className={styles.detalhe}>{turma.projeto?.nome}</div>
                        </div>
                        <span className={styles.resumoHoje}>
                          {feita
                            ? `${freq!.presentesHoje} de ${freq!.registradasHoje} presentes`
                            : `${turma.ativas} alunas na turma`}
                        </span>
                        <Link
                          href={`/frequencia/${turma.id}`}
                          className={feita ? styles.botaoSecundario : styles.botaoPrimario}
                        >
                          {feita ? 'Ver chamada' : 'Fazer chamada'}
                        </Link>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            <section aria-label="Todas as turmas" className={styles.secao}>
              <div className={styles.secaoTopo}>
                <h2 className={styles.subtitulo}>Todas as turmas</h2>
                <span className={styles.secaoDetalhe}>presença dos últimos 30 dias</span>
              </div>
              {porProjeto.length === 0 && <p className={styles.mensagem}>Nenhuma turma com esse nome</p>}
              <div className={styles.gradeProjetos}>
                {porProjeto.map(([nomeProjeto, turmasDoProjeto]) => (
                  <div key={nomeProjeto} className={styles.cartaoProjeto}>
                    <div className={styles.cartaoProjetoTopo}>
                      <span
                        className={styles.bolinha}
                        style={{ backgroundColor: corPorProjeto.get(turmasDoProjeto[0].projetoId) }}
                        aria-hidden="true"
                      />
                      <h3 className={styles.nomeProjeto}>{nomeProjeto}</h3>
                    </div>
                    <ul className={styles.listaTurmas}>
                      {turmasDoProjeto.map((turma) => {
                        const pct = freqPorTurma.get(turma.id)?.percentualPresenca ?? null
                        const faixa = faixaPresenca(pct)
                        return (
                          <li key={turma.id}>
                            <Link href={`/frequencia/${turma.id}`} className={styles.linhaTurma}>
                              <div className={styles.linhaTexto}>
                                <span className={styles.nomeTurma}>{turma.nome}</span>
                                <span className={styles.detalhe}>
                                  {descreverQuando(turma.dias, turma.horario)} · {turma.ativas} alunas
                                </span>
                              </div>
                              <div className={styles.presenca}>
                                <span className={`${styles.percentual} ${styles[`faixa_${faixa}`]}`}>
                                  {pct === null ? '—' : `${pct}%`}
                                </span>
                                <span className={styles.barra} aria-hidden="true">
                                  <span
                                    className={`${styles.barraCheia} ${styles[`fundo_${faixa}`]}`}
                                    style={{ width: `${pct ?? 0}%` }}
                                  />
                                </span>
                              </div>
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside aria-label="Precisam de atenção" className={styles.atencao}>
            <div>
              <h2 className={styles.subtituloMenor}>Precisam de atenção</h2>
              <span className={styles.detalhe}>Presença abaixo de 75% nos últimos 30 dias</span>
            </div>
            {!resumo && <p className={styles.mensagem}>Carregando...</p>}
            {resumo && resumo.atencao.length === 0 && (
              <p className={styles.mensagem}>Nenhuma aluna com muitas faltas.</p>
            )}
            {resumo && resumo.atencao.length > 0 && (
              <ul className={styles.listaAtencao}>
                {resumo.atencao.map((aluna) => (
                  <li key={`${aluna.usuarioId}-${aluna.turmaId}`}>
                    <Link href={`/associados/${aluna.usuarioId}`} className={styles.linhaAtencao}>
                      <div className={styles.linhaTexto}>
                        <span className={styles.nomeTurma}>{aluna.nome}</span>
                        <span className={styles.detalhe}>
                          {aluna.turmaNome} · {aluna.faltas} {aluna.faltas === 1 ? 'falta' : 'faltas'} em {aluna.total}
                        </span>
                      </div>
                      <span className={styles.pilulaCritica}>{aluna.percentualPresenca}%</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
