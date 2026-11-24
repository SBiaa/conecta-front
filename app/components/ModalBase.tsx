'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { X } from 'lucide-react'
import styles from './ModalBase.module.css'

type ModalBaseProps = {
  titulo: string
  onFechar: () => void
  /** Há alterações não salvas: clicar no fundo deixa de fechar o modal
   *  (Esc e o botão X continuam fechando, de propósito). Se não for informado,
   *  o modal considera "alterado" assim que a pessoa digita ou muda algum campo. */
  sujo?: boolean
  /** Modal mais largo, pra formulários grandes. */
  larga?: boolean
  /** Desligue enquanto outro diálogo (ex.: ConfirmDialog) estiver aberto por cima,
   *  pra o Esc fechar só o de cima. */
  escAtivo?: boolean
  children: React.ReactNode
}

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Casca padrão dos modais da coordenação: fundo escuro, título, botão de fechar,
 *  Esc fecha, foco inicial no primeiro campo e foco preso dentro do modal.
 *  O conteúdo (campos e botões) vem de quem usa, com o CSS da própria página. */
export default function ModalBase({
  titulo,
  onFechar,
  sujo,
  larga = false,
  escAtivo = true,
  children,
}: ModalBaseProps) {
  const [alteradoSozinho, setAlteradoSozinho] = useState(false)
  const temAlteracao = sujo ?? alteradoSozinho
  const idTitulo = useId()
  const caixaRef = useRef<HTMLDivElement>(null)
  const fecharRef = useRef(onFechar)
  const escAtivoRef = useRef(escAtivo)

  useEffect(() => {
    fecharRef.current = onFechar
    escAtivoRef.current = escAtivo
  })

  // Foco inicial no primeiro campo; devolve o foco pra onde estava ao fechar.
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    const caixa = caixaRef.current
    const primeiroCampo = caixa?.querySelector<HTMLElement>(
      'input:not([disabled]):not([type="checkbox"]):not([type="radio"]), select:not([disabled]), textarea:not([disabled])'
    )
    ;(primeiroCampo ?? caixa)?.focus()

    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = overflowAnterior
      anterior?.focus?.()
    }
  }, [])

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (!escAtivoRef.current) return
      if (evento.key === 'Escape') {
        evento.stopPropagation()
        fecharRef.current()
        return
      }
      if (evento.key !== 'Tab') return
      const caixa = caixaRef.current
      if (!caixa) return
      const itens = Array.from(caixa.querySelectorAll<HTMLElement>(FOCAVEIS)).filter(
        (item) => item.offsetParent !== null
      )
      if (itens.length === 0) return
      const primeiro = itens[0]
      const ultimo = itens[itens.length - 1]
      const ativo = document.activeElement
      if (evento.shiftKey && (ativo === primeiro || ativo === caixa)) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && ativo === ultimo) {
        evento.preventDefault()
        primeiro.focus()
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])

  return (
    <div
      className={styles.fundo}
      onMouseDown={(evento) => {
        // Só o clique no fundo em si (não um arrasto que começou dentro do modal).
        if (evento.target === evento.currentTarget && !temAlteracao) onFechar()
      }}
    >
      <div
        ref={caixaRef}
        className={`${styles.caixa} ${larga ? styles.larga : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        onInput={() => setAlteradoSozinho(true)}
        onChange={() => setAlteradoSozinho(true)}
      >
        <div className={styles.cabecalho}>
          <h2 id={idTitulo} className={styles.titulo}>
            {titulo}
          </h2>
          <button type="button" className={styles.fechar} onClick={onFechar} aria-label="Fechar">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
