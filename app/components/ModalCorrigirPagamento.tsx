'use client'

import { useState } from 'react'
import { apiPatch } from '../lib/api'
import {
  LABELS_FORMA_PAGAMENTO,
  mensagemDeErro,
  validarValorPagamento,
  type FormaPagamento,
  type StatusPagamento,
} from '../lib/admin-pagamentos'
import ModalBase from './ModalBase'
import styles from './ModalPagamento.module.css'

export type PagamentoParaCorrigir = {
  id: string
  valor: string
  formaPagamento: FormaPagamento | null
  mesReferencia: string
  vencimento: string
  dataPagamento: string | null
  status: StatusPagamento
  nome?: string
}

type Props = {
  /** null = fechado. */
  pagamento: PagamentoParaCorrigir | null
  onFechar: () => void
  /** Chamado depois de salvar a correção ou desfazer o pagamento. */
  onSalvo: (acao: 'corrigido' | 'desfeito') => void | Promise<unknown>
}

const FORMAS: FormaPagamento[] = ['DINHEIRO', 'PIX', 'CARTAO', 'ABONADO']

/** Corrigir (valor, forma, mês, vencimento, data) ou desfazer um pagamento já lançado. */
export default function ModalCorrigirPagamento({ pagamento, onFechar, onSalvo }: Props) {
  if (!pagamento) return null
  return <Formulario key={pagamento.id} pagamento={pagamento} onFechar={onFechar} onSalvo={onSalvo} />
}

function Formulario({
  pagamento,
  onFechar,
  onSalvo,
}: {
  pagamento: PagamentoParaCorrigir
  onFechar: () => void
  onSalvo: Props['onSalvo']
}) {
  const inicial = {
    valor: pagamento.valor,
    forma: (pagamento.formaPagamento ?? '') as FormaPagamento | '',
    mes: pagamento.mesReferencia,
    vencimento: pagamento.vencimento.slice(0, 10),
    data: pagamento.dataPagamento ? pagamento.dataPagamento.slice(0, 10) : '',
  }
  const [valor, setValor] = useState(inicial.valor)
  const [forma, setForma] = useState<FormaPagamento | ''>(inicial.forma)
  const [mes, setMes] = useState(inicial.mes)
  const [vencimento, setVencimento] = useState(inicial.vencimento)
  const [data, setData] = useState(inicial.data)
  const [confirmandoDesfazer, setConfirmandoDesfazer] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  const estaPaga = pagamento.status === 'PAGA'
  const abonado = forma === 'ABONADO'
  const sujo =
    valor !== inicial.valor ||
    forma !== inicial.forma ||
    mes !== inicial.mes ||
    vencimento !== inicial.vencimento ||
    data !== inicial.data

  async function terminar(acao: 'corrigido' | 'desfeito') {
    try {
      await onSalvo(acao)
    } catch {
      /* a tela cuida do próprio erro de recarga */
    }
    onFechar()
  }

  async function desfazer() {
    setEnviando(true)
    setErro('')
    try {
      await apiPatch(`/pagamentos/${pagamento.id}/desfazer`, {})
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível desfazer o pagamento'))
      setEnviando(false)
      return
    }
    await terminar('desfeito')
  }

  async function salvar() {
    const erroValor = validarValorPagamento(valor, forma)
    if (erroValor) {
      setErro(erroValor)
      return
    }
    if (!mes || !vencimento) {
      setErro('Informe o mês e o vencimento.')
      return
    }
    if (estaPaga && !data) {
      setErro('Informe a data do pagamento.')
      return
    }

    setEnviando(true)
    setErro('')
    try {
      await apiPatch(`/pagamentos/${pagamento.id}`, {
        valor: abonado ? 0 : Number(valor),
        formaPagamento: forma || undefined,
        mesReferencia: mes,
        vencimento,
        ...(estaPaga ? { dataPagamento: data } : {}),
      })
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível salvar a correção'))
      setEnviando(false)
      return
    }
    await terminar('corrigido')
  }

  return (
    <ModalBase
      titulo={pagamento.nome ? `Corrigir pagamento — ${pagamento.nome}` : 'Corrigir pagamento'}
      onFechar={onFechar}
      sujo={sujo}
    >
      <form
        onSubmit={(evento) => {
          evento.preventDefault()
          if (!enviando) salvar()
        }}
      >
        <div className={styles.campo}>
          <label htmlFor="correcao-valor">Valor (R$)</label>
          <input
            type="number"
            id="correcao-valor"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={abonado ? '0' : valor}
            disabled={abonado}
            onChange={(evento) => {
              setValor(evento.target.value)
              setErro('')
            }}
          />
          {abonado && (
            <span className={styles.dica}>Abonado é isenção: o valor fica sempre R$ 0,00.</span>
          )}
        </div>

        <div className={styles.campo}>
          <label htmlFor="correcao-forma">Forma de pagamento</label>
          <select
            id="correcao-forma"
            value={forma}
            onChange={(evento) => {
              const nova = evento.target.value as FormaPagamento | ''
              setForma(nova)
              if (nova === 'ABONADO') setValor('0')
              else if (forma === 'ABONADO') setValor(inicial.valor === '0' ? '' : inicial.valor)
              setErro('')
            }}
          >
            <option value="">— não informada —</option>
            {FORMAS.map((opcao) => (
              <option key={opcao} value={opcao}>
                {LABELS_FORMA_PAGAMENTO[opcao]}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.campo}>
          <label htmlFor="correcao-mes">Mês</label>
          <input type="month" id="correcao-mes" value={mes} onChange={(evento) => setMes(evento.target.value)} />
        </div>

        <div className={styles.campo}>
          <label htmlFor="correcao-vencimento">Vencimento</label>
          <input
            type="date"
            id="correcao-vencimento"
            value={vencimento}
            onChange={(evento) => setVencimento(evento.target.value)}
          />
        </div>

        {estaPaga && (
          <div className={styles.campo}>
            <label htmlFor="correcao-data">Data do pagamento</label>
            <input type="date" id="correcao-data" value={data} onChange={(evento) => setData(evento.target.value)} />
          </div>
        )}

        {erro && (
          <p className={styles.erro} role="alert">
            {erro}
          </p>
        )}

        <div className={styles.acoes}>
          <button type="button" className={styles.botaoCancelar} onClick={onFechar} disabled={enviando}>
            Cancelar
          </button>
          <button type="submit" className={styles.botaoConfirmar} disabled={enviando}>
            {enviando ? 'Salvando...' : 'Salvar correção'}
          </button>
        </div>
      </form>

      {estaPaga && (
        <div className={styles.blocoDesfazer}>
          <p className={styles.textoDesfazer}>
            {confirmandoDesfazer
              ? 'Tem certeza? Esta cobrança volta a ficar pendente, sem data nem forma de pagamento.'
              : 'Registrou o pagamento no mês errado? Desfaça aqui e depois registre no mês certo.'}
          </p>
          <button
            type="button"
            className={styles.botaoDesfazer}
            onClick={confirmandoDesfazer ? desfazer : () => setConfirmandoDesfazer(true)}
            disabled={enviando}
          >
            {confirmandoDesfazer ? 'Sim, desfazer pagamento' : 'Desfazer pagamento'}
          </button>
        </div>
      )}
    </ModalBase>
  )
}
