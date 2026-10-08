'use client'

import { useEffect, useState } from 'react'
import { apiGet, apiPatch } from '../lib/api'
import styles from './VincularResponsavel.module.css'

type Candidato = { id: string; nome: string; cpf: string | null; responsavel: { id: string } | null }

type Props = {
  usuarioId: string
  aoVincular: () => void
}

// Liga uma pessoa já cadastrada a um responsável (a criança que entrou no
// sistema como associada comum, por exemplo). Só mostra adultos que não são
// dependentes de ninguém — a API recusa o resto de qualquer forma.
export default function VincularResponsavel({ usuarioId, aoVincular }: Props) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<Candidato[]>([])
  const [erro, setErro] = useState('')

  useEffect(() => {
    const termo = busca.trim()
    if (!aberto || termo.length < 3) {
      setResultados([])
      return
    }
    const timeout = setTimeout(() => {
      apiGet<Candidato[]>(`/usuarios?papel=ASSOCIADO&busca=${encodeURIComponent(termo)}`)
        .then((lista) => setResultados(lista.filter((c) => c.id !== usuarioId && !c.responsavel)))
        .catch(() => setResultados([]))
    }, 400)
    return () => clearTimeout(timeout)
  }, [busca, aberto, usuarioId])

  async function vincular(responsavelId: string) {
    setErro('')
    try {
      await apiPatch(`/usuarios/${usuarioId}`, { responsavelId })
      setAberto(false)
      setBusca('')
      aoVincular()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível vincular.')
    }
  }

  if (!aberto) {
    return (
      <button type="button" className={styles.abrir} onClick={() => setAberto(true)}>
        Vincular a um responsável
      </button>
    )
  }

  return (
    <div className={styles.caixa}>
      <input
        type="text"
        className={styles.busca}
        placeholder="Buscar o responsável por nome ou CPF"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        autoFocus
      />
      {resultados.length > 0 && (
        <ul className={styles.lista}>
          {resultados.map((c) => (
            <li key={c.id}>
              <button type="button" className={styles.item} onClick={() => vincular(c.id)}>
                <strong>{c.nome}</strong>
                <span>{c.cpf}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {erro && <p className={styles.erro}>{erro}</p>}
      <button type="button" className={styles.cancelar} onClick={() => setAberto(false)}>
        Cancelar
      </button>
    </div>
  )
}
