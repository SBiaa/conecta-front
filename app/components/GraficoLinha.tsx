'use client'

import { formatarNumero } from '../lib/formato'
import styles from './GraficoLinha.module.css'

type Ponto = { data: string; valor: number }

/**
 * Mini gráfico de linha em SVG puro — não vale trazer uma lib de chart pra
 * desenhar no máximo ~31 pontos.
 *
 * `faixaMinima` evita drama visual: sem ela, uma oscilação de 200 g vira um
 * pico de ponta a ponta. Cada grandeza tem a sua (peso em kg, gordura em %).
 */
export default function GraficoLinha({
  serie,
  unidade,
  faixaMinima = 2,
}: {
  serie: Ponto[]
  unidade: string
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
  const altura = 80

  const pontos = serie.map((ponto, indice) => ({
    ...ponto,
    x: (indice / (serie.length - 1)) * largura,
    y: altura - ((ponto.valor - base) / faixa) * altura,
  }))

  const caminho = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <svg
      className={styles.grafico}
      viewBox={`0 0 ${largura} ${altura}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Variação: de ${formatarNumero(serie[0].valor)}${unidade} a ${formatarNumero(
        serie[serie.length - 1].valor
      )}${unidade}`}
    >
      <path
        d={caminho}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
      {pontos.map((p) => (
        <circle key={p.data} cx={p.x} cy={p.y} r={3} fill="var(--primary)" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  )
}
