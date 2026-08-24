'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Plus, HeartPulse } from 'lucide-react'
import { apiPost } from '../lib/api'
import { dataHojeISO } from '../lib/formato'
import {
  CAMPOS_BALANCA,
  type CampoBalanca,
  LABELS_LOCAL_DOR,
  LOCAIS_DOR,
  type LocalDor,
  type RegistroSaude,
  ROTULOS_DISPOSICAO,
  ROTULOS_DOR,
} from '../lib/saude'
import styles from './FormularioRegistroSaude.module.css'

const BALANCA_VAZIA = Object.fromEntries(CAMPOS_BALANCA.map(({ campo }) => [campo, ''])) as Record<
  CampoBalanca,
  string
>

/**
 * Registro de saúde do dia (peso, composição da balança, dor, disposição) —
 * quem lança é a professora da turma (ou a coordenação), igual já acontece
 * com a avaliação de fita métrica; a associada só lê o resultado no Meu
 * Progresso.
 *
 * `caminho` é o endpoint de registros da aluna: quem chama escolhe entre a
 * rota de professor e a de admin, porque a permissão muda entre as duas.
 *
 * Salvar sobrescreve o registro daquele dia inteiro. Por isso o formulário
 * carrega o que já existe na data escolhida: sem isso, registrar de novo no
 * mesmo dia apagaria silenciosamente o que tinha sido lançado antes.
 */
export default function FormularioRegistroSaude({
  caminho,
  registros,
  aoSalvar,
}: {
  caminho: string
  registros: RegistroSaude[]
  aoSalvar: () => void
}) {
  const [aberto, setAberto] = useState(false)
  const [balancaAberta, setBalancaAberta] = useState(false)
  const [data, setData] = useState(dataHojeISO)
  const [peso, setPeso] = useState('')
  const [balanca, setBalanca] = useState<Record<CampoBalanca, string>>(BALANCA_VAZIA)
  const [nivelDor, setNivelDor] = useState<number | null>(null)
  const [locaisDor, setLocaisDor] = useState<LocalDor[]>([])
  const [disposicao, setDisposicao] = useState<number | null>(null)
  const [observacao, setObservacao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const existente = registros.find((r) => r.data === data) ?? null

  // Troca a data e traz junto o que já estava registrado naquele dia.
  function trocarData(nova: string) {
    setData(nova)
    const doDia = registros.find((r) => r.data === nova)

    setPeso(doDia?.peso === null || doDia?.peso === undefined ? '' : String(doDia.peso))
    setBalanca(
      doDia
        ? (Object.fromEntries(
            CAMPOS_BALANCA.map(({ campo }) => [campo, doDia[campo] === null ? '' : String(doDia[campo])])
          ) as Record<CampoBalanca, string>)
        : BALANCA_VAZIA
    )
    setNivelDor(doDia?.nivelDor ?? null)
    setLocaisDor(doDia?.locaisDor ?? [])
    setDisposicao(doDia?.disposicao ?? null)
    setObservacao(doDia?.observacao ?? '')
  }

  function alternarLocal(local: LocalDor) {
    setLocaisDor((atuais) =>
      atuais.includes(local) ? atuais.filter((l) => l !== local) : [...atuais, local]
    )
  }

  function limpar() {
    setData(dataHojeISO())
    setPeso('')
    setBalanca(BALANCA_VAZIA)
    setBalancaAberta(false)
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
      // Os campos numéricos vão como texto mesmo: a API aceita "67,5" e cuida da
      // vírgula, que é o que o teclado do celular oferece em pt-BR.
      await apiPost(caminho, { data, peso, ...balanca, nivelDor, locaisDor, disposicao, observacao })
      limpar()
      setAberto(false)
      aoSalvar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar o registro.')
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
        Registrar saúde do dia
      </button>
    )
  }

  return (
    <form className={styles.formulario} onSubmit={enviar}>
      <p className={styles.titulo}>
        <HeartPulse size={15} />
        {existente ? 'Editando o registro deste dia' : 'Novo registro'}
      </p>

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

      <fieldset className={styles.grupo}>
        <legend className={styles.rotulo}>Como ela está?</legend>
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

      {/* Recolhido por padrão: só faz sentido preencher se a turma usou a
          balança de bioimpedância nesse dia. */}
      <button
        type="button"
        className={styles.botaoSecao}
        onClick={() => setBalancaAberta((v) => !v)}
        aria-expanded={balancaAberta}
      >
        {balancaAberta ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        Dados da balança <span className={styles.opcional}>(opcional)</span>
      </button>

      {balancaAberta && (
        <div className={styles.gradeCampos}>
          {CAMPOS_BALANCA.map(({ campo, label, unidade }) => (
            <label key={campo} className={styles.campo}>
              <span className={styles.rotuloPequeno}>
                {label} {unidade && <span className={styles.opcional}>({unidade})</span>}
              </span>
              <input
                type="text"
                inputMode="decimal"
                className={styles.input}
                value={balanca[campo]}
                onChange={(e) => setBalanca({ ...balanca, [campo]: e.target.value })}
              />
            </label>
          ))}
        </div>
      )}

      <label className={styles.campo}>
        <span className={styles.rotulo}>
          Observações <span className={styles.opcional}>(opcional)</span>
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
          {salvando ? 'Salvando...' : existente ? 'Atualizar registro' : 'Salvar registro'}
        </button>
      </div>
    </form>
  )
}
