'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CirclePlus, Pencil } from 'lucide-react'
import { apiGet, apiPatch } from '../../lib/api'
import styles from './perfil.module.css'

const editarAlunaSchema = z.object({
  nome: z.string().min(1, 'Informe o nome'),
  telefone: z.string().optional(),
  turmaId: z.coerce.number({ message: 'Escolha uma turma' }),
})

type EditarAlunaFormInput = z.input<typeof editarAlunaSchema>
type EditarAlunaFormOutput = z.output<typeof editarAlunaSchema>

type Turma = {
  id: string
  nome: string
}

type FormaPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO'

type Pagamento = {
  id: string
  valor: number
  mesReferencia: string
  vencimento: string
  status: 'PAGA' | 'PENDENTE'
  dataPagamento: string | null
  formaPagamento: FormaPagamento | null
}

type AlunaPerfil = {
  id: string
  nome: string
  telefone: string | null
  ativa: boolean
  turma: {
    nome: string
  }
  pagamentos: Pagamento[]
}

function dataHojeISO() {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export default function PerfilAlunaPage() {
  const { id } = useParams<{ id: string }>()
  const [aluna, setAluna] = useState<AlunaPerfil | null>(null)
  const [carregando, setCarregando] = useState(true)

  const [pagamentoSelecionado, setPagamentoSelecionado] = useState<Pagamento | null>(null)
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('DINHEIRO')
  const [dataPagamento, setDataPagamento] = useState('')
  const [valor, setValor] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erroModal, setErroModal] = useState('')

  const [turmas, setTurmas] = useState<Turma[]>([])
  const [modalEditarAberto, setModalEditarAberto] = useState(false)
  const [erroEditar, setErroEditar] = useState('')
  const [atualizandoSituacao, setAtualizandoSituacao] = useState(false)
  const [erroSituacao, setErroSituacao] = useState('')

  const {
    register: registerEditar,
    handleSubmit: handleSubmitEditar,
    reset: resetEditar,
    formState: { errors: errosEditar, isSubmitting: enviandoEdicao },
  } = useForm<EditarAlunaFormInput, unknown, EditarAlunaFormOutput>({
    resolver: zodResolver(editarAlunaSchema),
  })

  useEffect(() => {
    apiGet<Turma[]>('/turmas').then(setTurmas)
  }, [])

  function buscarDados() {
    setCarregando(true)
    return apiGet<AlunaPerfil>(`/alunas/${id}`)
      .then(setAluna)
      .finally(() => setCarregando(false))
  }

  useEffect(() => {
    buscarDados()
  }, [id])

  function abrirModal(pagamento: Pagamento) {
    setPagamentoSelecionado(pagamento)
    setFormaPagamento('DINHEIRO')
    setDataPagamento(dataHojeISO())
    setValor(String(pagamento.valor))
    setErroModal('')
  }

  function fecharModal() {
    setPagamentoSelecionado(null)
  }

  function abrirModalEditar() {
    if (!aluna) return
    const turmaAtual = turmas.find((turma) => turma.nome === aluna.turma.nome)
    resetEditar({
      nome: aluna.nome,
      telefone: aluna.telefone ?? '',
      turmaId: turmaAtual?.id,
    })
    setErroEditar('')
    setModalEditarAberto(true)
  }

  function fecharModalEditar() {
    setModalEditarAberto(false)
  }

  async function onSubmitEditar(dados: EditarAlunaFormOutput) {
    setErroEditar('')
    try {
      await apiPatch(`/alunas/${id}`, {
        nome: dados.nome,
        telefone: dados.telefone,
        turmaId: dados.turmaId,
      })
      await buscarDados()
      fecharModalEditar()
    } catch {
      setErroEditar('Não foi possível atualizar os dados')
    }
  }

  async function alternarSituacao() {
    if (!aluna) return

    const confirmado = window.confirm(
      aluna.ativa
        ? 'Desativar esta aluna? Ela deixará de aparecer nas listas e não receberá novas mensalidades.'
        : 'Reativar esta aluna?'
    )
    if (!confirmado) return

    setErroSituacao('')
    setAtualizandoSituacao(true)
    try {
      await apiPatch(`/alunas/${id}`, { ativa: !aluna.ativa })
      await buscarDados()
    } catch {
      setErroSituacao('Não foi possível atualizar a situação da aluna')
    } finally {
      setAtualizandoSituacao(false)
    }
  }

  async function confirmarPagamento() {
    if (!pagamentoSelecionado) return

    setEnviando(true)
    setErroModal('')
    try {
      await apiPatch(`/pagamentos/${pagamentoSelecionado.id}/pagar`, {
        dataPagamento,
        formaPagamento,
        valor: Number(valor),
      })
      await buscarDados()
      fecharModal()
    } catch {
      setErroModal('Não foi possível registrar o pagamento')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className={styles.pagina}>
      <h1 className={styles.titulo}>Perfil da aluna</h1>

      {carregando && <p className={styles.mensagem}>Carregando...</p>}

      {!carregando && aluna && (
        <>
          <div className={styles.acoesPerfil}>
            <button className={styles.botaoEditar} onClick={abrirModalEditar}>
              <Pencil size={16} />
              Editar
            </button>
          </div>

          <div className={styles.card}>
            <div className={styles.linha}>
              <span>Nome</span>
              <span>{aluna.nome}</span>
            </div>
            <div className={styles.linha}>
              <span>Telefone</span>
              <span>{aluna.telefone || '-'}</span>
            </div>
            <div className={styles.linha}>
              <span>Turma</span>
              <span>{aluna.turma.nome}</span>
            </div>
            <div className={styles.linha}>
              <span>Situação</span>
              <span>{aluna.ativa ? 'Ativa' : 'Inativa'}</span>
            </div>
          </div>

          <div className={styles.situacao}>
            <h2 className={styles.subtitulo}>Situação</h2>
            <div className={styles.situacaoLinha}>
              <span
                className={`${styles.statusSituacao} ${
                  aluna.ativa ? styles.statusAtiva : styles.statusInativa
                }`}
              >
                {aluna.ativa ? 'Ativa' : 'Inativa'}
              </span>
              <button
                className={aluna.ativa ? styles.botaoDesativar : styles.botaoReativar}
                onClick={alternarSituacao}
                disabled={atualizandoSituacao}
              >
                {aluna.ativa ? 'Desativar aluna' : 'Reativar aluna'}
              </button>
            </div>
            {erroSituacao && <p className={styles.erroModal}>{erroSituacao}</p>}
          </div>

          <h2 className={styles.subtitulo}>Histórico de pagamentos</h2>

          {aluna.pagamentos.length === 0 && (
            <p className={styles.mensagem}>Esta aluna não tem pagamentos ainda</p>
          )}

          {aluna.pagamentos.length > 0 && (
            <ul className={styles.lista}>
              {aluna.pagamentos.map((pagamento) => (
                <li key={pagamento.id} className={styles.item}>
                  <div className={styles.infoPagamento}>
                    <span className={styles.mes}>{pagamento.mesReferencia}</span>
                    <span className={styles.detalhe}>R$ {pagamento.valor}</span>
                    {pagamento.formaPagamento && (
                      <span className={styles.detalhe}>{pagamento.formaPagamento}</span>
                    )}
                    {pagamento.dataPagamento && (
                      <span className={styles.detalhe}>
                        Pago em {new Date(pagamento.dataPagamento).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                  <div className={styles.acoesItem}>
                    {pagamento.status === 'PAGA' && (
                      <span className={`${styles.status} ${styles.statusPaga}`}>Paga</span>
                    )}
                    {pagamento.status === 'PENDENTE' && (
                      <>
                        <span className={`${styles.status} ${styles.statusPendente}`}>
                          Pendente
                        </span>
                        <button
                          className={styles.botaoRegistrar}
                          onClick={() => abrirModal(pagamento)}
                          aria-label="Registrar pagamento"
                          title="Registrar pagamento"
                        >
                          <CirclePlus size={20} />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {pagamentoSelecionado && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitulo}>
              Registrar pagamento — {pagamentoSelecionado.mesReferencia}
            </h2>

            <div className={styles.campo}>
              <label htmlFor="formaPagamento">Forma de pagamento</label>
              <select
                id="formaPagamento"
                value={formaPagamento}
                onChange={(evento) => setFormaPagamento(evento.target.value as FormaPagamento)}
              >
                <option value="DINHEIRO">Dinheiro</option>
                <option value="PIX">Pix</option>
                <option value="CARTAO">Cartão</option>
              </select>
            </div>

            <div className={styles.campo}>
              <label htmlFor="dataPagamento">Data do pagamento</label>
              <input
                type="date"
                id="dataPagamento"
                value={dataPagamento}
                onChange={(evento) => setDataPagamento(evento.target.value)}
              />
            </div>

            <div className={styles.campo}>
              <label htmlFor="valor">Valor</label>
              <input
                type="number"
                id="valor"
                value={valor}
                onChange={(evento) => setValor(evento.target.value)}
              />
            </div>

            {erroModal && <p className={styles.erroModal}>{erroModal}</p>}

            <div className={styles.acoesModal}>
              <button className={styles.botaoCancelar} onClick={fecharModal} disabled={enviando}>
                Cancelar
              </button>
              <button
                className={styles.botaoConfirmar}
                onClick={confirmarPagamento}
                disabled={enviando}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalEditarAberto && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitulo}>Editar dados da aluna</h2>

            <form onSubmit={handleSubmitEditar(onSubmitEditar)}>
              <div className={styles.campo}>
                <label htmlFor="nomeEditar">Nome</label>
                <input type="text" id="nomeEditar" {...registerEditar('nome')} />
                {errosEditar.nome && (
                  <span className={styles.erro}>{errosEditar.nome.message}</span>
                )}
              </div>

              <div className={styles.campo}>
                <label htmlFor="telefoneEditar">Telefone</label>
                <input type="text" id="telefoneEditar" {...registerEditar('telefone')} />
              </div>

              <div className={styles.campo}>
                <label htmlFor="turmaIdEditar">Turma</label>
                <select id="turmaIdEditar" {...registerEditar('turmaId')}>
                  <option value="">Selecione...</option>
                  {turmas.map((turma) => (
                    <option key={turma.id} value={turma.id}>
                      {turma.nome}
                    </option>
                  ))}
                </select>
                {errosEditar.turmaId && (
                  <span className={styles.erro}>{errosEditar.turmaId.message}</span>
                )}
              </div>

              {erroEditar && <p className={styles.erroModal}>{erroEditar}</p>}

              <div className={styles.acoesModal}>
                <button
                  type="button"
                  className={styles.botaoCancelar}
                  onClick={fecharModalEditar}
                  disabled={enviandoEdicao}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.botaoConfirmar}
                  disabled={enviandoEdicao}
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
