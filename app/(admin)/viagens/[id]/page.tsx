'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Trash2, UserPlus } from 'lucide-react'
import { apiDelete, apiGet, apiPost, apiPut } from '../../../lib/api'
import {
  deInputDataHora,
  formatarDiaSemana,
  formatarHora,
  paraInputDataHora,
  type ViagemDetalhe,
} from '../../../lib/viagem'
import Avatar from '../../../components/Avatar'
import ConfirmDialog from '../../../components/ConfirmDialog'
import styles from '../viagens.module.css'

type UsuarioBusca = {
  id: string
  nome: string
  papel: 'ADMIN' | 'PROFESSOR' | 'ASSOCIADO'
  status: 'ATIVO' | 'INATIVO'
  responsavel: { id: string; nome: string } | null
}

const PAPEL: Record<string, string> = { ADMIN: 'Coordenação', PROFESSOR: 'Professora', ASSOCIADO: 'Associada' }

// Cada bloco salva sozinho e recarrega a viagem; o erro aparece no próprio bloco.
function useAcao(recarregar: () => void) {
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const executar = async (acao: () => Promise<unknown>) => {
    setErro(null)
    setOcupado(true)
    try {
      await acao()
      recarregar()
      return true
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar')
      return false
    } finally {
      setOcupado(false)
    }
  }
  return { erro, ocupado, executar }
}

function DadosDaViagem({ viagem, recarregar }: { viagem: ViagemDetalhe; recarregar: () => void }) {
  const [form, setForm] = useState({
    nome: viagem.nome,
    destino: viagem.destino ?? '',
    dataSaida: paraInputDataHora(viagem.dataSaida),
    dataRetorno: paraInputDataHora(viagem.dataRetorno),
    localSaida: viagem.localSaida ?? '',
    premio: viagem.premio ?? '',
    descricao: viagem.descricao ?? '',
    ativa: viagem.ativa,
  })
  const [salvo, setSalvo] = useState(false)
  const { erro, ocupado, executar } = useAcao(recarregar)
  const campo = (nome: keyof typeof form) => ({
    value: form[nome] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setSalvo(false)
      setForm({ ...form, [nome]: e.target.value })
    },
  })

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await executar(() =>
      apiPut(`/viagens/${viagem.id}`, {
        ...form,
        dataSaida: deInputDataHora(form.dataSaida),
        dataRetorno: deInputDataHora(form.dataRetorno),
      }),
    )
    setSalvo(ok)
  }

  return (
    <form className={styles.card} onSubmit={salvar}>
      <h2 className={styles.secaoTitulo}>Dados da viagem</h2>
      <div className={styles.grade}>
        <label className={`${styles.rotulo} ${styles.cheio}`}>
          Nome
          <input className={styles.campo} {...campo('nome')} required />
        </label>
        <label className={styles.rotulo}>
          Destino
          <input className={styles.campo} {...campo('destino')} />
        </label>
        <label className={styles.rotulo}>
          Local de saída do ônibus
          <input className={styles.campo} {...campo('localSaida')} />
        </label>
        <label className={styles.rotulo}>
          Ida
          <input type="datetime-local" className={styles.campo} {...campo('dataSaida')} />
        </label>
        <label className={styles.rotulo}>
          Volta
          <input type="datetime-local" className={styles.campo} {...campo('dataRetorno')} />
        </label>
        <label className={`${styles.rotulo} ${styles.cheio}`}>
          Prêmio do concurso de fotos
          <input className={styles.campo} placeholder="Ex.: Kit spa + 1 mês de mensalidade" {...campo('premio')} />
        </label>
        <label className={`${styles.rotulo} ${styles.cheio}`}>
          Sobre a viagem
          <textarea className={styles.campo} {...campo('descricao')} />
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={form.ativa}
            onChange={(e) => {
              setSalvo(false)
              setForm({ ...form, ativa: e.target.checked })
            }}
          />
          Viagem ativa (aparece pra quem vai)
        </label>
      </div>
      <div className={styles.rodapeForm}>
        {erro && <span className={styles.erro}>{erro}</span>}
        {salvo && <span className={styles.ok}>Salvo!</span>}
        <button className={styles.botao} disabled={ocupado}>
          {ocupado ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}

function Participantes({ viagem, recarregar }: { viagem: ViagemDetalhe; recarregar: () => void }) {
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<UsuarioBusca[]>([])
  const { erro, executar } = useAcao(recarregar)
  const jaVai = new Set(viagem.participantes.map((p) => p.id))

  useEffect(() => {
    const termo = busca.trim()
    if (termo.length < 2) return
    const timer = setTimeout(() => {
      apiGet<UsuarioBusca[]>(`/usuarios?busca=${encodeURIComponent(termo)}`)
        // Criança cadastrada como dependente não tem login: não entra na lista.
        .then((lista) => setResultados(lista.filter((u) => !u.responsavel && u.status === 'ATIVO').slice(0, 20)))
        .catch(() => setResultados([]))
    }, 300)
    return () => clearTimeout(timer)
  }, [busca])

  return (
    <section className={styles.card}>
      <h2 className={styles.secaoTitulo}>Quem vai ({viagem.participantes.length})</h2>
      <p className={styles.ajuda}>Só essas pessoas veem a área da viagem no Conecta.</p>
      <input
        className={styles.campo}
        placeholder="Buscar por nome ou CPF para adicionar"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />
      {busca.trim().length >= 2 && resultados.length > 0 && (
        <ul className={styles.resultados}>
          {resultados.map((u) => (
            <li key={u.id}>
              <button
                className={styles.resultado}
                disabled={jaVai.has(u.id)}
                onClick={() => executar(() => apiPost(`/viagens/${viagem.id}/participantes`, { usuarioIds: [u.id] }))}
              >
                <UserPlus size={18} />
                <span style={{ flex: 1 }}>{u.nome}</span>
                <small>{jaVai.has(u.id) ? 'já está na lista' : PAPEL[u.papel]}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
      {erro && <p className={styles.erro}>{erro}</p>}
      <ul className={styles.lista} style={{ gap: 0 }}>
        {viagem.participantes.map((p) => (
          <li key={p.id} className={styles.linhaLista}>
            <Avatar nome={p.nome} fotoUrl={p.fotoUrl} tamanho={32} />
            <div className={styles.linhaTexto}>
              <span className={styles.nome}>{p.nome}</span>
              <span className={styles.detalhe}>{PAPEL[p.papel] ?? p.papel}</span>
            </div>
            <button
              className={styles.botaoIcone}
              aria-label={`Tirar ${p.nome} da viagem`}
              onClick={() => executar(() => apiDelete(`/viagens/${viagem.id}/participantes/${p.id}`))}
            >
              <Trash2 size={18} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Cronograma({ viagem, recarregar }: { viagem: ViagemDetalhe; recarregar: () => void }) {
  const vazio = { inicio: '', titulo: '', local: '', observacao: '' }
  const [form, setForm] = useState(vazio)
  const { erro, ocupado, executar } = useAcao(recarregar)

  const adicionar = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await executar(() =>
      apiPost(`/viagens/${viagem.id}/eventos`, { ...form, inicio: deInputDataHora(form.inicio) }),
    )
    if (ok) setForm({ ...vazio, inicio: form.inicio })
  }

  return (
    <section className={styles.card}>
      <h2 className={styles.secaoTitulo}>Programação</h2>
      <p className={styles.ajuda}>
        Inclua a saída do ônibus como um compromisso — o próximo compromisso aparece em destaque pra todo mundo.
      </p>
      <ul className={styles.lista} style={{ gap: 0 }}>
        {viagem.eventos.map((ev) => (
          <li key={ev.id} className={styles.linhaLista}>
            <div className={styles.linhaTexto}>
              <span className={styles.nome}>
                {formatarHora(ev.inicio)} · {ev.titulo}
              </span>
              <span className={styles.detalhe} style={{ textTransform: 'capitalize' }}>
                {formatarDiaSemana(ev.inicio)}
                {ev.local ? ` · ${ev.local}` : ''}
              </span>
            </div>
            <button
              className={styles.botaoIcone}
              aria-label={`Apagar ${ev.titulo}`}
              onClick={() => executar(() => apiDelete(`/viagens/${viagem.id}/eventos/${ev.id}`))}
            >
              <Trash2 size={18} />
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={adicionar} className={styles.grade}>
        <label className={styles.rotulo}>
          Dia e hora
          <input
            type="datetime-local"
            className={styles.campo}
            value={form.inicio}
            onChange={(e) => setForm({ ...form, inicio: e.target.value })}
            required
          />
        </label>
        <label className={styles.rotulo}>
          O que acontece
          <input
            className={styles.campo}
            placeholder="Ex.: Saída do ônibus"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            required
          />
        </label>
        <label className={styles.rotulo}>
          Local (opcional)
          <input className={styles.campo} value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} />
        </label>
        <label className={styles.rotulo}>
          Observação (opcional)
          <input
            className={styles.campo}
            placeholder="Ex.: Chegar 30 min antes"
            value={form.observacao}
            onChange={(e) => setForm({ ...form, observacao: e.target.value })}
          />
        </label>
        <div className={`${styles.rodapeForm} ${styles.cheio}`}>
          {erro && <span className={styles.erro}>{erro}</span>}
          <button className={styles.botao} disabled={ocupado}>Adicionar à programação</button>
        </div>
      </form>
    </section>
  )
}

function Avisos({ viagem, recarregar }: { viagem: ViagemDetalhe; recarregar: () => void }) {
  const vazio = { titulo: '', texto: '', importante: false }
  const [form, setForm] = useState(vazio)
  const { erro, ocupado, executar } = useAcao(recarregar)

  const publicar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (await executar(() => apiPost(`/viagens/${viagem.id}/avisos`, form))) setForm(vazio)
  }

  return (
    <section className={styles.card}>
      <h2 className={styles.secaoTitulo}>Avisos</h2>
      <ul className={styles.lista} style={{ gap: 0 }}>
        {viagem.avisos.map((a) => (
          <li key={a.id} className={styles.linhaLista}>
            <div className={styles.linhaTexto}>
              <span className={styles.nome}>
                {a.importante ? '⚠️ ' : ''}
                {a.titulo}
              </span>
              <span className={styles.detalhe}>{a.texto}</span>
            </div>
            <button
              className={styles.botaoIcone}
              aria-label={`Apagar aviso ${a.titulo}`}
              onClick={() => executar(() => apiDelete(`/viagens/${viagem.id}/avisos/${a.id}`))}
            >
              <Trash2 size={18} />
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={publicar} className={styles.grade}>
        <label className={`${styles.rotulo} ${styles.cheio}`}>
          Título
          <input
            className={styles.campo}
            placeholder="Ex.: Mudou o horário do almoço"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            required
          />
        </label>
        <label className={`${styles.rotulo} ${styles.cheio}`}>
          Texto
          <textarea
            className={styles.campo}
            value={form.texto}
            onChange={(e) => setForm({ ...form, texto: e.target.value })}
            required
          />
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={form.importante}
            onChange={(e) => setForm({ ...form, importante: e.target.checked })}
          />
          Importante (fica no topo, em destaque)
        </label>
        <div className={styles.rodapeForm}>
          {erro && <span className={styles.erro}>{erro}</span>}
          <button className={styles.botao} disabled={ocupado}>Publicar aviso</button>
        </div>
      </form>
    </section>
  )
}

function Checklist({ viagem, recarregar }: { viagem: ViagemDetalhe; recarregar: () => void }) {
  const [texto, setTexto] = useState('')
  const { erro, ocupado, executar } = useAcao(recarregar)

  const adicionar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (await executar(() => apiPost(`/viagens/${viagem.id}/checklist`, { texto }))) setTexto('')
  }

  return (
    <section className={styles.card}>
      <h2 className={styles.secaoTitulo}>O que levar</h2>
      <p className={styles.ajuda}>Cada pessoa marca os próprios itens no celular.</p>
      <ul className={styles.lista} style={{ gap: 0 }}>
        {viagem.checklist.map((item) => (
          <li key={item.id} className={styles.linhaLista}>
            <span className={styles.linhaTexto}>{item.texto}</span>
            <button
              className={styles.botaoIcone}
              aria-label={`Apagar ${item.texto}`}
              onClick={() => executar(() => apiDelete(`/viagens/${viagem.id}/checklist/${item.id}`))}
            >
              <Trash2 size={18} />
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={adicionar} className={styles.linha}>
        <input
          className={styles.campo}
          placeholder="Ex.: Documento com foto"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <button className={styles.botao} disabled={ocupado || texto.trim() === ''}>Adicionar</button>
      </form>
      {erro && <p className={styles.erro}>{erro}</p>}
    </section>
  )
}

export default function OrganizarViagemPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [viagem, setViagem] = useState<ViagemDetalhe | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [apagando, setApagando] = useState(false)
  const [erroApagar, setErroApagar] = useState<string | null>(null)

  const carregar = useCallback(() => {
    apiGet<ViagemDetalhe>(`/viagens/${id}`)
      .then(setViagem)
      .catch((e: Error) => setErro(e.message))
  }, [id])

  useEffect(() => {
    carregar()
  }, [carregar])

  const apagar = async () => {
    setApagando(true)
    setErroApagar(null)
    try {
      await apiDelete(`/viagens/${id}`)
      router.push('/viagens')
    } catch (e) {
      setErroApagar(e instanceof Error ? e.message : 'Não foi possível apagar')
      setApagando(false)
    }
  }

  if (erro) return <div className={styles.pagina}><p className={styles.erro}>{erro}</p></div>
  if (!viagem) return <div className={styles.pagina}><p className={styles.mensagem}>Carregando...</p></div>

  return (
    <div className={styles.pagina}>
      <div className={styles.cabecalho}>
        <h1 className={styles.titulo}>{viagem.nome}</h1>
        <Link href={`/viagem/${viagem.id}`} className={styles.botaoSecundario}>
          Ver fotos e concurso
        </Link>
      </div>

      <DadosDaViagem viagem={viagem} recarregar={carregar} />
      <Participantes viagem={viagem} recarregar={carregar} />
      <Cronograma viagem={viagem} recarregar={carregar} />
      <Avisos viagem={viagem} recarregar={carregar} />
      <Checklist viagem={viagem} recarregar={carregar} />

      <div className={styles.rodapeForm}>
        <button className={styles.botaoSecundario} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => setConfirmando(true)}>
          Apagar viagem
        </button>
      </div>

      <ConfirmDialog
        aberto={confirmando}
        titulo="Apagar esta viagem?"
        mensagem="Programação, avisos, lista e participantes serão apagados. Se já houver fotos, a viagem não pode ser apagada — desative em vez disso."
        carregando={apagando}
        erro={erroApagar}
        onConfirmar={apagar}
        onCancelar={() => {
          setConfirmando(false)
          setErroApagar(null)
        }}
      />
    </div>
  )
}
