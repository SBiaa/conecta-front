'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { apiGet, apiPost } from '../../../lib/api'
import { formatarMoeda, formatarData } from '../../../lib/formato'
import ConfirmDialog from '../../../components/ConfirmDialog'
import base from '../financeiro.module.css'
import styles from './atrasados.module.css'

type Projeto = {
  id: string | number
  nome: string
}

type AlunaAtrasada = {
  matriculaId: number
  dataInicio: string
  usuario: { id: string; nome: string }
  turmas: { id: number; nome: string; projeto: { id: number; nome: string } }[]
  ultimaPresenca: string | null
  quantidade: number
  total: number
  vencimentoMaisAntigo: string
  meses: string[]
}

type FiltroPresenca = '' | 'nunca' | '30' | '60' | '90'

const DIA_MS = 24 * 60 * 60 * 1000

// Dias desde uma data salva como meia-noite UTC (presença é @db.Date).
function diasDesde(data: string) {
  const d = new Date(data)
  const hoje = new Date()
  const hojeUTC = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const dataUTC = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  return Math.max(0, Math.round((hojeUTC - dataUTC) / DIA_MS))
}

function textoDias(dias: number) {
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'ontem'
  return `há ${dias} dias`
}

// Quem nunca veio ou está há mais tempo sem vir aparece primeiro.
function diasSemVir(aluna: AlunaAtrasada) {
  return aluna.ultimaPresenca ? diasDesde(aluna.ultimaPresenca) : Number.POSITIVE_INFINITY
}

function plural(n: number, singular: string, pluralForma: string) {
  return `${n} ${n === 1 ? singular : pluralForma}`
}

export default function AtrasadosPorAlunaPage() {
  const [alunas, setAlunas] = useState<AlunaAtrasada[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [nomeFiltro, setNomeFiltro] = useState('')
  const [projetoFiltro, setProjetoFiltro] = useState('')
  const [presencaFiltro, setPresencaFiltro] = useState<FiltroPresenca>('')

  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set())
  const [confirmando, setConfirmando] = useState<number[] | null>(null)
  const [inativando, setInativando] = useState(false)
  const [erroInativar, setErroInativar] = useState<string | null>(null)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    apiGet<Projeto[]>('/projetos').then(setProjetos).catch(() => {})
  }, [])

  useEffect(() => {
    const params = projetoFiltro ? `?projetoId=${projetoFiltro}` : ''
    apiGet<AlunaAtrasada[]>(`/pagamentos/atrasados-por-aluna${params}`)
      .then((dados) => {
        setAlunas(dados)
        setErro('')
      })
      .catch(() => setErro('Não foi possível carregar os atrasados. Tente de novo.'))
      .finally(() => setCarregando(false))
  }, [projetoFiltro])

  function trocarProjeto(valor: string) {
    setCarregando(true)
    setSelecionadas(new Set())
    setAviso('')
    setProjetoFiltro(valor)
  }

  const visiveis = useMemo(() => {
    const termo = nomeFiltro.trim().toLowerCase()
    return alunas
      .filter((a) => !termo || a.usuario.nome.toLowerCase().includes(termo))
      .filter((a) => {
        if (!presencaFiltro) return true
        if (presencaFiltro === 'nunca') return a.ultimaPresenca === null
        return diasSemVir(a) >= Number(presencaFiltro)
      })
      .sort((a, b) => diasSemVir(b) - diasSemVir(a) || a.usuario.nome.localeCompare(b.usuario.nome, 'pt-BR'))
  }, [alunas, nomeFiltro, presencaFiltro])

  const totais = useMemo(
    () => ({
      mensalidades: visiveis.reduce((s, a) => s + a.quantidade, 0),
      valor: visiveis.reduce((s, a) => s + a.total, 0),
    }),
    [visiveis]
  )

  const todasVisiveisMarcadas =
    visiveis.length > 0 && visiveis.every((a) => selecionadas.has(a.matriculaId))

  function alternar(id: number) {
    setSelecionadas((atual) => {
      const nova = new Set(atual)
      if (nova.has(id)) nova.delete(id)
      else nova.add(id)
      return nova
    })
  }

  function alternarTodas() {
    setSelecionadas((atual) => {
      const nova = new Set(atual)
      if (todasVisiveisMarcadas) visiveis.forEach((a) => nova.delete(a.matriculaId))
      else visiveis.forEach((a) => nova.add(a.matriculaId))
      return nova
    })
  }

  const alunasConfirmando = confirmando
    ? alunas.filter((a) => confirmando.includes(a.matriculaId))
    : []

  function mensagemConfirmacao() {
    if (alunasConfirmando.length === 0) return ''
    const mensalidades = alunasConfirmando.reduce((s, a) => s + a.quantidade, 0)
    const valor = alunasConfirmando.reduce((s, a) => s + a.total, 0)
    const quem =
      alunasConfirmando.length === 1
        ? alunasConfirmando[0].usuario.nome
        : plural(alunasConfirmando.length, 'aluna', 'alunas')
    return (
      `${quem} ${alunasConfirmando.length === 1 ? 'deixa' : 'deixam'} de ser ativa e sai das chamadas. ` +
      `${plural(mensalidades, 'mensalidade atrasada', 'mensalidades atrasadas')} ` +
      `(${formatarMoeda(valor)}) ${mensalidades === 1 ? 'será cancelada' : 'serão canceladas'} ` +
      `e não ${mensalidades === 1 ? 'será mais cobrada' : 'serão mais cobradas'}.`
    )
  }

  async function inativar() {
    if (!confirmando) return
    setInativando(true)
    setErroInativar(null)
    try {
      const resultado = await apiPost<{ encerradas: number; cobrancasCanceladas: number }>(
        '/matriculas/encerrar-em-lote',
        { matriculaIds: confirmando }
      )
      const ids = new Set(confirmando)
      setAlunas((atual) => atual.filter((a) => !ids.has(a.matriculaId)))
      setSelecionadas((atual) => new Set([...atual].filter((id) => !ids.has(id))))
      setConfirmando(null)
      setAviso(
        `${plural(resultado.encerradas, 'aluna inativada', 'alunas inativadas')} · ` +
          `${plural(resultado.cobrancasCanceladas, 'cobrança cancelada', 'cobranças canceladas')}`
      )
    } catch {
      setErroInativar('Não foi possível inativar. Tente de novo.')
    } finally {
      setInativando(false)
    }
  }

  return (
    <div className={base.pagina}>
      <div className={base.cabecalho}>
        <h1 className={base.titulo}>Atrasados por aluna</h1>
      </div>

      <p className={styles.explicacao}>
        Cada linha é uma aluna ativa com mensalidade vencida. Quem está há mais tempo sem vir
        aparece primeiro. Se ela não frequenta mais, use <strong>Inativar</strong>: a matrícula é
        encerrada e as mensalidades em aberto são canceladas.
      </p>
      <p className={styles.alerta}>
        A última presença vem da chamada feita pelas professoras no sistema. Se a turma não faz
        chamada por aqui, a aluna pode estar vindo e aparecer como “sem vir”. Na dúvida, confirme
        com a professora antes de inativar.
      </p>

      <div className={`${base.card} ${base.cardDestaque}`}>
        <div className={base.filtros}>
          <div className={base.campo}>
            <label htmlFor="nomeFiltro">Buscar por nome</label>
            <input
              type="text"
              id="nomeFiltro"
              placeholder="Nome da aluna..."
              value={nomeFiltro}
              onChange={(e) => setNomeFiltro(e.target.value)}
            />
          </div>

          <div className={base.campo}>
            <label htmlFor="projetoFiltro">Projeto</label>
            <select id="projetoFiltro" value={projetoFiltro} onChange={(e) => trocarProjeto(e.target.value)}>
              <option value="">Todos</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          <div className={base.campo}>
            <label htmlFor="presencaFiltro">Última presença</label>
            <select
              id="presencaFiltro"
              value={presencaFiltro}
              onChange={(e) => setPresencaFiltro(e.target.value as FiltroPresenca)}
            >
              <option value="">Todas</option>
              <option value="30">Sem vir há 30 dias ou mais</option>
              <option value="60">Sem vir há 60 dias ou mais</option>
              <option value="90">Sem vir há 90 dias ou mais</option>
              <option value="nunca">Nunca veio</option>
            </select>
          </div>
        </div>

        {aviso && (
          <p className={styles.aviso} role="status">
            {aviso}
          </p>
        )}

        {carregando && <p className={base.mensagem}>Carregando...</p>}
        {!carregando && erro && <p className={base.erro}>{erro}</p>}

        {!carregando && !erro && visiveis.length === 0 && (
          <p className={base.mensagem}>Nenhuma aluna atrasada neste filtro.</p>
        )}

        {!carregando && !erro && visiveis.length > 0 && (
          <>
            <div className={styles.barra}>
              <label className={styles.marcarTodas}>
                <input type="checkbox" checked={todasVisiveisMarcadas} onChange={alternarTodas} />
                Marcar todas
              </label>
              <span className={styles.totais}>
                {plural(visiveis.length, 'aluna', 'alunas')} ·{' '}
                {plural(totais.mensalidades, 'mensalidade', 'mensalidades')} · {formatarMoeda(totais.valor)}
              </span>
              {selecionadas.size > 0 && (
                <button className={styles.botaoInativarLote} onClick={() => setConfirmando([...selecionadas])}>
                  Inativar {plural(selecionadas.size, 'selecionada', 'selecionadas')}
                </button>
              )}
            </div>

            <ul className={base.lista}>
              {visiveis.map((aluna) => {
                const dias = aluna.ultimaPresenca ? diasDesde(aluna.ultimaPresenca) : null
                const nivel =
                  dias === null || dias >= 60 ? styles.presencaRuim : dias >= 30 ? styles.presencaAtencao : styles.presencaBoa
                return (
                  <li key={aluna.matriculaId} className={`${base.item} ${styles.item}`}>
                    <input
                      type="checkbox"
                      className={styles.check}
                      checked={selecionadas.has(aluna.matriculaId)}
                      onChange={() => alternar(aluna.matriculaId)}
                      aria-label={`Selecionar ${aluna.usuario.nome}`}
                    />
                    <div className={`${base.infoPagamento} ${styles.info}`}>
                      <Link href={`/associados/${aluna.usuario.id}`} className={styles.nome}>
                        {aluna.usuario.nome}
                      </Link>
                      <span className={base.detalhe}>
                        {aluna.turmas.map((t) => `${t.projeto.nome} · ${t.nome}`).join(', ') || 'Sem turma'}
                      </span>
                      <span className={base.vencimentoAtrasado}>
                        {plural(aluna.quantidade, 'mensalidade', 'mensalidades')} · {formatarMoeda(aluna.total)} ·
                        atrasada desde {formatarData(aluna.vencimentoMaisAntigo)}
                      </span>
                      <span className={`${styles.presenca} ${nivel}`}>
                        {aluna.ultimaPresenca
                          ? `Última presença: ${formatarData(aluna.ultimaPresenca)} (${textoDias(dias!)})`
                          : `Nunca veio · matriculada em ${formatarData(aluna.dataInicio)}`}
                      </span>
                    </div>
                    <button className={styles.botaoInativar} onClick={() => setConfirmando([aluna.matriculaId])}>
                      Inativar
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>

      <ConfirmDialog
        aberto={confirmando !== null}
        titulo={confirmando && confirmando.length > 1 ? 'Inativar alunas?' : 'Inativar aluna?'}
        mensagem={mensagemConfirmacao()}
        confirmarLabel="Inativar"
        carregandoLabel="Inativando..."
        carregando={inativando}
        erro={erroInativar}
        onConfirmar={inativar}
        onCancelar={() => {
          setConfirmando(null)
          setErroInativar(null)
        }}
      />
    </div>
  )
}
