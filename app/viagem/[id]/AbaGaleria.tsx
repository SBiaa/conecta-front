'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { put } from '@vercel/blob/client'
import { Upload, Star, Trash2, X, Play } from 'lucide-react'
import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/api'
import { reduzirFoto } from '../../lib/imagem'
import type { MidiaViagem } from '../../lib/viagem'
import Avatar from '../../components/Avatar'
import ConfirmDialog from '../../components/ConfirmDialog'
import styles from './viagem.module.css'

type Envio = { nome: string; porcentagem: number }

function Estrelas({ nota, aoDarNota }: { nota: number | null | undefined; aoDarNota?: (n: number | null) => void }) {
  return (
    <div className={styles.estrelas} aria-label={nota ? `${nota} de 3 estrelas` : 'Sem nota ainda'}>
      {[1, 2, 3].map((n) => {
        const cheia = (nota ?? 0) >= n
        const icone = <Star size={aoDarNota ? 28 : 18} fill={cheia ? 'currentColor' : 'none'} />
        if (!aoDarNota) return <span key={n} className={cheia ? styles.estrelaCheia : styles.estrelaVazia}>{icone}</span>
        return (
          <button
            key={n}
            className={`${styles.botaoEstrela} ${cheia ? styles.estrelaCheia : styles.estrelaVazia}`}
            // Tocar de novo na mesma nota tira a nota.
            onClick={() => aoDarNota(nota === n ? null : n)}
            aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
          >
            {icone}
          </button>
        )
      })}
    </div>
  )
}

export default function AbaGaleria({ viagemId, ehAdmin }: { viagemId: number; ehAdmin: boolean }) {
  const [midias, setMidias] = useState<MidiaViagem[] | null>(null)
  const [soSemNota, setSoSemNota] = useState(false)
  const [envios, setEnvios] = useState<Envio[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [aberta, setAberta] = useState<MidiaViagem | null>(null)
  const [apagando, setApagando] = useState<MidiaViagem | null>(null)
  const [carregandoApagar, setCarregandoApagar] = useState(false)
  const entrada = useRef<HTMLInputElement>(null)

  const carregar = useCallback(() => {
    apiGet<MidiaViagem[]>(`/viagens/${viagemId}/midias${soSemNota ? '?semNota=1' : ''}`)
      .then(setMidias)
      .catch((e: Error) => setErro(e.message))
  }, [viagemId, soSemNota])

  useEffect(() => {
    carregar()
  }, [carregar])

  const enviarUm = async (original: File) => {
    const ehVideo = original.type.startsWith('video/')
    const arquivo = ehVideo ? original : await reduzirFoto(original)
    const atualizar = (porcentagem: number) =>
      setEnvios((lista) => lista.map((e) => (e.nome === original.name ? { ...e, porcentagem } : e)))

    const { token, pathname, tamanhoMaximo } = await apiPost<{ token: string; pathname: string; tamanhoMaximo: number }>(
      `/viagens/${viagemId}/midias/upload-token`,
      { contentType: arquivo.type, nome: arquivo.name },
    )
    if (arquivo.size > tamanhoMaximo) {
      throw new Error(`"${original.name}" é grande demais. Envie um vídeo mais curto.`)
    }

    const resultado = await put(pathname, arquivo, {
      access: 'public',
      token,
      contentType: arquivo.type,
      multipart: arquivo.size > 8 * 1024 * 1024,
      onUploadProgress: ({ percentage }) => atualizar(Math.round(percentage)),
    })

    await apiPost(`/viagens/${viagemId}/midias`, { url: resultado.url, tipo: ehVideo ? 'VIDEO' : 'FOTO' })
  }

  const aoEscolher = async (lista: FileList | null) => {
    if (!lista || lista.length === 0) return
    const arquivos = Array.from(lista)
    setErro(null)
    setEnvios(arquivos.map((a) => ({ nome: a.name, porcentagem: 0 })))

    const falhas: string[] = []
    // Um por vez: no 4G da estrada, mandar tudo junto costuma travar.
    for (const arquivo of arquivos) {
      try {
        await enviarUm(arquivo)
      } catch (e) {
        falhas.push(e instanceof Error ? e.message : `Não foi possível enviar "${arquivo.name}"`)
      }
      setEnvios((atual) => atual.filter((e) => e.nome !== arquivo.name))
    }

    if (falhas.length > 0) setErro(falhas.join(' '))
    if (entrada.current) entrada.current.value = ''
    carregar()
  }

  const darNota = async (midia: MidiaViagem, nota: number | null) => {
    setMidias((lista) => lista?.map((m) => (m.id === midia.id ? { ...m, nota } : m)) ?? null)
    setAberta((atual) => (atual?.id === midia.id ? { ...atual, nota } : atual))
    try {
      await apiPut(`/viagens/${viagemId}/midias/${midia.id}/nota`, { nota })
    } catch {
      setErro('Não foi possível salvar a nota.')
      carregar()
    }
  }

  const confirmarApagar = async () => {
    if (!apagando) return
    setCarregandoApagar(true)
    try {
      await apiDelete(`/viagens/${viagemId}/midias/${apagando.id}`)
      setApagando(null)
      setAberta(null)
      carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível apagar')
    } finally {
      setCarregandoApagar(false)
    }
  }

  return (
    <div className={styles.coluna}>
      <input
        ref={entrada}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={(e) => aoEscolher(e.target.files)}
      />
      <button
        className={styles.botaoPrincipal}
        onClick={() => entrada.current?.click()}
        disabled={envios.length > 0}
      >
        <Upload size={22} /> {envios.length > 0 ? 'Enviando...' : 'Enviar fotos ou vídeos'}
      </button>
      {!ehAdmin && (
        <p className={styles.dica}>
          A coordenação dá de 1 a 3 estrelas para cada envio. Quem somar mais estrelas ganha o prêmio!
        </p>
      )}

      {envios.map((envio) => (
        <div key={envio.nome} className={styles.envio}>
          <span className={styles.envioNome}>{envio.nome}</span>
          <div className={styles.barra}>
            <div className={styles.barraPreenchida} style={{ width: `${envio.porcentagem}%` }} />
          </div>
        </div>
      ))}

      {erro && <p className={styles.erro}>{erro}</p>}

      {ehAdmin && (
        <label className={styles.filtro}>
          <input type="checkbox" checked={soSemNota} onChange={(e) => setSoSemNota(e.target.checked)} />
          Mostrar só os que ainda não têm nota
        </label>
      )}

      {midias === null && <p className={styles.mensagem}>Carregando...</p>}
      {midias?.length === 0 && (
        <p className={styles.mensagem}>
          {soSemNota ? 'Tudo avaliado por enquanto.' : 'Ainda não tem nenhuma foto. Seja a primeira pessoa a enviar!'}
        </p>
      )}

      {midias && midias.length > 0 && (
        <ul className={styles.grade}>
          {midias.map((midia) => (
            <li key={midia.id}>
              <button className={styles.miniatura} onClick={() => setAberta(midia)} aria-label={`Abrir envio de ${midia.autor.nome}`}>
                {midia.tipo === 'FOTO' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={midia.url} alt={midia.legenda ?? `Foto de ${midia.autor.nome}`} loading="lazy" />
                ) : (
                  <>
                    <video src={`${midia.url}#t=0.1`} preload="metadata" muted playsInline />
                    <span className={styles.iconeVideo}><Play size={28} fill="currentColor" /></span>
                  </>
                )}
                {midia.nota !== undefined && (
                  <span className={styles.notaSobreposta}>
                    {midia.nota ? '★'.repeat(midia.nota) : 'sem nota'}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {aberta && (
        <div className={styles.visualizador} role="dialog" aria-modal="true" onClick={() => setAberta(null)}>
          <div className={styles.visualizadorCaixa} onClick={(e) => e.stopPropagation()}>
            <button className={styles.fechar} onClick={() => setAberta(null)} aria-label="Fechar">
              <X size={26} />
            </button>
            {aberta.tipo === 'FOTO' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={aberta.url} alt={aberta.legenda ?? ''} className={styles.midiaGrande} />
            ) : (
              <video src={aberta.url} controls autoPlay playsInline className={styles.midiaGrande} />
            )}
            <div className={styles.visualizadorRodape}>
              <div className={styles.autor}>
                <Avatar nome={aberta.autor.nome} fotoUrl={aberta.autor.fotoUrl} tamanho={36} />
                <span>{aberta.autor.nome}</span>
              </div>
              {ehAdmin ? (
                <Estrelas nota={aberta.nota} aoDarNota={(n) => darNota(aberta, n)} />
              ) : (
                aberta.nota !== undefined && <Estrelas nota={aberta.nota} />
              )}
              {aberta.podeApagar && (
                <button className={styles.botaoPerigo} onClick={() => setApagando(aberta)}>
                  <Trash2 size={18} /> Apagar
                </button>
              )}
            </div>
            {aberta.legenda && <p className={styles.legenda}>{aberta.legenda}</p>}
          </div>
        </div>
      )}

      <ConfirmDialog
        aberto={apagando !== null}
        titulo="Apagar este envio?"
        mensagem="A foto ou vídeo sai da galeria e os pontos dele saem do concurso."
        carregando={carregandoApagar}
        onConfirmar={confirmarApagar}
        onCancelar={() => setApagando(null)}
      />
    </div>
  )
}
