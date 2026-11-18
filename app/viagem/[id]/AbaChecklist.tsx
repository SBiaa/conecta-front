'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { apiPut } from '../../lib/api'
import type { ViagemDetalhe, ItemChecklist } from '../../lib/viagem'
import styles from './viagem.module.css'

export default function AbaChecklist({ viagem, aoMudar }: { viagem: ViagemDetalhe; aoMudar: () => void }) {
  // Marca na hora (sem esperar a API) e desfaz se der erro.
  const [itens, setItens] = useState<ItemChecklist[]>(viagem.checklist)
  const [erro, setErro] = useState<string | null>(null)

  const alternar = async (item: ItemChecklist) => {
    const marcado = !item.marcado
    setItens((lista) => lista.map((i) => (i.id === item.id ? { ...i, marcado } : i)))
    setErro(null)
    try {
      await apiPut(`/viagens/${viagem.id}/checklist/${item.id}`, { marcado })
      aoMudar()
    } catch {
      setItens((lista) => lista.map((i) => (i.id === item.id ? { ...i, marcado: !marcado } : i)))
      setErro('Não foi possível salvar. Tente de novo.')
    }
  }

  if (itens.length === 0) {
    return <p className={styles.mensagem}>A lista do que levar ainda vai ser divulgada.</p>
  }

  const feitos = itens.filter((i) => i.marcado).length

  return (
    <div className={styles.coluna}>
      <p className={styles.progressoTexto}>
        {feitos === itens.length ? 'Tudo pronto! Boa viagem 🎉' : `${feitos} de ${itens.length} itens separados`}
      </p>
      <div className={styles.barra} aria-hidden>
        <div className={styles.barraPreenchida} style={{ width: `${(feitos / itens.length) * 100}%` }} />
      </div>
      {erro && <p className={styles.erro}>{erro}</p>}
      <ul className={styles.listaSimples}>
        {itens.map((item) => (
          <li key={item.id}>
            <button
              className={`${styles.itemChecklist} ${item.marcado ? styles.itemMarcado : ''}`}
              onClick={() => alternar(item)}
              aria-pressed={item.marcado}
            >
              <span className={styles.caixa}>{item.marcado && <Check size={22} strokeWidth={3} />}</span>
              <span>{item.texto}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className={styles.dica}>Só você vê o que marcou.</p>
    </div>
  )
}
