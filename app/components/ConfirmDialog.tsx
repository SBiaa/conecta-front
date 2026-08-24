'use client'

import { useEffect, useRef } from 'react'
import styles from './ConfirmDialog.module.css'

type ConfirmDialogProps = {
  aberto: boolean
  titulo: string
  mensagem: string
  confirmarLabel?: string
  carregandoLabel?: string
  cancelarLabel?: string
  perigoso?: boolean
  carregando?: boolean
  erro?: string | null
  onConfirmar: () => void
  onCancelar: () => void
}

/** Confirmação padrão pra ações destrutivas (excluir turma, gasto, post…).
 *  Substitui window.confirm() — o alerta nativo do navegador não tem estilo
 *  próprio e destoa do resto da interface bem no momento de maior risco. */
export default function ConfirmDialog({
  aberto,
  titulo,
  mensagem,
  confirmarLabel = 'Excluir',
  carregandoLabel = 'Excluindo...',
  cancelarLabel = 'Cancelar',
  perigoso = true,
  carregando = false,
  erro = null,
  onConfirmar,
  onCancelar,
}: ConfirmDialogProps) {
  const botaoCancelarRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (aberto) botaoCancelarRef.current?.focus()
  }, [aberto])

  useEffect(() => {
    if (!aberto) return
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onCancelar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [aberto, onCancelar])

  if (!aberto) return null

  return (
    <div className={styles.overlay} onClick={onCancelar}>
      <div
        className={styles.modal}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-titulo"
        onClick={(evento) => evento.stopPropagation()}
      >
        <h2 id="confirm-dialog-titulo" className={styles.titulo}>{titulo}</h2>
        <p className={styles.mensagem}>{mensagem}</p>
        {erro && <p className={styles.erro}>{erro}</p>}
        <div className={styles.acoes}>
          <button
            ref={botaoCancelarRef}
            type="button"
            className={styles.botaoCancelar}
            onClick={onCancelar}
            disabled={carregando}
          >
            {cancelarLabel}
          </button>
          <button
            type="button"
            className={perigoso ? styles.botaoPerigoso : styles.botaoConfirmar}
            onClick={onConfirmar}
            disabled={carregando}
          >
            {carregando ? carregandoLabel : confirmarLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
