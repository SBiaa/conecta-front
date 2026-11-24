'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { apiGet } from '../../lib/api'
import { mensagemDeErro } from '../../lib/admin-pagamentos'
import styles from './associados.module.css'

type Associado = {
  id: string
  nome: string
  cpf: string | null
  telefone: string | null
  status: 'ATIVO' | 'INATIVO'
  responsavel: { id: string; nome: string } | null
}

type Coluna = 'nome' | 'cpf' | 'telefone' | 'status'
type FiltroStatus = '' | 'ATIVO' | 'INATIVO'

const POR_PAGINA = 25

const COLUNAS: { chave: Coluna; rotulo: string }[] = [
  { chave: 'nome', rotulo: 'Nome' },
  { chave: 'cpf', rotulo: 'CPF' },
  { chave: 'telefone', rotulo: 'Telefone' },
  { chave: 'status', rotulo: 'Status' },
]

function valorDaColuna(associado: Associado, coluna: Coluna) {
  if (coluna === 'status') return associado.status
  return (associado[coluna] ?? '').toString()
}

export default function AssociadosPage() {
  const router = useRouter()
  const [busca, setBusca] = useState('')
  const [associados, setAssociados] = useState<Associado[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  // Aumenta a cada "Tentar de novo" pra refazer a busca atual.
  const [tentativa, setTentativa] = useState(0)

  const [statusFiltro, setStatusFiltro] = useState<FiltroStatus>('')
  const [ordem, setOrdem] = useState<{ coluna: Coluna; crescente: boolean }>({
    coluna: 'nome',
    crescente: true,
  })
  const [pagina, setPagina] = useState(1)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setCarregando(true)
      setErro('')

      const query = busca.trim()
        ? `?papel=ASSOCIADO&busca=${encodeURIComponent(busca.trim())}`
        : '?papel=ASSOCIADO'

      apiGet<Associado[]>(`/usuarios${query}`)
        .then(setAssociados)
        .catch((e) => {
          // Erro não é lista vazia: não mostra "nenhum associado" quando a busca falhou.
          setAssociados([])
          setErro(mensagemDeErro(e, 'Não foi possível carregar os associados.'))
        })
        .finally(() => setCarregando(false))
    }, 400)

    return () => clearTimeout(timeout)
  }, [busca, tentativa])

  const visiveis = useMemo(() => {
    const filtrados = statusFiltro ? associados.filter((a) => a.status === statusFiltro) : associados
    const fator = ordem.crescente ? 1 : -1
    return [...filtrados].sort(
      (a, b) =>
        fator *
        valorDaColuna(a, ordem.coluna).localeCompare(valorDaColuna(b, ordem.coluna), 'pt-BR', {
          numeric: true,
          sensitivity: 'base',
        })
    )
  }, [associados, statusFiltro, ordem])

  const totalPaginas = Math.max(1, Math.ceil(visiveis.length / POR_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const inicio = (paginaAtual - 1) * POR_PAGINA
  const daPagina = visiveis.slice(inicio, inicio + POR_PAGINA)

  function ordenarPor(coluna: Coluna) {
    setOrdem((atual) => ({ coluna, crescente: atual.coluna === coluna ? !atual.crescente : true }))
    setPagina(1)
  }

  function detalheNome(associado: Associado) {
    return associado.responsavel ? `Dependente de ${associado.responsavel.nome}` : null
  }

  return (
    <div className={styles.pagina}>
      <div className={styles.header}>
        <h1 className={styles.titulo}>Associados</h1>
        <Link href="/associados/novo" className={styles.botaoNovo}>
          Novo associado
        </Link>
      </div>

      <div className={styles.filtros}>
        <div className={styles.busca}>
          <label htmlFor="busca" className={styles.rotulo}>
            Buscar
          </label>
          <input
            id="busca"
            type="search"
            placeholder="Buscar por nome ou CPF"
            value={busca}
            onChange={(evento) => {
              setBusca(evento.target.value)
              setPagina(1)
            }}
          />
        </div>
        <div className={styles.filtroStatus}>
          <label htmlFor="statusFiltro" className={styles.rotulo}>
            Status
          </label>
          <select
            id="statusFiltro"
            value={statusFiltro}
            onChange={(evento) => {
              setStatusFiltro(evento.target.value as FiltroStatus)
              setPagina(1)
            }}
          >
            <option value="">Todos</option>
            <option value="ATIVO">Ativos</option>
            <option value="INATIVO">Inativos</option>
          </select>
        </div>
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

      {!carregando && !erro && visiveis.length === 0 && (
        <p className={styles.mensagem}>Nenhum associado encontrado</p>
      )}

      {!carregando && !erro && visiveis.length > 0 && (
        <>
          <p className={styles.contagem} aria-live="polite">
            {visiveis.length} {visiveis.length === 1 ? 'associado' : 'associados'}
          </p>

          {/* Computador: tabela */}
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
                              <ArrowUp size={14} aria-hidden="true" />
                            ) : (
                              <ArrowDown size={14} aria-hidden="true" />
                            ))}
                        </button>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {daPagina.map((associado) => (
                  <tr
                    key={associado.id}
                    className={styles.linhaTabela}
                    onClick={() => router.push(`/associados/${associado.id}`)}
                  >
                    <td>
                      <Link
                        href={`/associados/${associado.id}`}
                        className={styles.nomeLink}
                        onClick={(evento) => evento.stopPropagation()}
                      >
                        {associado.nome}
                      </Link>
                      {detalheNome(associado) && <span className={styles.detalhe}>{detalheNome(associado)}</span>}
                    </td>
                    <td>{associado.cpf || '—'}</td>
                    <td>{associado.telefone || '—'}</td>
                    <td>
                      <span
                        className={`${styles.status} ${
                          associado.status === 'ATIVO' ? styles.statusAtivo : styles.statusInativo
                        }`}
                      >
                        {associado.status === 'ATIVO' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Celular: cartões */}
          <ul className={styles.lista}>
            {daPagina.map((associado) => (
              <li key={associado.id} className={styles.item}>
                <Link href={`/associados/${associado.id}`} className={styles.link}>
                  <div className={styles.info}>
                    <span className={styles.nome}>{associado.nome}</span>
                    <span className={styles.detalhe}>
                      {associado.responsavel ? `Dependente de ${associado.responsavel.nome}` : associado.cpf}
                    </span>
                    <span className={styles.detalhe}>{associado.telefone || '—'}</span>
                  </div>
                  <span
                    className={`${styles.status} ${
                      associado.status === 'ATIVO' ? styles.statusAtivo : styles.statusInativo
                    }`}
                  >
                    {associado.status === 'ATIVO' ? 'Ativo' : 'Inativo'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {totalPaginas > 1 && (
            <nav className={styles.paginacao} aria-label="Paginação">
              <button
                type="button"
                className={styles.botaoPagina}
                onClick={() => setPagina(paginaAtual - 1)}
                disabled={paginaAtual === 1}
              >
                <ChevronLeft size={18} aria-hidden="true" /> Anterior
              </button>
              <span className={styles.paginaTexto}>
                Página {paginaAtual} de {totalPaginas}
              </span>
              <button
                type="button"
                className={styles.botaoPagina}
                onClick={() => setPagina(paginaAtual + 1)}
                disabled={paginaAtual === totalPaginas}
              >
                Próxima <ChevronRight size={18} aria-hidden="true" />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
