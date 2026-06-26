'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { CirclePlus } from 'lucide-react'
import { apiGet, apiPatch } from '../../lib/api'
import styles from './turma.module.css'

type FormaPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO'

type AlunaPagamento = {
  id: string
  nome: string
  pagamento: {
    id: string
    valor: number
    status: 'PAGA' | 'PENDENTE'
    vencimento: string
    dataPagamento: string | null
  } | null
}

const NOMES_MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

function formatarMes(mes: string) {
  const [ano, mesNumero] = mes.split('-')
  return `${NOMES_MESES[Number(mesNumero) - 1]} ${ano}`
}

function dataHojeISO() {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export default function TurmaDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const [meses, setMeses] = useState<string[]>([])
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null)
  const [carregandoMeses, setCarregandoMeses] = useState(true)

  const [alunas, setAlunas] = useState<AlunaPagamento[]>([])
  const [carregando, setCarregando] = useState(true)

  const [alunaSelecionada, setAlunaSelecionada] = useState<AlunaPagamento | null>(null)
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('DINHEIRO')
  const [dataPagamento, setDataPagamento] = useState('')
  const [valor, setValor] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erroModal, setErroModal] = useState('')

  function buscarDados(mes: string) {
    setCarregando(true)
    return apiGet<AlunaPagamento[]>(`/turmas/${id}/pagamentos?mes=${mes}`)
      .then(setAlunas)
      .finally(() => setCarregando(false))
  }

  useEffect(() => {
    setCarregandoMeses(true)
    apiGet<string[]>(`/turmas/${id}/meses`)
      .then((lista) => {
        setMeses(lista)
        setMesSelecionado(lista[0] ?? null)
      })
      .finally(() => setCarregandoMeses(false))
  }, [id])

  useEffect(() => {
    if (mesSelecionado) {
      buscarDados(mesSelecionado)
    }
  }, [id, mesSelecionado])

  function abrirModal(aluna: AlunaPagamento) {
    setAlunaSelecionada(aluna)
    setFormaPagamento('DINHEIRO')
    setDataPagamento(dataHojeISO())
    setValor(aluna.pagamento ? String(aluna.pagamento.valor) : '')
    setErroModal('')
  }

  function fecharModal() {
    setAlunaSelecionada(null)
  }

  async function confirmarPagamento() {
    if (!alunaSelecionada?.pagamento || !mesSelecionado) return

    setEnviando(true)
    setErroModal('')
    try {
      await apiPatch(`/pagamentos/${alunaSelecionada.pagamento.id}/pagar`, {
        dataPagamento,
        formaPagamento,
        valor: Number(valor),
      })
      await buscarDados(mesSelecionado)
      fecharModal()
    } catch {
      setErroModal('Não foi possível registrar o pagamento')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className={styles.pagina}>
      <h1 className={styles.titulo}>Pagamentos da turma</h1>

      {carregandoMeses && <p className={styles.mensagem}>Carregando...</p>}

      {!carregandoMeses && meses.length === 0 && (
        <p className={styles.mensagem}>Nenhum pagamento lançado nesta turma ainda</p>
      )}

      {!carregandoMeses && meses.length > 0 && (
        <div className={styles.abas}>
          {meses.map((mes) => (
            <button
              key={mes}
              className={`${styles.aba} ${mes === mesSelecionado ? styles.abaSelecionada : ''}`}
              onClick={() => setMesSelecionado(mes)}
            >
              {formatarMes(mes)}
            </button>
          ))}
        </div>
      )}

      {!carregandoMeses && mesSelecionado && carregando && (
        <p className={styles.mensagem}>Carregando...</p>
      )}

      {!carregandoMeses && mesSelecionado && !carregando && alunas.length === 0 && (
        <p className={styles.mensagem}>Nenhuma aluna nesta turma</p>
      )}

      {!carregandoMeses && mesSelecionado && !carregando && alunas.length > 0 && (
        <ul className={styles.lista}>
          {alunas.map((aluna) => (
            <li key={aluna.id} className={styles.item}>
              <Link href={`/alunas/${aluna.id}`} className={styles.nome}>
                {aluna.nome}
              </Link>
              <div className={styles.acoesItem}>
                {!aluna.pagamento && (
                  <span className={`${styles.status} ${styles.statusSemLancamento}`}>
                    Sem lançamento
                  </span>
                )}
                {aluna.pagamento?.status === 'PAGA' && (
                  <span className={`${styles.status} ${styles.statusPaga}`}>Paga</span>
                )}
                {aluna.pagamento?.status === 'PENDENTE' && (
                  <>
                    <span className={`${styles.status} ${styles.statusPendente}`}>Pendente</span>
                    <button
                      className={styles.botaoRegistrar}
                      onClick={() => abrirModal(aluna)}
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

      {alunaSelecionada && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitulo}>Registrar pagamento — {alunaSelecionada.nome}</h2>

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
    </div>
  )
}
