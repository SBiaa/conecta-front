'use client'

import { useState } from 'react'
import { Plus, Ruler } from 'lucide-react'
import { apiPost } from '../lib/api'
import { dataHojeISO } from '../lib/formato'
import { type Avaliacao, CAMPOS_MEDIDA, type CampoMedida } from '../lib/saude'
import styles from './FormularioAvaliacao.module.css'

const MEDIDAS_VAZIAS = Object.fromEntries(CAMPOS_MEDIDA.map(({ campo }) => [campo, ''])) as Record<
  CampoMedida,
  string
>

/**
 * Registra uma avaliação física — as circunferências de fita métrica. Fica do
 * lado de quem mede (professora da turma ou coordenação); a associada só lê o
 * resultado no Meu Progresso.
 *
 * `caminho` é o endpoint de avaliações da aluna: quem chama escolhe entre a rota
 * de professor e a de admin, porque a permissão muda entre as duas.
 *
 * Salvar sobrescreve a avaliação daquele dia inteira. Por isso o formulário
 * carrega a que já existe na data escolhida: sem isso, medir de novo no mesmo
 * dia apagaria silenciosamente o que tinha sido medido antes.
 */
export default function FormularioAvaliacao({
  caminho,
  alturaAtual,
  avaliacoes,
  aoSalvar,
}: {
  caminho: string
  alturaAtual: number | null
  avaliacoes: Avaliacao[]
  aoSalvar: () => void
}) {
  const [aberto, setAberto] = useState(false)
  const [data, setData] = useState(dataHojeISO)
  const [altura, setAltura] = useState('')
  const [medidas, setMedidas] = useState<Record<CampoMedida, string>>(MEDIDAS_VAZIAS)
  const [observacao, setObservacao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const existente = avaliacoes.find((a) => a.data === data) ?? null

  // Troca a data e traz junto o que já estava medido naquele dia.
  function trocarData(nova: string) {
    setData(nova)
    const daData = avaliacoes.find((a) => a.data === nova)

    setMedidas(
      daData
        ? (Object.fromEntries(
            CAMPOS_MEDIDA.map(({ campo }) => [campo, daData[campo] === null ? '' : String(daData[campo])])
          ) as Record<CampoMedida, string>)
        : MEDIDAS_VAZIAS
    )
    setObservacao(daData?.observacao ?? '')
  }

  function limpar() {
    setData(dataHojeISO())
    setAltura('')
    setMedidas(MEDIDAS_VAZIAS)
    setObservacao('')
    setErro('')
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setErro('')
    setSalvando(true)

    try {
      await apiPost(caminho, { data, alturaCm: altura, ...medidas, observacao })
      limpar()
      setAberto(false)
      aoSalvar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar a avaliação.')
    } finally {
      setSalvando(false)
    }
  }

  if (!aberto) {
    return (
      <button
        type="button"
        className={styles.botaoAbrir}
        onClick={() => {
          trocarData(dataHojeISO())
          setAberto(true)
        }}
      >
        <Plus size={16} />
        Registrar avaliação
      </button>
    )
  }

  return (
    <form className={styles.formulario} onSubmit={enviar}>
      <p className={styles.titulo}>
        <Ruler size={15} />
        {existente ? 'Editando a avaliação deste dia' : 'Nova avaliação'}
      </p>

      <div className={styles.grade}>
        <label className={styles.campo}>
          <span className={styles.rotulo}>Dia</span>
          <input
            type="date"
            className={styles.input}
            value={data}
            max={dataHojeISO()}
            onChange={(e) => trocarData(e.target.value)}
          />
        </label>

        <label className={styles.campo}>
          <span className={styles.rotulo}>Altura (cm)</span>
          <input
            type="text"
            inputMode="numeric"
            className={styles.input}
            // Sem valor digitado a altura cadastrada fica como está — o
            // placeholder mostra qual é, pra não parecer campo vazio por engano.
            placeholder={alturaAtual === null ? '—' : String(alturaAtual)}
            value={altura}
            onChange={(e) => setAltura(e.target.value)}
          />
        </label>

        {CAMPOS_MEDIDA.map(({ campo, label }) => (
          <label key={campo} className={styles.campo}>
            <span className={styles.rotulo}>{label} (cm)</span>
            <input
              type="text"
              inputMode="decimal"
              className={styles.input}
              value={medidas[campo]}
              onChange={(e) => setMedidas({ ...medidas, [campo]: e.target.value })}
            />
          </label>
        ))}
      </div>

      <label className={styles.campo}>
        <span className={styles.rotulo}>Observações</span>
        <textarea
          className={styles.textarea}
          rows={2}
          maxLength={500}
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />
      </label>

      {erro && <p className={styles.mensagemErro}>{erro}</p>}

      <div className={styles.acoes}>
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
          {salvando ? 'Salvando...' : existente ? 'Atualizar avaliação' : 'Salvar avaliação'}
        </button>
      </div>
    </form>
  )
}
