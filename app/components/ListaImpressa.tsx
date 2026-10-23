'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { apiGet } from '../lib/api'
import { LABELS_DIA } from '../lib/dias'
import styles from './ListaImpressa.module.css'

type ListaMensal = {
  turma: {
    id: number
    nome: string
    projeto: string | null
    professor: string | null
    dias: string[]
    horario: string | null
  }
  mes: string
  datas: number[]
  alunas: { matriculaId: number; nome: string }[]
}

// Mínimo de linhas na folha: turmas pequenas completam com linhas em branco,
// pra professora anotar à mão quem chegar depois.
const MINIMO_LINHAS = 20

// Medidas da folha A4 com margem de 1 cm (em cm). A tabela divide o espaço que
// sobra depois do cabeçalho, da faixa de dados e do rodapé, pra caber sempre
// em UMA página, não importa quantas alunas a turma tenha.
const FOLHA_PAISAGEM_ALTURA = 19
const FOLHA_RETRATO_ALTURA = 27.7
const ESPACO_FIXO_CM = 5.2
const LINHAS_MAXIMO_PAISAGEM = 24

// Folha em branco: nada preenchido, pra escrever tudo à mão (turma nova,
// aula avulsa, ou quando o sistema não estiver à mão).
const BRANCO_LINHAS = 20
const BRANCO_COLUNAS = 15

const MESES = [
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

function mesAtualISO(): string {
  const agora = new Date()
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
}

function tituloMes(mes: string): string {
  const [ano, numero] = mes.split('-')
  return `${MESES[Number(numero) - 1]} de ${ano}`
}

export default function ListaImpressa({ hrefVoltar }: { hrefVoltar: (id: string) => string }) {
  const { id } = useParams<{ id: string }>()

  const [mes, setMes] = useState(mesAtualISO())
  const [lista, setLista] = useState<ListaMensal | null>(null)
  const [erro, setErro] = useState('')
  const [emBranco, setEmBranco] = useState(false)

  useEffect(() => {
    if (!mes) return
    setLista(null)
    setErro('')
    apiGet<ListaMensal>(`/professor/turmas/${id}/lista-mensal?mes=${mes}`)
      .then(setLista)
      .catch(() => setErro('Não foi possível carregar a lista.'))
  }, [id, mes])

  const totalLinhas = lista ? Math.max(MINIMO_LINHAS, lista.alunas.length) : MINIMO_LINHAS
  const paisagem = emBranco || totalLinhas <= LINHAS_MAXIMO_PAISAGEM
  const alturaFolha = paisagem ? FOLHA_PAISAGEM_ALTURA : FOLHA_RETRATO_ALTURA
  // +1 da linha de cabeçalho da tabela
  const linhasNaFolha = emBranco ? BRANCO_LINHAS : totalLinhas
  const alturaLinhaCm = (alturaFolha - ESPACO_FIXO_CM) / (linhasNaFolha + 1)

  return (
    <div className={styles.pagina}>
      {/* Orientação depende do nº de linhas; o menu e as margens do layout
          não podem ocupar espaço da folha. */}
      <style>{`@media print {
        @page { size: A4 ${paisagem ? 'landscape' : 'portrait'}; margin: 1cm; }
        nav { display: none !important; }
        main { margin: 0 !important; padding: 0 !important; max-width: none !important; }
      }`}</style>
      <div className={styles.controles}>
        <Link href={hrefVoltar(id)} className={styles.voltar}>
          ← Voltar
        </Link>
        <label className={styles.campoMes}>
          Mês
          <input
            type="month"
            className={styles.mesInput}
            value={mes}
            onChange={(e) => setMes(e.target.value)}
          />
        </label>
        <button
          type="button"
          className={styles.botaoSecundario}
          onClick={() => setEmBranco((atual) => !atual)}
        >
          {emBranco ? 'Ver lista com nomes' : 'Folha em branco'}
        </button>
        <button
          type="button"
          className={styles.botaoImprimir}
          onClick={() => window.print()}
          disabled={!lista}
        >
          Imprimir
        </button>
      </div>

      {erro && <p className={styles.mensagemErro}>{erro}</p>}
      {!erro && !lista && <p className={styles.mensagem}>Carregando...</p>}

      {lista && emBranco && (
        <div
          className={styles.folha}
          style={
            {
              '--altura-folha': `${alturaFolha}cm`,
              '--altura-linha': `${alturaLinhaCm.toFixed(3)}cm`,
            } as React.CSSProperties
          }
        >
          <header className={styles.cabecalho}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                /hidro/i.test(lista.turma.projeto ?? '')
                  ? '/logo-viva-bem-hidro.webp'
                  : '/logo-novo-millenium.png'
              }
              alt="Logo"
              className={styles.logo}
            />
            <div className={styles.tituloBloco}>
              <span className={styles.rotulo}>Lista de chamada</span>
            </div>
          </header>

          <dl className={`${styles.dados} ${styles.dadosBranco}`}>
            <div>
              <dt>Turma</dt>
              <dd />
            </div>
            <div>
              <dt>Projeto</dt>
              <dd />
            </div>
            <div>
              <dt>Dias e horário</dt>
              <dd />
            </div>
            <div>
              <dt>Professora</dt>
              <dd />
            </div>
            <div>
              <dt>Mês / ano</dt>
              <dd />
            </div>
          </dl>

          <table className={styles.tabela}>
            <thead>
              <tr>
                <th className={styles.colNumero}>Nº</th>
                <th className={styles.colNome}>Nome</th>
                {Array.from({ length: BRANCO_COLUNAS }).map((_, i) => (
                  <th key={i} className={styles.colDia} />
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: BRANCO_LINHAS }).map((_, i) => (
                <tr key={i}>
                  <td className={styles.colNumero}>{i + 1}</td>
                  <td className={styles.colNome} />
                  {Array.from({ length: BRANCO_COLUNAS }).map((_, j) => (
                    <td key={j} className={styles.colDia} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <p className={styles.legenda}>
            <span>Escreva o dia no alto de cada coluna · P = presente · F = falta</span>
            <span>Associação Novo Millenium</span>
          </p>
        </div>
      )}

      {lista && !emBranco && (
        <div
          className={styles.folha}
          style={
            {
              '--altura-folha': `${alturaFolha}cm`,
              '--altura-linha': `${alturaLinhaCm.toFixed(3)}cm`,
            } as React.CSSProperties
          }
        >
          <header className={styles.cabecalho}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                /hidro/i.test(lista.turma.projeto ?? '')
                  ? '/logo-viva-bem-hidro.webp'
                  : '/logo-novo-millenium.png'
              }
              alt="Logo"
              className={styles.logo}
            />
            <div className={styles.tituloBloco}>
              <span className={styles.rotulo}>Lista de chamada</span>
              <h1 className={styles.titulo}>{tituloMes(lista.mes)}</h1>
            </div>
          </header>

          <dl className={styles.dados}>
            <div>
              <dt>Turma</dt>
              <dd>{lista.turma.nome}</dd>
            </div>
            {lista.turma.projeto && (
              <div>
                <dt>Projeto</dt>
                <dd>{lista.turma.projeto}</dd>
              </div>
            )}
            <div>
              <dt>Dias e horário</dt>
              <dd>
                {lista.turma.dias.length > 0
                  ? lista.turma.dias.map((d) => LABELS_DIA[d] ?? d).join(', ')
                  : '—'}
                {lista.turma.horario ? ` · ${lista.turma.horario}` : ''}
              </dd>
            </div>
            <div>
              <dt>Professora</dt>
              <dd>{lista.turma.professor ?? '—'}</dd>
            </div>
          </dl>

          {lista.turma.dias.length === 0 && (
            <p className={`${styles.mensagem} ${styles.soTela}`}>
              Esta turma não tem dias de aula cadastrados. Peça à coordenação para preencher os dias
              da turma.
            </p>
          )}

          {lista.alunas.length === 0 && (
            <p className={`${styles.mensagem} ${styles.soTela}`}>
              Nenhuma aluna ativa nesta turma.
            </p>
          )}
          <table className={styles.tabela}>
            <thead>
              <tr>
                <th className={styles.colNumero}>Nº</th>
                <th className={styles.colNome}>Nome</th>
                {lista.datas.map((dia) => (
                  <th key={dia} className={styles.colDia}>
                    {String(dia).padStart(2, '0')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.alunas.map((aluna, indice) => (
                <tr key={aluna.matriculaId}>
                  <td className={styles.colNumero}>{indice + 1}</td>
                  <td className={styles.colNome}>{aluna.nome}</td>
                  {lista.datas.map((dia) => (
                    <td key={dia} className={styles.colDia} />
                  ))}
                </tr>
              ))}
              {Array.from({
                length: Math.max(0, MINIMO_LINHAS - lista.alunas.length),
              }).map((_, i) => (
                <tr key={`vazia-${i}`}>
                  <td className={styles.colNumero}>{lista.alunas.length + i + 1}</td>
                  <td className={styles.colNome} />
                  {lista.datas.map((dia) => (
                    <td key={dia} className={styles.colDia} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <p className={styles.legenda}>
            <span>P = presente · F = falta</span>
            <span>Associação Novo Millenium</span>
          </p>
        </div>
      )}
    </div>
  )
}
