'use client'

import { formatarNumero } from '../lib/formato'
import styles from './GraficoLinha.module.css'

type Ponto = { data: string; valor: number }

function formatarDDMM(iso: string): string {
  const [, mes, dia] = iso.slice(0, 10).split('-')
  return `${dia}/${mes}`
}

/**
 * Mini gráfico de linha em SVG puro — não vale trazer uma lib de chart pra
 * desenhar no máximo ~31 pontos.
 *
 * `faixaMinima` evita drama visual: sem ela, uma oscilação de 200 g vira um
 * pico de ponta a ponta. Cada grandeza tem a sua (peso em kg, gordura em %).
 *
 * O título fica acima e o primeiro/último valor (com a data) abaixo, para o
 * gráfico dizer sozinho o que é e de quando a quando vai.
 */
export default function GraficoLinha({
  serie,
  unidade,
  titulo,
  faixaMinima = 2,
}: {
  serie: Ponto[]
  unidade: string
  titulo?: string
  faixaMinima?: number
}) {
  if (serie.length < 2) return null

  const valores = serie.map((p) => p.valor)
  const minimo = Math.min(...valores)
  const maximo = Math.max(...valores)
  const faixa = Math.max(maximo - minimo, faixaMinima)
  const meio = (maximo + minimo) / 2
  const base = meio - faixa / 2

  const largura = 300
  const altura = 120
  const margem = 8

  const primeiro = serie[0]
  const ultimo = serie[serie.length - 1]

  const pontos = serie.map((ponto, indice) => ({
    ...ponto,
    x: margem + (indice / (serie.length - 1)) * (largura - margem * 2),
    y: altura - margem - ((ponto.valor - base) / faixa) * (altura - margem * 2),
  }))

  const caminho = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  const sufixo = unidade ? ` ${unidade}` : ''

  return (
    <figure className={styles.figura}>
      {titulo && <figcaption className={styles.titulo}>{titulo}</figcaption>}
      <svg
        className={styles.grafico}
        viewBox={`0 0 ${largura} ${altura}`}
        role="img"
        aria-label={`${titulo ? `${titulo}: ` : ''}de ${formatarNumero(primeiro.valor)}${sufixo} em ${formatarDDMM(
          primeiro.data
        )} a ${formatarNumero(ultimo.valor)}${sufixo} em ${formatarDDMM(ultimo.data)}`}
      >
        <path
          d={caminho}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {pontos.map((p) => (
          <circle key={p.data} cx={p.x} cy={p.y} r={3.5} fill="var(--primary)" />
        ))}
      </svg>
      <div className={styles.extremos}>
        <span>
          {formatarDDMM(primeiro.data)} · <strong>{formatarNumero(primeiro.valor)}{sufixo}</strong>
        </span>
        <span>
          {formatarDDMM(ultimo.data)} · <strong>{formatarNumero(ultimo.valor)}{sufixo}</strong>
        </span>
      </div>
    </figure>
  )
}
