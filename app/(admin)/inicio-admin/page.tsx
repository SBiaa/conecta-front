'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getUsuario } from '../../lib/auth'
import { apiGet } from '../../lib/api'
import {
  diaSemanaHoje,
  extrairHora,
  faixaPresenca,
  hojeISO,
  type ResumoFrequencia,
} from '../../lib/frequencia-resumo'
import styles from './inicio-admin.module.css'

// Home da coordenação: o que importa hoje (dinheiro, chamadas, quem precisa
// de atenção) numa tela só, sem precisar rolar.

type Usuario = { nome: string }

type Pagamento = {
  id: number
  valor: string
  status: 'PAGA' | 'PENDENTE' | 'CANCELADA'
}

type PagamentoAtrasado = {
  id: number
  valor: string
  mesReferencia: string
  matricula: { usuario: { nome: string } }
}

type Projeto = {
  id: number
  nome: string
  ativo: boolean
  alunasAtivas: number
}

type Associado = { id: string }

type Turma = {
  id: number
  nome: string
  projetoId: number
  dias: string[]
  horario: string | null
  ativas: number
  projeto: { nome: string } | null
}

type Devedora = { nome: string; total: number; meses: string[] }

const CORES_PROJETO = [
  'var(--accent-hidro)',
  'var(--accent-corpo)',
  'var(--accent-corpo-2)',
  'var(--accent-cinema)',
  'var(--accent-cinema-2)',
]

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function moeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function mesCurto(mesReferencia: string) {
  const [ano, mes] = mesReferencia.split('-')
  return `${MESES_CURTOS[Number(mes) - 1]}/${ano}`
}

function saudacaoDoHorario() {
  const hora = new Date().getHours()
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

const QTD_LISTA_LATERAL = 5

export default function InicioAdminPage() {
  const [usuario] = useState<Usuario | null>(() => (typeof window !== 'undefined' ? getUsuario() : null))
  const [pagamentosMes, setPagamentosMes] = useState<Pagamento[] | null>(null)
  const [atrasados, setAtrasados] = useState<PagamentoAtrasado[] | null>(null)
  const [projetos, setProjetos] = useState<Projeto[] | null>(null)
  const [totalAssociados, setTotalAssociados] = useState<number | null>(null)
  const [turmas, setTurmas] = useState<Turma[] | null>(null)
  const [frequencia, setFrequencia] = useState<ResumoFrequencia | null>(null)

  const hoje = useMemo(() => hojeISO(), [])
  const diaHoje = useMemo(() => diaSemanaHoje(), [])
  const dataExtenso = useMemo(() => {
    const texto = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    return texto.charAt(0).toUpperCase() + texto.slice(1)
  }, [])

  useEffect(() => {
    const mes = hoje.slice(0, 7)
    apiGet<Pagamento[]>(`/pagamentos?mes=${mes}`).then(setPagamentosMes).catch(() => setPagamentosMes([]))
    apiGet<PagamentoAtrasado[]>('/pagamentos/atrasados').then(setAtrasados).catch(() => setAtrasados([]))
    apiGet<Projeto[]>('/projetos').then(setProjetos).catch(() => setProjetos([]))
    apiGet<Associado[]>('/usuarios?papel=ASSOCIADO')
      .then((lista) => setTotalAssociados(lista.length))
      .catch(() => setTotalAssociados(null))
    apiGet<Turma[]>('/turmas').then(setTurmas).catch(() => setTurmas([]))
    apiGet<ResumoFrequencia>(`/turmas/frequencia-resumo?hoje=${hoje}`)
      .then(setFrequencia)
      .catch(() => setFrequencia(null))
  }, [hoje])

  // -- dinheiro --
  const recebido = (pagamentosMes ?? []).filter((p) => p.status === 'PAGA').reduce((s, p) => s + Number(p.valor), 0)
  const pendente = (pagamentosMes ?? [])
    .filter((p) => p.status === 'PENDENTE')
    .reduce((s, p) => s + Number(p.valor), 0)
  const previsto = recebido + pendente
  const percentualRecebido = previsto > 0 ? Math.round((recebido / previsto) * 100) : 0
  const totalAtrasado = (atrasados ?? []).reduce((s, p) => s + Number(p.valor), 0)
  const nomeMes = new Date().toLocaleDateString('pt-BR', { month: 'long' })

  // Uma linha por aluna, somando os meses em atraso — quem deve mais primeiro.
  const devedoras = useMemo(() => {
    const porNome = new Map<string, Devedora>()
    for (const p of atrasados ?? []) {
      const nome = p.matricula.usuario.nome
      const atual = porNome.get(nome) ?? { nome, total: 0, meses: [] }
      atual.total += Number(p.valor)
      atual.meses.push(p.mesReferencia)
      porNome.set(nome, atual)
    }
    return Array.from(porNome.values()).sort((a, b) => b.total - a.total)
  }, [atrasados])

  // -- turmas e chamadas --
  const freqPorTurma = useMemo(
    () => new Map((frequencia?.turmas ?? []).map((t) => [t.turmaId, t])),
    [frequencia]
  )

  const corPorProjeto = useMemo(() => {
    const mapa = new Map<number, string>()
    ;(projetos ?? []).forEach((p, i) => mapa.set(p.id, CORES_PROJETO[i % CORES_PROJETO.length]))
    return mapa
  }, [projetos])

  const horaAgora = new Date().getHours()
  const aulasHoje = useMemo(
    () =>
      (turmas ?? [])
        .filter((t) => t.dias?.includes(diaHoje))
        .sort((a, b) => (extrairHora(a.horario) ?? 99) - (extrairHora(b.horario) ?? 99)),
    [turmas, diaHoje]
  )
  function statusAula(turma: Turma): 'feita' | 'pendente' | 'depois' {
    if (freqPorTurma.get(turma.id)?.chamadaHoje) return 'feita'
    const hora = extrairHora(turma.horario)
    if (hora !== null && hora > horaAgora) return 'depois'
    return 'pendente'
  }
  const chamadasFeitas = aulasHoje.filter((t) => statusAula(t) === 'feita').length
  const chamadasPendentes = aulasHoje.filter((t) => statusAula(t) === 'pendente').length

  // -- projetos --
  const cartoesProjetos = useMemo(() => {
    return (projetos ?? [])
      .filter((p) => p.ativo !== false)
      .map((p) => {
        const turmasDoProjeto = (turmas ?? []).filter((t) => t.projetoId === p.id)
        const presencas = turmasDoProjeto
          .map((t) => freqPorTurma.get(t.id)?.percentualPresenca)
          .filter((v): v is number => typeof v === 'number')
        const presenca = presencas.length
          ? Math.round(presencas.reduce((s, v) => s + v, 0) / presencas.length)
          : null
        return { ...p, qtdTurmas: turmasDoProjeto.length, presenca }
      })
      .sort((a, b) => b.alunasAtivas - a.alunasAtivas)
  }, [projetos, turmas, freqPorTurma])

  const totalAlunasAtivas = (projetos ?? []).reduce((s, p) => s + p.alunasAtivas, 0)
  const projetosAtivos = (projetos ?? []).filter((p) => p.ativo !== false).length

  return (
    <div className={styles.pagina}>
      <header className={styles.topo}>
        <div>
          <h1 className={styles.saudacao}>
            {saudacaoDoHorario()}
            {usuario?.nome ? `, ${usuario.nome.split(' ')[0]}` : ''}
          </h1>
          <span className={styles.data}>{dataExtenso}</span>
        </div>
        <div className={styles.acoes}>
          <Link href="/matriculas/nova" className={styles.botaoPrimario}>
            <Plus size={18} aria-hidden="true" /> Nova matrícula
          </Link>
          <Link href="/associados/novo" className={styles.botaoSecundario}>
            Novo associado
          </Link>
        </div>
      </header>

      <div className={styles.numeros}>
        <Link href="/financeiro" className={styles.numero}>
          <span className={styles.numeroRotulo}>Recebido em {nomeMes}</span>
          <span className={`${styles.numeroValor} ${styles.textoOk}`}>
            {pagamentosMes === null ? '…' : moeda(recebido)}
          </span>
          {pagamentosMes !== null && previsto > 0 && (
            <>
              <span className={styles.barra} aria-hidden="true">
                <span style={{ width: `${percentualRecebido}%` }} />
              </span>
              <span className={styles.numeroDetalhe}>
                {percentualRecebido}% do previsto · faltam {moeda(pendente)}
              </span>
            </>
          )}
        </Link>

        <Link
          href="/financeiro/atrasados"
          className={`${styles.numero} ${totalAtrasado > 0 ? styles.numeroAlerta : ''}`}
        >
          <span className={styles.numeroRotulo}>Atrasadas</span>
          <span className={styles.numeroValor}>{atrasados === null ? '…' : moeda(totalAtrasado)}</span>
          <span className={styles.numeroDetalhe}>
            {atrasados === null
              ? ''
              : atrasados.length === 0
              ? 'Nenhuma mensalidade atrasada'
              : `${atrasados.length} ${atrasados.length === 1 ? 'mensalidade' : 'mensalidades'} · ver quem →`}
          </span>
        </Link>

        <Link href="/associados" className={styles.numero}>
          <span className={styles.numeroRotulo}>Alunas ativas</span>
          <span className={styles.numeroValor}>{projetos === null ? '…' : totalAlunasAtivas}</span>
          <span className={styles.numeroDetalhe}>
            em {projetosAtivos} {projetosAtivos === 1 ? 'projeto' : 'projetos'}
            {totalAssociados !== null && ` · ${totalAssociados} associados`}
          </span>
        </Link>

        <Link href="/frequencia" className={styles.numero}>
          <span className={styles.numeroRotulo}>Chamadas de hoje</span>
          <span className={styles.numeroValor}>
            {turmas === null ? '…' : aulasHoje.length === 0 ? '—' : `${chamadasFeitas} de ${aulasHoje.length}`}
          </span>
          <span className={`${styles.numeroDetalhe} ${chamadasPendentes > 0 ? styles.textoAviso : ''}`}>
            {turmas === null
              ? ''
              : aulasHoje.length === 0
              ? 'Nenhuma aula hoje'
              : chamadasPendentes > 0
              ? `${chamadasPendentes} ${chamadasPendentes === 1 ? 'pendente' : 'pendentes'}`
              : 'Nada pendente até agora'}
          </span>
        </Link>
      </div>

      <div className={styles.corpo}>
        <div className={styles.colunaPrincipal}>
          <section className={`${styles.cartao} ${styles.semPadding}`} aria-label="Aulas de hoje">
            <div className={styles.topoCartao}>
              <h2 className={styles.tituloCartao}>Aulas de hoje</h2>
              <Link href="/frequencia" className={styles.linkAcao}>
                Ver frequência →
              </Link>
            </div>
            {turmas === null && <p className={styles.mensagem}>Carregando...</p>}
            {turmas !== null && aulasHoje.length === 0 && (
              <p className={styles.mensagem}>Nenhuma turma tem aula hoje.</p>
            )}
            {aulasHoje.length > 0 && (
              <ul className={styles.listaAulas}>
                {aulasHoje.map((turma) => {
                  const status = statusAula(turma)
                  return (
                    <li key={turma.id} className={styles.aula}>
                      <span className={styles.aulaHora}>{turma.horario || '—'}</span>
                      <span
                        className={styles.aulaCor}
                        style={{ backgroundColor: corPorProjeto.get(turma.projetoId) }}
                        aria-hidden="true"
                      />
                      <div className={styles.aulaTexto}>
                        <span className={styles.forte}>{turma.nome}</span>
                        <span className={styles.suave}>
                          {turma.projeto?.nome} · {turma.ativas} alunas
                        </span>
                      </div>
                      <span className={`${styles.etiqueta} ${styles[`etiqueta_${status}`]}`}>
                        {status === 'feita' ? 'Chamada feita' : status === 'pendente' ? 'Pendente' : 'Mais tarde'}
                      </span>
                      <Link
                        href={`/frequencia/${turma.id}`}
                        className={status === 'pendente' ? styles.botaoChamada : styles.botaoChamadaLeve}
                      >
                        {status === 'feita' ? 'Ver chamada' : 'Fazer chamada'}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section aria-label="Projetos" className={styles.secaoProjetos}>
            <h2 className={styles.tituloCartao}>Projetos</h2>
            {projetos === null && <p className={styles.mensagem}>Carregando...</p>}
            {projetos !== null && cartoesProjetos.length === 0 && (
              <p className={styles.mensagem}>Nenhum projeto cadastrado</p>
            )}
            <div className={styles.gradeProjetos}>
              {cartoesProjetos.map((p) => (
                <Link
                  key={p.id}
                  href={`/projetos/${p.id}/turmas`}
                  className={styles.projeto}
                  style={{ borderTopColor: corPorProjeto.get(p.id) }}
                >
                  <span className={styles.forte}>{p.nome}</span>
                  <div className={styles.projetoNumeros}>
                    <span className={styles.projetoAlunas}>{p.alunasAtivas}</span>
                    <span className={styles.suave}>
                      {p.qtdTurmas} {p.qtdTurmas === 1 ? 'turma' : 'turmas'}
                    </span>
                  </div>
                  <span className={styles.suave}>
                    {p.alunasAtivas === 1 ? 'aluna ativa' : 'alunas ativas'} · presença{' '}
                    <strong className={styles[`faixa_${faixaPresenca(p.presenca)}`]}>
                      {p.presenca === null ? '—' : `${p.presenca}%`}
                    </strong>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <aside className={styles.colunaLateral}>
          <section className={styles.cartao} aria-label="Mensalidades atrasadas">
            <div className={styles.topoCartaoSimples}>
              <h2 className={styles.tituloCartao}>Mensalidades atrasadas</h2>
              {devedoras.length > 0 && (
                <Link href="/financeiro/atrasados" className={styles.linkAcao}>
                  Ver todas ({devedoras.length})
                </Link>
              )}
            </div>
            {atrasados === null && <p className={styles.mensagemLateral}>Carregando...</p>}
            {atrasados !== null && devedoras.length === 0 && (
              <p className={styles.mensagemLateral}>Ninguém com mensalidade atrasada.</p>
            )}
            {devedoras.length > 0 && (
              <ul className={styles.listaLateral}>
                {devedoras.slice(0, QTD_LISTA_LATERAL).map((d) => {
                  const meses = [...d.meses].sort()
                  return (
                    <li key={d.nome}>
                      <Link href="/financeiro/atrasados" className={styles.itemLateral}>
                        <div className={styles.aulaTexto}>
                          <span className={styles.forte}>{d.nome}</span>
                          <span className={styles.suave}>
                            {meses.length === 1
                              ? `1 mês · ${mesCurto(meses[0])}`
                              : `${meses.length} meses · desde ${mesCurto(meses[0])}`}
                          </span>
                        </div>
                        <span className={styles.valorDevido}>{moeda(d.total)}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className={styles.cartao} aria-label="Faltando muito">
            <div className={styles.topoCartaoSimples}>
              <h2 className={styles.tituloCartao}>Faltando muito</h2>
              <Link href="/frequencia" className={styles.linkAcao}>
                Ver frequência
              </Link>
            </div>
            <span className={styles.suave}>Presença abaixo de 75% nos últimos 30 dias</span>
            {!frequencia && <p className={styles.mensagemLateral}>—</p>}
            {frequencia && frequencia.atencao.length === 0 && (
              <p className={styles.mensagemLateral}>Nenhuma aluna faltando muito.</p>
            )}
            {frequencia && frequencia.atencao.length > 0 && (
              <ul className={styles.listaLateral}>
                {frequencia.atencao.slice(0, QTD_LISTA_LATERAL).map((a) => (
                  <li key={`${a.usuarioId}-${a.turmaId}`}>
                    <Link href={`/associados/${a.usuarioId}`} className={styles.itemLateral}>
                      <div className={styles.aulaTexto}>
                        <span className={styles.forte}>{a.nome}</span>
                        <span className={styles.suave}>
                          {a.turmaNome} · {a.faltas} {a.faltas === 1 ? 'falta' : 'faltas'} em {a.total}
                        </span>
                      </div>
                      <span className={styles.pilulaCritica}>{a.percentualPresenca}%</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
