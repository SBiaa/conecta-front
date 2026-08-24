'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { apiGet } from '../../lib/api'
import { comSinal, formatarMes, formatarNumero, mesAtualISO } from '../../lib/formato'
import GraficoLinha from '../../components/GraficoLinha'
import styles from './progresso.module.css'
import {
  type Avaliacao,
  CAMPOS_BALANCA,
  CAMPOS_MEDIDA,
  faixaImc,
  LABELS_LOCAL_DOR,
  type Relatorio,
  ROTULOS_DISPOSICAO,
  ROTULOS_DOR,
  rotuloSituacao,
} from '../../lib/saude'

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

function classeSituacao(situacao: string | null): string {
  if (situacao === 'OTIMA' || situacao === 'BOA') return styles.seloOk
  if (situacao === 'ATENCAO') return styles.seloAtencao
  if (situacao === 'BAIXA') return styles.seloCritico
  return styles.seloSemDados
}

function CartaoComposicao({ relatorio }: { relatorio: Relatorio }) {
  const preenchidos = CAMPOS_BALANCA.filter(
    ({ campo }) => relatorio.composicao[campo].ultimo !== null
  )

  if (preenchidos.length === 0) return null

  return (
    <section className={styles.cartao}>
      <h2 className={styles.tituloCartao}>Composição corporal</h2>

      <div className={styles.gradeIndicadores}>
        {preenchidos.map(({ campo, label, unidade }) => {
          const evolucao = relatorio.composicao[campo]
          return (
            <div key={campo} className={styles.indicador}>
              <span className={styles.rotuloIndicador}>{label}</span>
              <span className={styles.valorIndicador}>
                {formatarNumero(evolucao.ultimo!)}
                {unidade && <span className={styles.unidadePequena}>{unidade}</span>}
              </span>
              {evolucao.variacao !== null && evolucao.variacao !== 0 && (
                <span className={styles.notaIndicador}>{comSinal(evolucao.variacao)} no mês</span>
              )}
            </div>
          )
        })}
      </div>

      <GraficoLinha
        serie={relatorio.composicao.percentualGordura.serie}
        unidade="%"
        faixaMinima={2}
      />
    </section>
  )
}

function CartaoMedidas({ avaliacao }: { avaliacao: Avaliacao }) {
  const preenchidas = CAMPOS_MEDIDA.filter(({ campo }) => avaliacao[campo] !== null)

  if (preenchidas.length === 0) return null

  return (
    <section className={styles.cartao}>
      <div className={styles.cabecalhoCartao}>
        <h2 className={styles.tituloCartao}>Suas medidas</h2>
        <span className={styles.dataMedida}>{formatarDDMM(avaliacao.data)}</span>
      </div>

      <div className={styles.gradeIndicadores}>
        {preenchidas.map(({ campo, label }) => (
          <div key={campo} className={styles.indicador}>
            <span className={styles.rotuloIndicador}>{label}</span>
            <span className={styles.valorIndicador}>
              {formatarNumero(avaliacao[campo]!)}
              <span className={styles.unidadePequena}>cm</span>
            </span>
          </div>
        ))}
      </div>

      {avaliacao.observacao && <p className={styles.detalhe}>{avaliacao.observacao}</p>}

      <p className={styles.rodapeMedida}>
        Medidas tiradas{' '}
        {avaliacao.registradoPor ? `por ${avaliacao.registradoPor}` : 'na sua avaliação'}.
      </p>
    </section>
  )
}

export default function MeuProgressoPage() {
  const [mes, setMes] = useState(mesAtualISO)
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(() => {
    setCarregando(true)
    setErro('')
    apiGet<Relatorio>(`/me/relatorio?mes=${mes}`)
      .then(setRelatorio)
      .catch(() => setErro('Não foi possível carregar seu progresso.'))
      .finally(() => setCarregando(false))
  }, [mes])

  useEffect(carregar, [carregar])

  const ehMesAtual = mes === mesAtualISO()

  return (
    <div className={styles.pagina}>
      <h1 className={styles.titulo}>Meu Progresso</h1>

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
          disabled={ehMesAtual}
          aria-label="Próximo mês"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <p className={styles.aviso}>
        <Lock size={13} />
        Sua professora registra sua saúde do dia (peso, disposição, dor) durante a aula, na balança
        da turma. Fica visível pra você, pra ela e pra coordenação — pra poderem adaptar os
        exercícios.
      </p>

      {erro && <p className={styles.mensagemErro}>{erro}</p>}
      {carregando && <p className={styles.mensagem}>Carregando...</p>}

      {!carregando && relatorio && (
        <>
          <section className={styles.cartao}>
            <div className={styles.cabecalhoCartao}>
              <h2 className={styles.tituloCartao}>Frequência do mês</h2>
              <span className={`${styles.selo} ${classeSituacao(relatorio.frequencia.situacao)}`}>
                {rotuloSituacao(relatorio.frequencia.situacao)}
              </span>
            </div>

            {relatorio.frequencia.totalAulas === 0 ? (
              <p className={styles.vazio}>Nenhuma chamada registrada neste mês.</p>
            ) : (
              <>
                <p className={styles.numeroGrande}>{relatorio.frequencia.percentual}%</p>
                <p className={styles.detalhe}>
                  {relatorio.frequencia.presencas} de {relatorio.frequencia.totalAulas}{' '}
                  {relatorio.frequencia.totalAulas === 1 ? 'aula' : 'aulas'}
                  {relatorio.frequencia.faltas > 0 &&
                    ` · ${relatorio.frequencia.faltas} ${
                      relatorio.frequencia.faltas === 1 ? 'falta' : 'faltas'
                    }`}
                </p>

                {relatorio.comparativo.frequenciaPercentual !== null && (
                  <p className={styles.comparativo}>
                    Em {formatarMes(relatorio.comparativo.mes)} foi{' '}
                    {relatorio.comparativo.frequenciaPercentual}%
                  </p>
                )}

                <ul className={styles.listaTurmas}>
                  {relatorio.frequencia.porTurma
                    .filter((turma) => turma.totalAulas > 0)
                    .map((turma) => (
                      <li key={turma.turmaId} className={styles.itemTurma}>
                        <span className={styles.nomeTurma}>{turma.nome}</span>
                        <span className={styles.percentualTurma}>{turma.percentual}%</span>
                      </li>
                    ))}
                </ul>
              </>
            )}
          </section>

          {relatorio.totalRegistros === 0 && relatorio.ultimaAvaliacao === null ? (
            <section className={styles.cartao}>
              <h2 className={styles.tituloCartao}>Como você esteve</h2>
              <p className={styles.vazio}>
                {ehMesAtual
                  ? 'Nada registrado ainda neste mês — sua professora lança isso durante a aula.'
                  : 'Nenhum registro neste mês.'}
              </p>
            </section>
          ) : (
            <>
              {relatorio.totalRegistros > 0 && (
                <section className={styles.cartao}>
                  <h2 className={styles.tituloCartao}>Como você esteve</h2>

                  <div className={styles.resumo}>
                    {relatorio.disposicao.media !== null && (
                      <div className={styles.blocoResumo}>
                        <span className={styles.rotuloResumo}>Disposição média</span>
                        <span className={styles.valorResumo}>
                          {ROTULOS_DISPOSICAO[Math.round(relatorio.disposicao.media)]}
                        </span>
                        {relatorio.comparativo.disposicaoMedia !== null && (
                          <span className={styles.notaResumo}>
                            mês passado:{' '}
                            {ROTULOS_DISPOSICAO[Math.round(relatorio.comparativo.disposicaoMedia)]}
                          </span>
                        )}
                      </div>
                    )}

                    {relatorio.dor.media !== null && (
                      <div className={styles.blocoResumo}>
                        <span className={styles.rotuloResumo}>Dor média</span>
                        <span className={styles.valorResumo}>
                          {ROTULOS_DOR[Math.round(relatorio.dor.media)]}
                        </span>
                        {relatorio.comparativo.dorMedia !== null && (
                          <span className={styles.notaResumo}>
                            mês passado: {ROTULOS_DOR[Math.round(relatorio.comparativo.dorMedia)]}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {relatorio.dor.locaisMaisFrequentes.length > 0 && (
                    <>
                      <p className={styles.rotuloSecao}>Onde doeu mais</p>
                      <ul className={styles.chips}>
                        {relatorio.dor.locaisMaisFrequentes.slice(0, 4).map((item) => (
                          <li key={item.local} className={styles.chip}>
                            {LABELS_LOCAL_DOR[item.local]} · {item.vezes}x
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </section>
              )}

              {relatorio.peso.ultimo !== null && (
                <section className={styles.cartao}>
                  <div className={styles.cabecalhoCartao}>
                    <h2 className={styles.tituloCartao}>Peso</h2>
                    {relatorio.imc !== null && (
                      <span className={styles.seloNeutro}>
                        IMC {formatarNumero(relatorio.imc)} · {faixaImc(relatorio.imc)}
                      </span>
                    )}
                  </div>

                  <p className={styles.numeroGrande}>
                    {formatarNumero(relatorio.peso.ultimo)}
                    <span className={styles.unidade}>kg</span>
                  </p>

                  {relatorio.peso.variacao !== null && relatorio.peso.variacao !== 0 && (
                    <p className={styles.detalhe}>
                      {comSinal(relatorio.peso.variacao)} kg desde o começo do mês
                    </p>
                  )}

                  {relatorio.alturaCm === null && (
                    <p className={styles.comparativo}>
                      Sua altura ainda não foi cadastrada — na próxima avaliação a professora mede e
                      o IMC aparece aqui.
                    </p>
                  )}

                  <GraficoLinha serie={relatorio.peso.serie} unidade="kg" faixaMinima={2} />
                </section>
              )}

              <CartaoComposicao relatorio={relatorio} />

              {relatorio.ultimaAvaliacao && <CartaoMedidas avaliacao={relatorio.ultimaAvaliacao} />}

              {relatorio.totalRegistros > 0 && (
                <section className={styles.cartao}>
                  <h2 className={styles.tituloCartao}>Seus registros</h2>
                  <ul className={styles.listaRegistros}>
                    {[...relatorio.registros].reverse().map((registro) => (
                      <li key={registro.id} className={styles.registro}>
                        <div className={styles.registroTopo}>
                          <span className={styles.registroData}>{formatarDDMM(registro.data)}</span>
                          {registro.registradoPor && (
                            <span className={styles.registradoPor}>por {registro.registradoPor}</span>
                          )}
                        </div>

                        <p className={styles.registroLinha}>
                          {registro.disposicao !== null && (
                            <span className={styles.chipPequeno}>
                              {ROTULOS_DISPOSICAO[registro.disposicao]}
                            </span>
                          )}
                          {registro.nivelDor !== null && (
                            <span className={styles.chipPequeno}>
                              {ROTULOS_DOR[registro.nivelDor]}
                            </span>
                          )}
                          {registro.peso !== null && (
                            <span className={styles.chipPequeno}>{formatarNumero(registro.peso)} kg</span>
                          )}
                          {CAMPOS_BALANCA.filter(({ campo }) => registro[campo] !== null).map(
                            ({ campo, label, unidade }) => (
                              <span key={campo} className={styles.chipPequeno}>
                                {label}: {formatarNumero(registro[campo]!)}
                                {unidade}
                              </span>
                            )
                          )}
                          {registro.locaisDor.map((local) => (
                            <span key={local} className={styles.chipPequeno}>
                              {LABELS_LOCAL_DOR[local]}
                            </span>
                          ))}
                        </p>

                        {registro.observacao && (
                          <p className={styles.registroObservacao}>{registro.observacao}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
