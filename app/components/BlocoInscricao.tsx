'use client'

import { useEffect } from 'react'
import { apiGet } from '../lib/api'

export type FormaPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO'

export type EstadoInscricao = {
  cobrar: boolean
  valor: string
  status: 'PAGA' | 'PENDENTE'
  formaPagamento: FormaPagamento
}

export const INSCRICAO_INICIAL: EstadoInscricao = {
  cobrar: true,
  valor: '',
  status: 'PAGA',
  formaPagamento: 'DINHEIRO',
}

// Converte o estado da UI no formato que a API espera (ou undefined quando não cobra).
export function inscricaoParaPayload(estado: EstadoInscricao) {
  if (!estado.cobrar) return undefined

  return {
    valor: Number(estado.valor),
    status: estado.status,
    ...(estado.status === 'PAGA' ? { formaPagamento: estado.formaPagamento } : {}),
  }
}

type Props = {
  valor: EstadoInscricao
  onChange: (estado: EstadoInscricao) => void
  styles: Record<string, string>
  titulo?: string
}

export default function BlocoInscricao({ valor: estado, onChange, styles, titulo }: Props) {
  // O valor padrão vem da API pra não ficar duplicado no front.
  useEffect(() => {
    if (estado.valor !== '') return

    apiGet<{ taxaMatriculaPadrao: number }>('/financeiro/config')
      .then((config) => onChange({ ...estado, valor: String(config.taxaMatriculaPadrao) }))
      .catch(() => onChange({ ...estado, valor: '15' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      {titulo && <h2 className={styles.subtitulo}>{titulo}</h2>}

      <div className={styles.campoCheckbox}>
        <input
          type="checkbox"
          id="cobrarInscricao"
          checked={estado.cobrar}
          onChange={(evento) => onChange({ ...estado, cobrar: evento.target.checked })}
        />
        <label htmlFor="cobrarInscricao">Cobrar taxa de inscrição</label>
      </div>

      {estado.cobrar && (
        <>
          <div className={styles.campo}>
            <label htmlFor="valorInscricao">Valor da inscrição</label>
            <input
              type="number"
              id="valorInscricao"
              step="0.01"
              min="0"
              value={estado.valor}
              onChange={(evento) => onChange({ ...estado, valor: evento.target.value })}
            />
          </div>

          <div className={styles.campo}>
            <label htmlFor="statusInscricao">Situação</label>
            <select
              id="statusInscricao"
              value={estado.status}
              onChange={(evento) =>
                onChange({ ...estado, status: evento.target.value as 'PAGA' | 'PENDENTE' })
              }
            >
              <option value="PAGA">Já paga</option>
              <option value="PENDENTE">Deixar pendente</option>
            </select>
          </div>

          {estado.status === 'PAGA' && (
            <div className={styles.campo}>
              <label htmlFor="formaPagamentoInscricao">Forma de pagamento</label>
              <select
                id="formaPagamentoInscricao"
                value={estado.formaPagamento}
                onChange={(evento) =>
                  onChange({ ...estado, formaPagamento: evento.target.value as FormaPagamento })
                }
              >
                <option value="DINHEIRO">Dinheiro</option>
                <option value="PIX">Pix</option>
                <option value="CARTAO">Cartão</option>
              </select>
            </div>
          )}
        </>
      )}
    </div>
  )
}
