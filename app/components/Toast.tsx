'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CircleAlert, CircleCheck } from 'lucide-react'
import styles from './Toast.module.css'

type TipoToast = 'sucesso' | 'erro'

type EstadoToast = { id: number; texto: string; tipo: TipoToast }

/** Aviso rápido que some sozinho ("Pagamento registrado", "Matrícula salva"…).
 *  Uso: const { avisar, toast } = useToast() e renderizar {toast} na página. */
export function useToast(duracaoMs = 4000) {
  const [estado, setEstado] = useState<EstadoToast | null>(null)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contador = useRef(0)

  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current)
    }
  }, [])

  const avisar = useCallback(
    (texto: string, tipo: TipoToast = 'sucesso') => {
      if (temporizador.current) clearTimeout(temporizador.current)
      contador.current += 1
      setEstado({ id: contador.current, texto, tipo })
      temporizador.current = setTimeout(() => setEstado(null), duracaoMs)
    },
    [duracaoMs]
  )

  const toast = estado ? <Toast key={estado.id} texto={estado.texto} tipo={estado.tipo} /> : null

  return { avisar, toast }
}

export default function Toast({ texto, tipo = 'sucesso' }: { texto: string; tipo?: TipoToast }) {
  return (
    <div className={styles.area}>
      <div
        className={`${styles.toast} ${tipo === 'erro' ? styles.erro : styles.sucesso}`}
        role={tipo === 'erro' ? 'alert' : 'status'}
      >
        {tipo === 'erro' ? (
          <CircleAlert size={18} aria-hidden="true" />
        ) : (
          <CircleCheck size={18} aria-hidden="true" />
        )}
        <span>{texto}</span>
      </div>
    </div>
  )
}
