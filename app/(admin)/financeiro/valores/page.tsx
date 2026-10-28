'use client'

import { useEffect, useState } from 'react'
import { apiGet, apiPut } from '../../../lib/api'
import { formatarMoeda } from '../../../lib/formato'
import type { ValoresProjeto } from '../../../lib/valores'
import styles from './valores.module.css'

type LinhaPlano = { aulas: string; valor: string; matriculasAtivas: number }

type Rascunho = {
  taxa: string
  planos: LinhaPlano[]
}

type Mensagem = { tipo: 'ok' | 'erro'; texto: string }

function paraRascunho(projeto: ValoresProjeto): Rascunho {
  return {
    taxa: String(projeto.taxaInscricao),
    planos: projeto.planos.map((p) => ({
      aulas: String(p.aulasPorSemana),
      valor: String(p.valorMensal),
      matriculasAtivas: p.matriculasAtivas,
    })),
  }
}

export default function ValoresPage() {
  const [projetos, setProjetos] = useState<ValoresProjeto[] | null>(null)
  const [rascunhos, setRascunhos] = useState<Record<number, Rascunho>>({})
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState<number | null>(null)
  const [mensagens, setMensagens] = useState<Record<number, Mensagem>>({})

  useEffect(() => {
    apiGet<ValoresProjeto[]>('/projetos/valores')
      .then((lista) => {
        setProjetos(lista)
        setRascunhos(Object.fromEntries(lista.map((p) => [p.id, paraRascunho(p)])))
      })
      .catch(() => setErro('Não foi possível carregar os valores.'))
  }, [])

  function alterar(id: number, mudanca: (r: Rascunho) => Rascunho) {
    setRascunhos((atual) => ({ ...atual, [id]: mudanca(atual[id]) }))
    setMensagens((atual) => {
      const resto = { ...atual }
      delete resto[id]
      return resto
    })
  }

  function alterarPlano(id: number, indice: number, campo: 'aulas' | 'valor', valor: string) {
    alterar(id, (r) => ({
      ...r,
      planos: r.planos.map((p, i) => (i === indice ? { ...p, [campo]: valor } : p)),
    }))
  }

  async function salvar(projeto: ValoresProjeto) {
    const r = rascunhos[projeto.id]
    setSalvando(projeto.id)
    try {
      const atualizado = await apiPut<ValoresProjeto>(`/projetos/${projeto.id}/valores`, {
        taxaInscricao: r.taxa === '' ? undefined : Number(r.taxa),
        planos: r.planos.map((p) => ({
          aulasPorSemana: Number(p.aulas),
          valorMensal: p.valor === '' ? undefined : Number(p.valor),
        })),
      })
      setProjetos((lista) => lista?.map((p) => (p.id === atualizado.id ? atualizado : p)) ?? null)
      setRascunhos((atual) => ({ ...atual, [projeto.id]: paraRascunho(atualizado) }))
      setMensagens((atual) => ({ ...atual, [projeto.id]: { tipo: 'ok', texto: 'Valores salvos.' } }))
    } catch (e) {
      setMensagens((atual) => ({
        ...atual,
        [projeto.id]: { tipo: 'erro', texto: e instanceof Error ? e.message : 'Não foi possível salvar.' },
      }))
    } finally {
      setSalvando(null)
    }
  }

  return (
    <div className={styles.pagina}>
      <h1 className={styles.titulo}>Valores de cobrança</h1>
      <p className={styles.explicacao}>
        Cada projeto tem os próprios planos (aulas por semana) e a própria taxa de inscrição. Mudar um valor
        vale só para as cobranças geradas daqui em diante — as que já foram geradas não mudam.
      </p>

      {erro && <p className={styles.erro}>{erro}</p>}
      {!erro && projetos === null && <p className={styles.mensagem}>Carregando...</p>}

      {projetos?.map((projeto) => {
        const r = rascunhos[projeto.id]
        if (!r) return null
        const mensagem = mensagens[projeto.id]

        return (
          <section key={projeto.id} className={styles.card}>
            <h2 className={styles.projeto}>
              {projeto.nome}
              {!projeto.ativo && <span className={styles.inativo}> (inativo)</span>}
            </h2>

            {projeto.matriculasSemPlano > 0 && (
              <p className={styles.aviso}>
                {projeto.matriculasSemPlano}{' '}
                {projeto.matriculasSemPlano === 1
                  ? 'matrícula ativa está sem plano válido'
                  : 'matrículas ativas estão sem plano válido'}{' '}
                neste projeto. Para elas não é gerada mensalidade até o plano ser ajustado na ficha da pessoa.
              </p>
            )}

            <div className={styles.campo}>
              <label htmlFor={`taxa-${projeto.id}`}>Taxa de inscrição (R$)</label>
              <input
                id={`taxa-${projeto.id}`}
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={r.taxa}
                onChange={(e) => alterar(projeto.id, (x) => ({ ...x, taxa: e.target.value }))}
              />
            </div>

            <h3 className={styles.subtitulo}>Planos mensais</h3>

            {r.planos.length === 0 && (
              <p className={styles.mensagem}>
                Nenhum plano ainda. Sem plano não é possível matricular nem gerar mensalidade neste projeto.
              </p>
            )}

            <ul className={styles.planos}>
              {r.planos.map((plano, indice) => (
                <li key={indice} className={styles.plano}>
                  <div className={styles.campo}>
                    <label htmlFor={`aulas-${projeto.id}-${indice}`}>Aulas por semana</label>
                    <input
                      id={`aulas-${projeto.id}-${indice}`}
                      type="number"
                      min="1"
                      max="7"
                      inputMode="numeric"
                      value={plano.aulas}
                      onChange={(e) => alterarPlano(projeto.id, indice, 'aulas', e.target.value)}
                    />
                  </div>
                  <div className={styles.campo}>
                    <label htmlFor={`valor-${projeto.id}-${indice}`}>Mensalidade (R$)</label>
                    <input
                      id={`valor-${projeto.id}-${indice}`}
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={plano.valor}
                      onChange={(e) => alterarPlano(projeto.id, indice, 'valor', e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className={styles.remover}
                    onClick={() =>
                      alterar(projeto.id, (x) => ({ ...x, planos: x.planos.filter((_, i) => i !== indice) }))
                    }
                  >
                    Remover
                  </button>
                  {plano.matriculasAtivas > 0 && (
                    <span className={styles.uso}>
                      {plano.matriculasAtivas}{' '}
                      {plano.matriculasAtivas === 1 ? 'matrícula ativa' : 'matrículas ativas'} neste plano
                      {plano.valor !== '' && !isNaN(Number(plano.valor))
                        ? ` · ${formatarMoeda(Number(plano.valor))}/mês`
                        : ''}
                    </span>
                  )}
                </li>
              ))}
            </ul>

            <div className={styles.acoes}>
              <button
                type="button"
                className={styles.secundario}
                onClick={() =>
                  alterar(projeto.id, (x) => ({
                    ...x,
                    planos: [...x.planos, { aulas: '', valor: '', matriculasAtivas: 0 }],
                  }))
                }
              >
                Adicionar plano
              </button>
              <button
                type="button"
                className={styles.salvar}
                disabled={salvando === projeto.id}
                onClick={() => salvar(projeto)}
              >
                {salvando === projeto.id ? 'Salvando...' : 'Salvar valores'}
              </button>
            </div>

            {mensagem && (
              <p className={mensagem.tipo === 'ok' ? styles.sucesso : styles.erro}>{mensagem.texto}</p>
            )}
          </section>
        )
      })}
    </div>
  )
}
