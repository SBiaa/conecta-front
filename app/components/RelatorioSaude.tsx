'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { apiGet } from '../lib/api'
import { formatarMes, mesAtualISO } from '../lib/formato'
import {
  LABELS_LOCAL_DOR,
  type RelatorioDaAluna,
  ROTULOS_DISPOSICAO,
  ROTULOS_DOR,
  rotuloSituacao,
} from '../lib/saude'
import styles from './RelatorioSaude.module.css'

function mesAnterior(mes: string): string {
  const [ano, numero] = mes.split('-').map(Number)
  const d = new Date(ano, numero - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function mesSeguinte(mes: string): string {
  const [ano, numero] = mes.split('-').map(Number)
  const d = new Date(ano, numero, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatarDDMM(iso: string): string {
  const [, mes, dia] = iso.split('-')
  return `${dia}/${mes}`
}

function classeSituacao(situacao: string | null, estilos: Record<string, string>): string {
  if (situacao === 'OTIMA' || situacao === 'BOA') return estilos.seloOk
  if (situacao === 'ATENCAO') return estilos.seloAtencao
  if (situacao === 'BAIXA') return estilos.seloCritico
  return estilos.seloSemDados
}

/**
 * Relatório mensal de uma associada em modo leitura — usado pela professora da
 * turma e pela coordenação. A própria associada tem a versão dela em
 * /meu-progresso, que além disso registra e apaga.
 *
 * `caminho` é o endpoint da API que devolve o relatório; quem chama decide se é
 * a rota de professor ou a de admin, porque a permissão muda entre as duas.
 * `aoCarregar` entrega o relatório pra tela de fora usar o nome da associada no
 * título sem precisar de uma segunda requisição.
 */
export default function RelatorioSaude({
  caminho,
  aoCarregar,
}: {
  caminho: string
  aoCarregar?: (relatorio: RelatorioDaAluna) => void
}) {
  const [mes, setMes] = useState(mesAtualISO)
  const [relatorio, setRelatorio] = useState<RelatorioDaAluna | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let cancelado = false
    setCarregando(true)
    setErro('')

    apiGet<RelatorioDaAluna>(`${caminho}?mes=${mes}`)
      .then((dados) => {
        if (cancelado) return
        setRelatorio(dados)
        aoCarregar?.(dados)
      })
      .catch(() => {
        if (!cancelado) setErro('Não foi possível carregar os registros.')
      })
      .finally(() => {
        if (!cancelado) setCarregando(false)
      })

    return () => {
      cancelado = true
    }
  }, [caminho, mes, aoCarregar])

  return (
    <div className={styles.bloco}>
      <div className={styles.seletorMes}>
        <button
          type="button"
          className={styles.setaMes}
          onClick={() => setMes(mesAnterior(mes))}
          aria-label="Mês anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <span className={styles.mesAtual}>{formatarMes(mes)}</span>
        <button
          type="button"
          className={styles.setaMes}
          onClick={() => setMes(mesSeguinte(mes))}
          disabled={mes === mesAtualISO()}
          aria-label="Próximo mês"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {erro && <p className={styles.mensagemErro}>{erro}</p>}
      {carregando && <p className={styles.mensagem}>Carregando...</p>}

      {!carregando && !erro && relatorio && (
        <>
          <div className={styles.indicadores}>
            <div className={styles.indicador}>
              <span className={styles.rotulo}>Frequência</span>
              <span className={styles.valor}>
                {relatorio.frequencia.percentual === null ? '—' : `${relatorio.frequencia.percentual}%`}
              </span>
              <span className={`${styles.selo} ${classeSituacao(relatorio.frequencia.situacao, styles)}`}>
                {rotuloSituacao(relatorio.frequencia.situacao)}
              </span>
            </div>

            <div className={styles.indicador}>
              <span className={styles.rotulo}>Dor média</span>
              <span className={styles.valor}>
                {relatorio.dor.media === null ? '—' : ROTULOS_DOR[Math.round(relatorio.dor.media)]}
              </span>
              {relatorio.comparativo.dorMedia !== null && (
                <span className={styles.nota}>
                  antes: {ROTULOS_DOR[Math.round(relatorio.comparativo.dorMedia)]}
                </span>
              )}
            </div>

            <div className={styles.indicador}>
              <span className={styles.rotulo}>Disposição</span>
              <span className={styles.valor}>
                {relatorio.disposicao.media === null
                  ? '—'
                  : ROTULOS_DISPOSICAO[Math.round(relatorio.disposicao.media)]}
              </span>
              {relatorio.comparativo.disposicaoMedia !== null && (
                <span className={styles.nota}>
                  antes: {ROTULOS_DISPOSICAO[Math.round(relatorio.comparativo.disposicaoMedia)]}
                </span>
              )}
            </div>

            <div className={styles.indicador}>
              <span className={styles.rotulo}>Peso</span>
              <span className={styles.valor}>
                {relatorio.peso.ultimo === null ? '—' : `${relatorio.peso.ultimo} kg`}
              </span>
              {relatorio.peso.variacao !== null && relatorio.peso.variacao !== 0 && (
                <span className={styles.nota}>
                  {relatorio.peso.variacao > 0 ? '+' : ''}
                  {relatorio.peso.variacao} kg no mês
                </span>
              )}
            </div>
          </div>

          {relatorio.dor.locaisMaisFrequentes.length > 0 && (
            <>
              <p className={styles.rotuloSecao}>Onde doeu</p>
              <ul className={styles.chips}>
                {relatorio.dor.locaisMaisFrequentes.map((item) => (
                  <li key={item.local} className={styles.chip}>
                    {LABELS_LOCAL_DOR[item.local]} · {item.vezes}x
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className={styles.rotuloSecao}>Registros do mês</p>

          {relatorio.registros.length === 0 ? (
            <p className={styles.mensagem}>Nenhum registro neste mês.</p>
          ) : (
            <ul className={styles.listaRegistros}>
              {[...relatorio.registros].reverse().map((registro) => (
                <li key={registro.id} className={styles.registro}>
                  <span className={styles.registroData}>{formatarDDMM(registro.data)}</span>
                  <div className={styles.registroChips}>
                    {registro.disposicao !== null && (
                      <span className={styles.chipPequeno}>{ROTULOS_DISPOSICAO[registro.disposicao]}</span>
                    )}
                    {registro.nivelDor !== null && (
                      <span className={styles.chipPequeno}>{ROTULOS_DOR[registro.nivelDor]}</span>
                    )}
                    {registro.peso !== null && (
                      <span className={styles.chipPequeno}>{registro.peso} kg</span>
                    )}
                    {registro.locaisDor.map((local) => (
                      <span key={local} className={styles.chipPequeno}>
                        {LABELS_LOCAL_DOR[local]}
                      </span>
                    ))}
                  </div>
                  {registro.observacao && (
                    <p className={styles.registroObservacao}>{registro.observacao}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
