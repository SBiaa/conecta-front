'use client'

import { useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'
import { apiPatch, apiDelete } from '../lib/api'
import { redimensionarImagem } from '../lib/imagem'
import Avatar from './Avatar'
import styles from './FotoPerfil.module.css'

type Props = {
  nome: string
  fotoUrl: string | null
  aoMudar: (fotoUrl: string | null) => void
}

const TAMANHO_MAXIMO_ARQUIVO = 8 * 1024 * 1024 // 8MB — bem acima do avatar final, é só pra barrar arquivo absurdo

export default function FotoPerfil({ nome, fotoUrl, aoMudar }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  async function escolherArquivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!arquivo) return

    setErro('')

    if (!arquivo.type.startsWith('image/')) {
      setErro('Escolha um arquivo de imagem.')
      return
    }

    if (arquivo.size > TAMANHO_MAXIMO_ARQUIVO) {
      setErro('Essa imagem é grande demais.')
      return
    }

    setEnviando(true)
    try {
      const foto = await redimensionarImagem(arquivo)
      const resposta = await apiPatch<{ fotoUrl: string }>('/me/foto', { foto })
      aoMudar(resposta.fotoUrl)
    } catch {
      setErro('Não foi possível atualizar sua foto. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  async function removerFoto() {
    setErro('')
    setEnviando(true)
    try {
      await apiDelete('/me/foto')
      aoMudar(null)
    } catch {
      setErro('Não foi possível remover sua foto.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.moldura}>
        <Avatar nome={nome} fotoUrl={fotoUrl} tamanho={88} />

        <button
          type="button"
          className={styles.botaoCamera}
          aria-label="Trocar foto de perfil"
          disabled={enviando}
          onClick={() => inputRef.current?.click()}
        >
          <Camera size={16} />
        </button>

        {fotoUrl && !enviando && (
          <button
            type="button"
            className={styles.botaoRemover}
            aria-label="Remover foto de perfil"
            onClick={removerFoto}
          >
            <X size={14} />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className={styles.inputOculto}
        onChange={escolherArquivo}
      />

      {enviando && <span className={styles.status}>Enviando...</span>}
      {erro && <span className={styles.erro}>{erro}</span>}
    </div>
  )
}
