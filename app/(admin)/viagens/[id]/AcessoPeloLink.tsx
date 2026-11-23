'use client'

import { useState } from 'react'
import { Copy, Link2, MessageCircle } from 'lucide-react'
import { apiDelete, apiPost } from '../../../lib/api'
import { formatarDiaCurto, linkDaViagem, type LinhaImportacao, type ViagemDetalhe } from '../../../lib/viagem'
import ConfirmDialog from '../../../components/ConfirmDialog'
import styles from '../viagens.module.css'

const PAPEL: Record<string, string> = {
  ADMIN: 'Coordenação',
  PROFESSOR: 'Professora',
  ASSOCIADO: 'Associada',
  CONVIDADO: 'Convidada',
}

function mensagemDoGrupo(viagem: ViagemDetalhe, link: string) {
  return [
    `Pessoal da viagem ${viagem.nome}!`,
    '',
    'Por este link vocês veem a programação, os avisos e a lista do que levar, e mandam as fotos e vídeos pro concurso:',
    link,
    '',
    'É só abrir e digitar o seu celular (o mesmo que vocês deram na inscrição).',
  ].join('\n')
}

// O link único mandado no grupo da viagem. Quem abre digita o celular da lista
// e entra só nesta viagem.
export function LinkDoGrupo({ viagem, recarregar }: { viagem: ViagemDetalhe; recarregar: () => void }) {
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [confirmar, setConfirmar] = useState<'trocar' | 'desligar' | null>(null)

  const executar = async (acao: () => Promise<unknown>) => {
    setOcupado(true)
    setErro(null)
    try {
      await acao()
      setConfirmar(null)
      recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar')
    } finally {
      setOcupado(false)
    }
  }

  const link = viagem.codigoAcesso ? linkDaViagem(viagem.codigoAcesso) : null
  const semCelular = viagem.participantes.filter((p) => !p.celular).length

  const copiar = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(mensagemDoGrupo(viagem, link))
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      setErro('Não deu pra copiar. Selecione o link e copie à mão.')
    }
  }

  return (
    <section className={styles.card}>
      <h2 className={styles.secaoTitulo}>Link para o grupo da viagem</h2>
      <p className={styles.ajuda}>
        Quem está na lista abre o link, digita o celular e entra só nesta viagem, sem CPF nem senha.
      </p>

      {!link && (
        <div className={styles.rodapeForm} style={{ justifyContent: 'flex-start' }}>
          <button className={styles.botao} disabled={ocupado} onClick={() => executar(() => apiPost(`/viagens/${viagem.id}/link`, {}))}>
            <Link2 size={18} /> Criar link
          </button>
        </div>
      )}

      {link && (
        <>
          <input className={styles.campo} readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Link da viagem" />
          <p className={styles.detalhe}>
            {viagem.acessoAte
              ? `Vale até ${formatarDiaCurto(viagem.acessoAte)} (uma semana depois da volta).`
              : 'Vale enquanto a viagem estiver ativa. Coloque a data da volta para ele vencer sozinho.'}
            {!viagem.ativa && ' A viagem está desativada: ninguém entra até ativar de novo.'}
          </p>
          {semCelular > 0 && (
            <p className={styles.erro}>
              {semCelular === 1 ? '1 pessoa da lista está' : `${semCelular} pessoas da lista estão`} sem celular e não
              consegue entrar pelo link. Coloque o celular na lista abaixo.
            </p>
          )}
          <div className={styles.rodapeForm} style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
            <button className={styles.botao} onClick={copiar}>
              <Copy size={18} /> {copiado ? 'Copiado!' : 'Copiar mensagem com o link'}
            </button>
            <a
              className={styles.botaoSecundario}
              href={`https://wa.me/?text=${encodeURIComponent(mensagemDoGrupo(viagem, link))}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={18} /> Mandar no WhatsApp
            </a>
            <button className={styles.botaoSecundario} onClick={() => setConfirmar('trocar')}>
              Trocar link
            </button>
            <button className={styles.botaoSecundario} onClick={() => setConfirmar('desligar')}>
              Desligar link
            </button>
          </div>
        </>
      )}
      {erro && <p className={styles.erro}>{erro}</p>}

      <ConfirmDialog
        aberto={confirmar !== null}
        titulo={confirmar === 'trocar' ? 'Trocar o link?' : 'Desligar o link?'}
        mensagem={
          confirmar === 'trocar'
            ? 'O link atual para de funcionar e quem entrou por ele sai. Depois é preciso mandar o link novo no grupo.'
            : 'Ninguém mais entra pelo link e quem entrou por ele sai. Quem tem CPF e senha continua vendo a viagem.'
        }
        confirmarLabel={confirmar === 'trocar' ? 'Trocar link' : 'Desligar'}
        perigoso
        carregando={ocupado}
        erro={erro}
        onConfirmar={() =>
          executar(() =>
            confirmar === 'trocar'
              ? apiPost(`/viagens/${viagem.id}/link`, {})
              : apiDelete(`/viagens/${viagem.id}/link`),
          )
        }
        onCancelar={() => {
          setConfirmar(null)
          setErro(null)
        }}
      />
    </section>
  )
}

type Escolha = { incluir: boolean; mesmaPessoa: boolean }

// Colar a lista de quem vai (nome e celular por linha). A API lê o texto e
// sugere quem já tem cadastro; a coordenação confere e confirma. Quem não tem
// cadastro entra como convidada, só com nome e celular.
export function ImportarLista({ viagem, recarregar }: { viagem: ViagemDetalhe; recarregar: () => void }) {
  const [texto, setTexto] = useState('')
  const [linhas, setLinhas] = useState<LinhaImportacao[] | null>(null)
  const [escolhas, setEscolhas] = useState<Escolha[]>([])
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [resultado, setResultado] = useState<string | null>(null)

  const verPrevia = async () => {
    setOcupado(true)
    setErro(null)
    setResultado(null)
    try {
      const lidas = await apiPost<LinhaImportacao[]>(`/viagens/${viagem.id}/importar/previa`, { texto })
      setLinhas(lidas)
      setEscolhas(lidas.map((l) => ({ incluir: !l.jaNaViagem, mesmaPessoa: Boolean(l.sugestao) })))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível ler a lista')
    } finally {
      setOcupado(false)
    }
  }

  const mudar = (i: number, campo: keyof Escolha, valor: boolean) =>
    setEscolhas((atual) => atual.map((e, j) => (j === i ? { ...e, [campo]: valor } : e)))

  const marcadas = escolhas.filter((e) => e.incluir).length

  const confirmar = async () => {
    if (!linhas) return
    setOcupado(true)
    setErro(null)
    try {
      const pessoas = linhas
        .map((l, i) => ({ l, e: escolhas[i] }))
        .filter(({ e }) => e.incluir)
        .map(({ l, e }) => ({
          nome: l.nome,
          celular: l.celular,
          usuarioId: e.mesmaPessoa && l.sugestao ? l.sugestao.id : null,
        }))
      const r = await apiPost<{ criados: number; vinculados: number }>(`/viagens/${viagem.id}/importar`, { pessoas })
      setResultado(
        `Pronto! ${r.vinculados} com cadastro e ${r.criados} ${r.criados === 1 ? 'convidada nova' : 'convidadas novas'}.`,
      )
      setLinhas(null)
      setTexto('')
      recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível adicionar')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <h3 className={styles.nome}>Colar a lista de quem vai</h3>
      <p className={styles.ajuda}>
        Um nome por linha, com o celular. Exemplo: <em>Maria da Silva (11) 99999-9999</em>. Também dá pra colar
        direto de uma planilha.
      </p>
      {!linhas && (
        <>
          <textarea
            className={styles.campo}
            rows={6}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={'Maria da Silva (11) 99999-9999\nJoão Souza (11) 98888-7777'}
          />
          <div className={styles.rodapeForm} style={{ justifyContent: 'flex-start' }}>
            <button className={styles.botao} disabled={ocupado || texto.trim() === ''} onClick={verPrevia}>
              {ocupado ? 'Lendo...' : 'Conferir a lista'}
            </button>
          </div>
        </>
      )}

      {linhas && (
        <>
          <p className={styles.ajuda}>
            Confira antes de adicionar. Desmarque quem não vai. Quando o Conecta achar um cadastro parecido, confirme se é
            a mesma pessoa.
          </p>
          <ul className={styles.lista} style={{ gap: 0 }}>
            {linhas.map((l, i) => (
              <li key={i} className={styles.linhaLista} style={{ alignItems: 'flex-start' }}>
                <input
                  type="checkbox"
                  checked={escolhas[i].incluir}
                  onChange={(e) => mudar(i, 'incluir', e.target.checked)}
                  aria-label={`Incluir ${l.nome}`}
                  style={{ width: 22, height: 22, marginTop: 2 }}
                />
                <div className={styles.linhaTexto}>
                  <span className={styles.nome}>{l.nome}</span>
                  <span className={styles.detalhe}>
                    {l.celular ?? <strong style={{ color: 'var(--danger)' }}>sem celular: não vai conseguir entrar pelo link</strong>}
                    {l.celularRepetido && ' · celular repetido na lista (a pessoa escolhe o nome ao entrar)'}
                    {l.jaNaViagem && ' · já está na viagem'}
                  </span>
                  {l.sugestao && (
                    <label className={styles.check} style={{ marginTop: '0.3rem' }}>
                      <input
                        type="checkbox"
                        checked={escolhas[i].mesmaPessoa}
                        onChange={(e) => mudar(i, 'mesmaPessoa', e.target.checked)}
                      />
                      É a mesma pessoa que {l.sugestao.nome} ({PAPEL[l.sugestao.papel] ?? l.sugestao.papel})
                    </label>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className={styles.rodapeForm}>
            <button className={styles.botaoSecundario} disabled={ocupado} onClick={() => setLinhas(null)}>
              Voltar e editar
            </button>
            <button className={styles.botao} disabled={ocupado || marcadas === 0} onClick={confirmar}>
              {ocupado ? 'Adicionando...' : `Adicionar ${marcadas} ${marcadas === 1 ? 'pessoa' : 'pessoas'}`}
            </button>
          </div>
        </>
      )}
      {erro && <p className={styles.erro}>{erro}</p>}
      {resultado && <p className={styles.ok}>{resultado}</p>}
    </div>
  )
}
