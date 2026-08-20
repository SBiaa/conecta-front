'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Lock, Plus, Trash2 } from 'lucide-react'
import { apiDelete, apiGet, apiPost } from '../../lib/api'
import { dataHojeISO, formatarMes, mesAtualISO } from '../../lib/formato'
import styles from './progresso.module.css'
import {
  LABELS_LOCAL_DOR,
  LOCAIS_DOR,
  type LocalDor,
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

/* Mini gráfico de linha do peso. SVG puro — não vale trazer uma lib de chart
   pra desenhar no máximo ~31 pontos. */
function GraficoPeso({ serie }: { serie: { data: string; peso: number }[] }) {
  if (serie.length < 2) return null

  const pesos = serie.map((p) => p.peso)
  const minimo = Math.min(...pesos)
  const maximo = Math.max(...pesos)
  // Faixa mínima de 2 kg pra uma variação de 200 g não virar um pico dramático.
  const faixa = Math.max(maximo - minimo, 2)
  const meio = (maximo + minimo) / 2
  const topo = meio + faixa / 2
  const largura = 300
  const altura = 80

  const pontos = serie.map((ponto, indice) => {
    const x = (indice / (serie.length - 1)) * largura
    const y = altura - ((ponto.peso - (topo - faixa)) / faixa) * altura
    return { x, y, ...ponto }
  })

  const caminho = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <svg
      className={styles.grafico}
      viewBox={`0 0 ${largura} ${altura}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Variação do peso: de ${serie[0].peso} kg a ${serie[serie.length - 1].peso} kg`}
    >
      <path d={caminho} fill="none" stroke="var(--primary)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      {pontos.map((p) => (
        <circle key={p.data} cx={p.x} cy={p.y} r={3} fill="var(--primary)" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  )
}

function Formulario({ aoSalvar }: { aoSalvar: () => void }) {
  const [aberto, setAberto] = useState(false)
  const [data, setData] = useState(dataHojeISO)
  const [peso, setPeso] = useState('')
  const [nivelDor, setNivelDor] = useState<number | null>(null)
  const [locaisDor, setLocaisDor] = useState<LocalDor[]>([])
  const [disposicao, setDisposicao] = useState<number | null>(null)
  const [observacao, setObservacao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  function alternarLocal(local: LocalDor) {
    setLocaisDor((atuais) =>
      atuais.includes(local) ? atuais.filter((l) => l !== local) : [...atuais, local]
    )
  }

  function limpar() {
    setData(dataHojeISO())
    setPeso('')
    setNivelDor(null)
    setLocaisDor([])
    setDisposicao(null)
    setObservacao('')
    setErro('')
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setErro('')
    setSalvando(true)

    try {
      await apiPost('/me/saude', {
        data,
        peso: peso === '' ? null : Number(peso.replace(',', '.')),
        nivelDor,
        locaisDor,
        disposicao,
        observacao,
      })
      limpar()
      setAberto(false)
      aoSalvar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar seu registro.')
    } finally {
      setSalvando(false)
    }
  }

  if (!aberto) {
    return (
      <button type="button" className={styles.botaoAbrir} onClick={() => setAberto(true)}>
        <Plus size={18} />
        Registrar como estou hoje
      </button>
    )
  }

  return (
    <form className={styles.formulario} onSubmit={enviar}>
      <label className={styles.campo}>
        <span className={styles.rotulo}>Dia</span>
        <input
          type="date"
          className={styles.input}
          value={data}
          max={dataHojeISO()}
          onChange={(e) => setData(e.target.value)}
        />
      </label>

      <fieldset className={styles.grupo}>
        <legend className={styles.rotulo}>Como você se sente?</legend>
        <div className={styles.escala}>
          {[1, 2, 3, 4, 5].map((valor) => (
            <button
              key={valor}
              type="button"
              className={`${styles.opcao} ${disposicao === valor ? styles.opcaoAtiva : ''}`}
              onClick={() => setDisposicao(disposicao === valor ? null : valor)}
            >
              {ROTULOS_DISPOSICAO[valor]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.grupo}>
        <legend className={styles.rotulo}>Está com dor?</legend>
        <div className={styles.escala}>
          {[0, 1, 2, 3, 4, 5].map((valor) => (
            <button
              key={valor}
              type="button"
              className={`${styles.opcao} ${nivelDor === valor ? styles.opcaoAtiva : ''}`}
              onClick={() => setNivelDor(nivelDor === valor ? null : valor)}
            >
              {ROTULOS_DOR[valor]}
            </button>
          ))}
        </div>
      </fieldset>

      {nivelDor !== null && nivelDor > 0 && (
        <fieldset className={styles.grupo}>
          <legend className={styles.rotulo}>Onde dói?</legend>
          <div className={styles.escala}>
            {LOCAIS_DOR.map((local) => (
              <button
                key={local}
                type="button"
                className={`${styles.opcao} ${locaisDor.includes(local) ? styles.opcaoAtiva : ''}`}
                onClick={() => alternarLocal(local)}
              >
                {LABELS_LOCAL_DOR[local]}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <label className={styles.campo}>
        <span className={styles.rotulo}>
          Peso <span className={styles.opcional}>(opcional)</span>
        </span>
        <input
          type="text"
          inputMode="decimal"
          className={styles.input}
          placeholder="kg"
          value={peso}
          onChange={(e) => setPeso(e.target.value)}
        />
      </label>

      <label className={styles.campo}>
        <span className={styles.rotulo}>
          Quer anotar mais alguma coisa? <span className={styles.opcional}>(opcional)</span>
        </span>
        <textarea
          className={styles.textarea}
          rows={2}
          maxLength={500}
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />
      </label>

      {erro && <p className={styles.mensagemErro}>{erro}</p>}

      <div className={styles.acoesFormulario}>
        <button
          type="button"
          className={styles.botaoSecundario}
          onClick={() => {
            limpar()
            setAberto(false)
          }}
        >
          Cancelar
        </button>
        <button type="submit" className={styles.botaoPrimario} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      <p className={styles.aviso}>
        <Lock size={13} />
        Seus dados de saúde ficam visíveis pra você, pra professora da sua turma e pra
        coordenação — pra poderem adaptar os exercícios.
      </p>
    </form>
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

  async function apagar(id: number) {
    if (!confirm('Apagar este registro?')) return
    try {
      await apiDelete(`/me/saude/${id}`)
      carregar()
    } catch {
      setErro('Não foi possível apagar o registro.')
    }
  }

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

      {ehMesAtual && <Formulario aoSalvar={carregar} />}

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

          {relatorio.totalRegistros === 0 ? (
            <section className={styles.cartao}>
              <h2 className={styles.tituloCartao}>Como você esteve</h2>
              <p className={styles.vazio}>
                {ehMesAtual
                  ? 'Você ainda não registrou nada neste mês. Que tal começar hoje?'
                  : 'Nenhum registro neste mês.'}
              </p>
            </section>
          ) : (
            <>
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

              {relatorio.peso.ultimo !== null && (
                <section className={styles.cartao}>
                  <h2 className={styles.tituloCartao}>Peso</h2>
                  <p className={styles.numeroGrande}>
                    {relatorio.peso.ultimo}
                    <span className={styles.unidade}>kg</span>
                  </p>
                  {relatorio.peso.variacao !== null && relatorio.peso.variacao !== 0 && (
                    <p className={styles.detalhe}>
                      {relatorio.peso.variacao > 0 ? '+' : ''}
                      {relatorio.peso.variacao} kg desde o começo do mês
                    </p>
                  )}
                  <GraficoPeso serie={relatorio.peso.serie} />
                </section>
              )}

              <section className={styles.cartao}>
                <h2 className={styles.tituloCartao}>Seus registros</h2>
                <ul className={styles.listaRegistros}>
                  {[...relatorio.registros].reverse().map((registro) => (
                    <li key={registro.id} className={styles.registro}>
                      <div className={styles.registroTopo}>
                        <span className={styles.registroData}>{formatarDDMM(registro.data)}</span>
                        <button
                          type="button"
                          className={styles.botaoApagar}
                          onClick={() => apagar(registro.id)}
                          aria-label={`Apagar registro de ${formatarDDMM(registro.data)}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <p className={styles.registroLinha}>
                        {registro.disposicao !== null && (
                          <span className={styles.chipPequeno}>
                            {ROTULOS_DISPOSICAO[registro.disposicao]}
                          </span>
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
                      </p>

                      {registro.observacao && (
                        <p className={styles.registroObservacao}>{registro.observacao}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </>
      )}
    </div>
  )
}
