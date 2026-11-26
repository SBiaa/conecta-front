'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react'
import { apiGet } from '../../lib/api'
import { mensagemDeErro } from '../../lib/admin-pagamentos'
import styles from './associados.module.css'

// Lista de associados da coordenação: tabela com turma e situação das
// mensalidades, filtros numa linha e, no computador, um painel ao lado com o
// resumo de quem foi clicada (sem sair da lista).

type Associado = {
  id: string
  nome: string
  cpf: string | null
  telefone: string | null
  status: 'ATIVO' | 'INATIVO'
  responsavel: { id: string; nome: string } | null
  dataNascimento: string | null
  turmas: { id: number; nome: string; projeto: { id: number; nome: string } }[]
  financeiro: {
    atrasado: number
    mesesAtrasados: number
    aVencer: number
    proximoVencimento: string | null
    abonada: boolean
    ultimoPagamento: { data: string; forma: string | null } | null
  }
}

type Coluna = 'nome' | 'turma' | 'telefone' | 'mensalidade' | 'status'
type FiltroStatus = '' | 'ATIVO' | 'INATIVO'

const POR_PAGINA = 25

const COLUNAS: { chave: Coluna; rotulo: string }[] = [
  { chave: 'nome', rotulo: 'Nome' },
  { chave: 'turma', rotulo: 'Projeto e turma' },
  { chave: 'telefone', rotulo: 'Telefone' },
  { chave: 'mensalidade', rotulo: 'Mensalidade' },
  { chave: 'status', rotulo: 'Situação' },
]

const FORMAS: Record<string, string> = { PIX: 'Pix', DINHEIRO: 'Dinheiro', CARTAO: 'Cartão', ABONADO: 'Abonado' }

function moeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function diaMes(data: string) {
  const [, mes, dia] = data.slice(0, 10).split('-')
  return `${dia}/${mes}`
}

function formatarTelefone(telefone: string | null): string {
  if (!telefone) return '—'
  const d = telefone.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return telefone
}

function linkWhatsapp(telefone: string | null): string | null {
  const d = (telefone ?? '').replace(/\D/g, '')
  if (d.length < 10) return null
  return `https://wa.me/${d.startsWith('55') && d.length > 11 ? d : `55${d}`}`
}

function idade(dataNascimento: string | null): number | null {
  if (!dataNascimento) return null
  const [ano, mes, dia] = dataNascimento.slice(0, 10).split('-').map(Number)
  const hoje = new Date()
  let anos = hoje.getFullYear() - ano
  if (hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia)) anos--
  return anos >= 0 && anos < 130 ? anos : null
}

function iniciais(nome: string) {
  return nome
    .split(' ')
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

function descreverTurmas(a: Associado) {
  if (a.turmas.length === 0) return 'Sem matrícula ativa'
  return a.turmas.map((t) => `${t.projeto.nome} · ${t.nome}`).join(', ')
}

// Situação da mensalidade, do mais urgente pro mais tranquilo.
function situacaoFinanceira(a: Associado): { texto: string; tipo: 'atrasado' | 'aVencer' | 'emDia' | 'abonada' | 'nada'; peso: number } {
  const f = a.financeiro
  if (f.atrasado > 0) return { texto: `${moeda(f.atrasado)} atrasado`, tipo: 'atrasado', peso: 0 }
  if (f.aVencer > 0) return { texto: `${moeda(f.aVencer)} a vencer`, tipo: 'aVencer', peso: 1 }
  if (f.abonada) return { texto: 'Abonada', tipo: 'abonada', peso: 3 }
  if (f.ultimoPagamento) return { texto: 'Em dia', tipo: 'emDia', peso: 2 }
  return { texto: '—', tipo: 'nada', peso: 4 }
}

function valorDaColuna(a: Associado, coluna: Coluna): string {
  if (coluna === 'turma') return descreverTurmas(a)
  if (coluna === 'mensalidade') return String(situacaoFinanceira(a).peso)
  if (coluna === 'status') return a.status
  if (coluna === 'telefone') return a.telefone ?? ''
  return a.nome
}

export default function AssociadosPage() {
  const router = useRouter()
  const [busca, setBusca] = useState('')
  const [associados, setAssociados] = useState<Associado[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [tentativa, setTentativa] = useState(0)

  const [statusFiltro, setStatusFiltro] = useState<FiltroStatus>('ATIVO')
  const [projetoFiltro, setProjetoFiltro] = useState('')
  const [soAtrasadas, setSoAtrasadas] = useState(false)
  const [ordem, setOrdem] = useState<{ coluna: Coluna; crescente: boolean }>({ coluna: 'nome', crescente: true })
  const [pagina, setPagina] = useState(1)
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setCarregando(true)
      setErro('')
      const termo = busca.trim()
      const query = `?papel=ASSOCIADO&detalhes=1${termo ? `&busca=${encodeURIComponent(termo)}` : ''}`
      apiGet<Associado[]>(`/usuarios${query}`)
        // Se a API ainda não tiver os detalhes, a lista funciona sem turma/mensalidade.
        .then((lista) =>
          setAssociados(
            lista.map((a) => ({
              ...a,
              turmas: a.turmas ?? [],
              financeiro: a.financeiro ?? {
                atrasado: 0,
                mesesAtrasados: 0,
                aVencer: 0,
                proximoVencimento: null,
                abonada: false,
                ultimoPagamento: null,
              },
            }))
          )
        )
        .catch((e) => {
          setAssociados([])
          setErro(mensagemDeErro(e, 'Não foi possível carregar os associados.'))
        })
        .finally(() => setCarregando(false))
    }, 400)
    return () => clearTimeout(timeout)
  }, [busca, tentativa])

  const projetos = useMemo(() => {
    const mapa = new Map<number, string>()
    associados.forEach((a) => a.turmas.forEach((t) => mapa.set(t.projeto.id, t.projeto.nome)))
    return Array.from(mapa.entries()).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))
  }, [associados])

  const totalAtivos = associados.filter((a) => a.status === 'ATIVO').length

  const semFiltroAtraso = useMemo(
    () =>
      associados.filter(
        (a) =>
          (!statusFiltro || a.status === statusFiltro) &&
          (!projetoFiltro || a.turmas.some((t) => String(t.projeto.id) === projetoFiltro))
      ),
    [associados, statusFiltro, projetoFiltro]
  )
  const qtdAtrasadas = semFiltroAtraso.filter((a) => a.financeiro?.atrasado > 0).length

  const visiveis = useMemo(() => {
    const filtrados = soAtrasadas ? semFiltroAtraso.filter((a) => a.financeiro?.atrasado > 0) : semFiltroAtraso
    const fator = ordem.crescente ? 1 : -1
    return [...filtrados].sort(
      (a, b) =>
        fator *
          valorDaColuna(a, ordem.coluna).localeCompare(valorDaColuna(b, ordem.coluna), 'pt-BR', {
            numeric: true,
            sensitivity: 'base',
          }) || a.nome.localeCompare(b.nome, 'pt-BR')
    )
  }, [semFiltroAtraso, soAtrasadas, ordem])

  const totalPaginas = Math.max(1, Math.ceil(visiveis.length / POR_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const inicio = (paginaAtual - 1) * POR_PAGINA
  const daPagina = visiveis.slice(inicio, inicio + POR_PAGINA)

  const selecionada = visiveis.find((a) => a.id === selecionadaId) ?? daPagina[0] ?? null

  function ordenarPor(coluna: Coluna) {
    setOrdem((atual) => ({ coluna, crescente: atual.coluna === coluna ? !atual.crescente : true }))
    setPagina(1)
  }

  // No computador a linha abre o resumo ao lado; no celular vai direto pro perfil.
  function clicarLinha(a: Associado) {
    if (window.matchMedia('(max-width: 1279px)').matches) {
      router.push(`/associados/${a.id}`)
      return
    }
    setSelecionadaId(a.id)
  }

  function mudarFiltro(acao: () => void) {
    acao()
    setPagina(1)
  }

  return (
    <div className={styles.pagina}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.titulo}>Associados</h1>
          {!carregando && !erro && !busca.trim() && (
            <span className={styles.subtitulo}>
              {associados.length} cadastrados · {totalAtivos} ativos
            </span>
          )}
        </div>
        <Link href="/associados/novo" className={styles.botaoNovo}>
          <Plus size={18} aria-hidden="true" /> Novo associado
        </Link>
      </header>

      <div className={styles.filtros}>
        <label className={styles.busca}>
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar por nome, CPF ou telefone"
            aria-label="Buscar associado"
            value={busca}
            onChange={(e) => mudarFiltro(() => setBusca(e.target.value))}
          />
        </label>

        <div className={styles.grupo} role="group" aria-label="Situação">
          {(
            [
              ['', 'Todos'],
              ['ATIVO', 'Ativos'],
              ['INATIVO', 'Inativos'],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              aria-pressed={statusFiltro === valor}
              className={statusFiltro === valor ? styles.grupoAtivo : ''}
              onClick={() => mudarFiltro(() => setStatusFiltro(valor))}
            >
              {rotulo}
            </button>
          ))}
        </div>

        <select
          aria-label="Projeto"
          className={styles.select}
          value={projetoFiltro}
          onChange={(e) => mudarFiltro(() => setProjetoFiltro(e.target.value))}
        >
          <option value="">Todos os projetos</option>
          {projetos.map(([pid, nome]) => (
            <option key={pid} value={pid}>
              {nome}
            </option>
          ))}
        </select>

        <button
          type="button"
          aria-pressed={soAtrasadas}
          className={`${styles.botaoAtrasadas} ${soAtrasadas ? styles.botaoAtrasadasAtivo : ''}`}
          onClick={() => mudarFiltro(() => setSoAtrasadas((v) => !v))}
        >
          <span className={styles.bolinha} aria-hidden="true" />
          Com mensalidade atrasada{!carregando && ` (${qtdAtrasadas})`}
        </button>
      </div>

      {carregando && <p className={styles.mensagem}>Carregando...</p>}

      {!carregando && erro && (
        <div className={styles.estadoErro} role="alert">
          <p>{erro}</p>
          <button type="button" className={styles.botaoTentar} onClick={() => setTentativa((n) => n + 1)}>
            Tentar de novo
          </button>
        </div>
      )}

      {!carregando && !erro && visiveis.length === 0 && <p className={styles.mensagem}>Nenhum associado encontrado</p>}

      {!carregando && !erro && visiveis.length > 0 && (
        <div className={styles.corpo}>
          <section className={styles.cartaoTabela} aria-label="Lista de associados">
            <div className={styles.tabelaWrap}>
              <table className={styles.tabela}>
                <thead>
                  <tr>
                    {COLUNAS.map(({ chave, rotulo }) => {
                      const ativa = ordem.coluna === chave
                      return (
                        <th
                          key={chave}
                          scope="col"
                          aria-sort={ativa ? (ordem.crescente ? 'ascending' : 'descending') : 'none'}
                        >
                          <button type="button" className={styles.botaoOrdem} onClick={() => ordenarPor(chave)}>
                            {rotulo}
                            {ativa &&
                              (ordem.crescente ? (
                                <ArrowUp size={13} aria-hidden="true" />
                              ) : (
                                <ArrowDown size={13} aria-hidden="true" />
                              ))}
                          </button>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {daPagina.map((a) => {
                    const fin = situacaoFinanceira(a)
                    const ativa = selecionada?.id === a.id
                    return (
                      <tr
                        key={a.id}
                        className={`${styles.linha} ${ativa ? styles.linhaSelecionada : ''}`}
                        onClick={() => clicarLinha(a)}
                      >
                        <td>
                          <div className={styles.celulaNome}>
                            <span className={styles.avatar} aria-hidden="true">
                              {iniciais(a.nome)}
                            </span>
                            <div className={styles.nomeTexto}>
                              <Link
                                href={`/associados/${a.id}`}
                                className={styles.nomeLink}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {a.nome}
                              </Link>
                              {a.responsavel && (
                                <span className={styles.detalhe}>Dependente de {a.responsavel.nome}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          {a.turmas.length === 0 ? (
                            <span className={styles.suave}>Sem matrícula ativa</span>
                          ) : (
                            a.turmas.map((t) => (
                              <div key={t.id} className={styles.turmaCelula}>
                                <span className={styles.turmaNome}>{t.nome}</span>
                                <span className={styles.detalhe}>{t.projeto.nome}</span>
                              </div>
                            ))
                          )}
                        </td>
                        <td className={styles.semQuebra}>{formatarTelefone(a.telefone)}</td>
                        <td>
                          <span className={`${styles.fin} ${styles[`fin_${fin.tipo}`]}`}>{fin.texto}</span>
                        </td>
                        <td>
                          <span className={`${styles.status} ${a.status === 'ATIVO' ? styles.statusAtivo : styles.statusInativo}`}>
                            {a.status === 'ATIVO' ? 'Ativa' : 'Inativa'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className={styles.rodapeTabela}>
              <span>
                Mostrando {inicio + 1}–{Math.min(inicio + POR_PAGINA, visiveis.length)} de {visiveis.length}
              </span>
              {totalPaginas > 1 && (
                <nav className={styles.paginacao} aria-label="Paginação">
                  <button
                    type="button"
                    className={styles.botaoPagina}
                    onClick={() => setPagina(paginaAtual - 1)}
                    disabled={paginaAtual === 1}
                  >
                    <ChevronLeft size={16} aria-hidden="true" /> Anterior
                  </button>
                  <span className={styles.paginaTexto}>
                    {paginaAtual} de {totalPaginas}
                  </span>
                  <button
                    type="button"
                    className={styles.botaoPagina}
                    onClick={() => setPagina(paginaAtual + 1)}
                    disabled={paginaAtual === totalPaginas}
                  >
                    Próxima <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </nav>
              )}
            </div>
          </section>

          {selecionada && <PainelResumo associado={selecionada} />}
        </div>
      )}
    </div>
  )
}

function PainelResumo({ associado: a }: { associado: Associado }) {
  const fin = situacaoFinanceira(a)
  const anos = idade(a.dataNascimento)
  const whatsapp = linkWhatsapp(a.telefone)
  const f = a.financeiro
  const detalheFin =
    fin.tipo === 'atrasado'
      ? `${moeda(f.atrasado)} atrasado · ${f.mesesAtrasados} ${f.mesesAtrasados === 1 ? 'mês' : 'meses'}${
          f.aVencer > 0 ? ` · mais ${moeda(f.aVencer)} a vencer` : ''
        }`
      : fin.tipo === 'aVencer'
      ? `${moeda(f.aVencer)} a vencer${f.proximoVencimento ? ` em ${diaMes(f.proximoVencimento)}` : ''}`
      : fin.tipo === 'abonada'
      ? 'Abonada (isenta)'
      : fin.tipo === 'emDia'
      ? 'Em dia'
      : 'Sem cobranças'

  return (
    <aside className={styles.painel} aria-label={`Resumo de ${a.nome}`}>
      <div className={styles.painelTopo}>
        <span className={styles.painelAvatar} aria-hidden="true">
          {iniciais(a.nome)}
        </span>
        <div className={styles.painelNome}>
          <h2>{a.nome}</h2>
          <span>
            <strong className={a.status === 'ATIVO' ? styles.textoAtivo : styles.suave}>
              {a.status === 'ATIVO' ? 'Ativa' : 'Inativa'}
            </strong>
            {anos !== null && ` · ${anos} anos`}
          </span>
        </div>
      </div>

      <div className={styles.painelCorpo}>
        <dl className={styles.dados}>
          <div>
            <dt>Telefone</dt>
            <dd>{formatarTelefone(a.telefone)}</dd>
          </div>
          <div>
            <dt>CPF</dt>
            <dd>{a.cpf || '—'}</dd>
          </div>
          <div className={styles.dadoLargo}>
            <dt>{a.turmas.length > 1 ? 'Turmas' : 'Turma'}</dt>
            <dd>{descreverTurmas(a)}</dd>
          </div>
          {a.responsavel && (
            <div className={styles.dadoLargo}>
              <dt>Responsável</dt>
              <dd>
                <Link href={`/associados/${a.responsavel.id}`}>{a.responsavel.nome}</Link>
              </dd>
            </div>
          )}
        </dl>

        <div className={`${styles.caixaFin} ${styles[`caixa_${fin.tipo}`]}`}>
          <span className={styles.caixaRotulo}>Mensalidades</span>
          <span className={`${styles.caixaValor} ${styles[`fin_${fin.tipo}`]}`}>{detalheFin}</span>
          <span className={styles.suave}>
            Último pagamento:{' '}
            {f.ultimoPagamento
              ? `${diaMes(f.ultimoPagamento.data)}${f.ultimoPagamento.forma ? ` · ${FORMAS[f.ultimoPagamento.forma] ?? f.ultimoPagamento.forma}` : ''}`
              : '—'}
          </span>
        </div>

        <div className={styles.painelAcoes}>
          <Link href={`/associados/${a.id}`} className={styles.botaoPerfil}>
            Abrir perfil completo
          </Link>
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={styles.botaoWhatsapp}>
              WhatsApp
            </a>
          )}
        </div>
      </div>
    </aside>
  )
}
