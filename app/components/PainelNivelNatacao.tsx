'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiDelete, apiGet, apiPost } from '../lib/api'
import {
  NIVEIS_NATACAO,
  labelNivel,
  type HistoricoNivel,
  type NivelNatacao,
} from '../lib/natacao'
import { formatarData } from '../lib/formato'
import styles from './PainelNivelNatacao.module.css'

type Props = {
  // Rota da API do histórico, ex.: /usuarios/<id>/niveis-natacao. Ignorada
  // quando `historico` já vem pronto (visão do responsável, só leitura).
  caminho?: string
  historico?: HistoricoNivel
  somenteLeitura?: boolean
  aoMudar?: () => void
}

export default function PainelNivelNatacao({ caminho, historico: historicoPronto, somenteLeitura, aoMudar }: Props) {
  const [historico, setHistorico] = useState<HistoricoNivel | null>(historicoPronto ?? null)
  const [erro, setErro] = useState('')
  const [nivel, setNivel] = useState<NivelNatacao | ''>('')
  const [observacao, setObservacao] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(() => {
    if (!caminho) return
    apiGet<HistoricoNivel>(caminho)
      .then(setHistorico)
      .catch(() => setErro('Não foi possível carregar o nível.'))
  }, [caminho])

  useEffect(() => {
    if (historicoPronto) {
      setHistorico(historicoPronto)
      return
    }
    carregar()
  }, [historicoPronto, carregar])

  async function registrar() {
    if (!caminho || !nivel) return
    setSalvando(true)
    setErro('')
    try {
      await apiPost(caminho, { nivel, observacao: observacao.trim() || undefined })
      setNivel('')
      setObservacao('')
      carregar()
      aoMudar?.()
    } catch (e) {
      setErro(e instanceof Error && e.message ? e.message : 'Não foi possível salvar o nível.')
    } finally {
      setSalvando(false)
    }
  }

  async function apagar(registroId: number) {
    if (!caminho) return
    setErro('')
    try {
      await apiDelete(`${caminho}/${registroId}`)
      carregar()
      aoMudar?.()
    } catch {
      setErro('Não foi possível apagar o registro.')
    }
  }

  if (!historico) {
    return erro ? <p className={styles.erro}>{erro}</p> : <p className={styles.vazio}>Carregando...</p>
  }

  return (
    <div className={styles.painel}>
      <div className={styles.atual}>
        <span className={styles.atualRotulo}>Nível atual</span>
        <span className={styles.atualValor}>{labelNivel(historico.nivelAtual?.nivel)}</span>
        {historico.nivelAtual && (
          <span className={styles.atualData}>desde {formatarData(historico.nivelAtual.data)}</span>
        )}
      </div>

      {!somenteLeitura && caminho && (
        <div className={styles.formulario}>
          <div className={styles.opcoes} role="radiogroup" aria-label="Novo nível">
            {NIVEIS_NATACAO.map((opcao) => (
              <button
                key={opcao.valor}
                type="button"
                role="radio"
                aria-checked={nivel === opcao.valor}
                className={`${styles.opcao} ${nivel === opcao.valor ? styles.opcaoAtiva : ''}`}
                onClick={() => setNivel(opcao.valor)}
              >
                <strong>{opcao.label}</strong>
                <span>{opcao.descricao}</span>
              </button>
            ))}
          </div>
          <textarea
            className={styles.observacao}
            rows={2}
            maxLength={500}
            placeholder="Observação (opcional)"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
          <button type="button" className={styles.salvar} disabled={!nivel || salvando} onClick={registrar}>
            {salvando ? 'Salvando...' : 'Registrar nível'}
          </button>
        </div>
      )}

      {erro && <p className={styles.erro}>{erro}</p>}

      {historico.historico.length === 0 ? (
        <p className={styles.vazio}>Nenhum nível registrado ainda.</p>
      ) : (
        <ul className={styles.historico}>
          {historico.historico.map((registro) => (
            <li key={registro.id} className={styles.item}>
              <div>
                <strong>{labelNivel(registro.nivel)}</strong>
                <span className={styles.itemData}> · {formatarData(registro.data)}</span>
                {registro.registradoPor && (
                  <span className={styles.itemData}> · {registro.registradoPor.nome}</span>
                )}
                {registro.observacao && <p className={styles.itemObs}>{registro.observacao}</p>}
              </div>
              {!somenteLeitura && caminho && (
                <button type="button" className={styles.apagar} onClick={() => apagar(registro.id)}>
                  Apagar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
