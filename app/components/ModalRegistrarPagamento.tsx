'use client'

import { useState } from 'react'
import { apiPatch } from '../lib/api'
import { dataHojeISO, formatarMoeda } from '../lib/formato'
import {
  LABELS_FORMA_PAGAMENTO,
  mensagemDeErro,
  validarValorPagamento,
  type FormaPagamento,
} from '../lib/admin-pagamentos'
import ModalBase from './ModalBase'
import styles from './ModalPagamento.module.css'

export type PagamentoParaRegistrar = {
  id: string
  valor: string
  /** Nome da aluna, quando a tela ainda não deixa isso claro. */
  nome?: string
  /** Ex.: "Março 2026 — Hidroginástica". */
  descricao?: string
}

type Props = {
  /** null = fechado. */
  pagamento: PagamentoParaRegistrar | null
  onFechar: () => void
  /** Chamado depois do registro. A tela recarrega o que depende dele
   *  (lista, atrasados, resumo, extrato…); o modal só fecha quando isso termina. */
  onRegistrado: () => void | Promise<unknown>
}

const FORMAS: FormaPagamento[] = ['DINHEIRO', 'PIX', 'CARTAO', 'ABONADO']

/** Registrar o pagamento de uma cobrança. Usado no Financeiro, nos Atrasados e
 *  no perfil da associada — antes cada tela tinha a sua cópia. */
export default function ModalRegistrarPagamento({ pagamento, onFechar, onRegistrado }: Props) {
  if (!pagamento) return null
  return (
    <Formulario key={pagamento.id} pagamento={pagamento} onFechar={onFechar} onRegistrado={onRegistrado} />
  )
}

function Formulario({
  pagamento,
  onFechar,
  onRegistrado,
}: {
  pagamento: PagamentoParaRegistrar
  onFechar: () => void
  onRegistrado: () => void | Promise<unknown>
}) {
  const [hoje] = useState(dataHojeISO)
  const [forma, setForma] = useState<FormaPagamento>('DINHEIRO')
  const [data, setData] = useState(hoje)
  const [valor, setValor] = useState(pagamento.valor)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  const abonado = forma === 'ABONADO'
  const sujo = forma !== 'DINHEIRO' || data !== hoje || valor !== pagamento.valor

  async function confirmar() {
    const erroValor = validarValorPagamento(valor, forma)
    if (erroValor) {
      setErro(erroValor)
      return
    }
    if (!data) {
      setErro('Informe a data do pagamento.')
      return
    }

    setEnviando(true)
    setErro('')
    try {
      await apiPatch(`/pagamentos/${pagamento.id}/pagar`, {
        dataPagamento: data,
        formaPagamento: forma,
        valor: abonado ? 0 : Number(valor),
      })
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível registrar o pagamento'))
      setEnviando(false)
      return
    }

    // O pagamento já foi gravado. Se só a recarga da tela falhar, não faz sentido
    // deixar a pessoa tentar registrar de novo: fecha e a tela mostra o que tiver.
    try {
      await onRegistrado()
    } catch {
      /* a tela cuida do próprio erro de recarga */
    }
    onFechar()
  }

  return (
    <ModalBase titulo="Registrar pagamento" onFechar={onFechar} sujo={sujo}>
      {(pagamento.nome || pagamento.descricao) && (
        <p className={styles.resumo}>
          {pagamento.nome && <strong>{pagamento.nome}</strong>}
          {pagamento.nome && pagamento.descricao && <br />}
          {pagamento.descricao}
          {` · Cobrança de ${formatarMoeda(pagamento.valor)}`}
        </p>
      )}

      <form
        onSubmit={(evento) => {
          evento.preventDefault()
          if (!enviando) confirmar()
        }}
      >
        <div className={styles.campo}>
          <label htmlFor="pagamento-forma">Forma de pagamento</label>
          <select
            id="pagamento-forma"
            value={forma}
            onChange={(evento) => {
              const nova = evento.target.value as FormaPagamento
              setForma(nova)
              // Abonado é isenção: o valor é sempre R$ 0. Ao voltar pra outra forma,
              // restaura o valor da cobrança.
              setValor(nova === 'ABONADO' ? '0' : pagamento.valor)
              setErro('')
            }}
          >
            {FORMAS.map((opcao) => (
              <option key={opcao} value={opcao}>
                {LABELS_FORMA_PAGAMENTO[opcao]}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.campo}>
          <label htmlFor="pagamento-data">Data do pagamento</label>
          <input
            type="date"
            id="pagamento-data"
            value={data}
            onChange={(evento) => setData(evento.target.value)}
          />
        </div>

        <div className={styles.campo}>
          <label htmlFor="pagamento-valor">Valor (R$)</label>
          <input
            type="number"
            id="pagamento-valor"
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
            {enviando ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </form>
    </ModalBase>
  )
}
