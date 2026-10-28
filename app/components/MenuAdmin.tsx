'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Rss, Users, GraduationCap, FolderKanban, Wallet, User, CalendarCheck,
  ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen, Menu, X, LayoutGrid, Tag,
  type LucideIcon,
} from 'lucide-react'
import { apiGet } from '../lib/api'
import styles from './MenuAdmin.module.css'

type Projeto = { id: number; nome: string }
type Turma = { id: number; nome: string; projetoId: number }
type ProjetoComTurmas = Projeto & { turmas: Turma[] }

type Item = { label: string; href: string; icone: LucideIcon }

const PRINCIPAL: Item[] = [
  { label: 'Home', href: '/inicio-admin', icone: Home },
  { label: 'Frequência', href: '/frequencia', icone: CalendarCheck },
  { label: 'Feed', href: '/feed', icone: Rss },
]

const GESTAO: Item[] = [
  { label: 'Associados', href: '/associados', icone: Users },
  { label: 'Professoras', href: '/professores', icone: GraduationCap },
  { label: 'Financeiro', href: '/financeiro', icone: Wallet },
  { label: 'Valores', href: '/financeiro/valores', icone: Tag },
]

const PERFIL: Item = { label: 'Perfil', href: '/perfil-admin', icone: User }

// O que aparece na barra de baixo do celular. O resto fica no botão "Menu".
const CELULAR: Item[] = [PRINCIPAL[0], PRINCIPAL[1], GESTAO[0], GESTAO[2]]

// O que a pessoa abriu/fechou fica salvo neste navegador. Se o navegador
// bloquear (modo anônimo), o menu só volta ao padrão — nada quebra.
const CHAVE = 'conecta.menu'
// fechados: grupos que a pessoa fechou (começam abertos).
// abertos: projetos que a pessoa abriu (começam fechados).
type Preferencias = { mini: boolean; fechados: string[]; abertos: string[] }

function lerPreferencias(): Preferencias {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? '')
    const lista = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [])
    return { mini: !!salvo.mini, fechados: lista(salvo.fechados), abertos: lista(salvo.abertos) }
  } catch {
    return { mini: false, fechados: [], abertos: [] }
  }
}

function salvarPreferencias(p: Preferencias) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(p))
  } catch {}
}

export default function MenuAdmin() {
  const pathname = usePathname()
  const [projetos, setProjetos] = useState<ProjetoComTurmas[]>([])
  // Os layouts só montam o menu depois de checar o login (no navegador),
  // então dá pra ler o localStorage direto na criação do estado.
  const [prefs, setPrefs] = useState<Preferencias>(lerPreferencias)
  const [gavetaAberta, setGavetaAberta] = useState(false)

  // A largura do conteúdo acompanha o menu (ver --menu-largura no globals.css).
  useEffect(() => {
    document.documentElement.dataset.menu = prefs.mini ? 'mini' : 'aberto'
    return () => {
      delete document.documentElement.dataset.menu
    }
  }, [prefs.mini])

  useEffect(() => {
    Promise.all([apiGet<Projeto[]>('/projetos'), apiGet<Turma[]>('/turmas')])
      .then(([listaProjetos, turmas]) => {
        setProjetos(
          listaProjetos.map((projeto) => ({
            ...projeto,
            turmas: turmas.filter((t) => t.projetoId === projeto.id),
          })),
        )
      })
      .catch(() => {})
  }, [])

  function atualizar(nova: Preferencias) {
    setPrefs(nova)
    salvarPreferencias(nova)
  }

  function alternar(lista: 'fechados' | 'abertos', chave: string) {
    const atual = prefs[lista]
    const nova = atual.includes(chave) ? atual.filter((c) => c !== chave) : [...atual, chave]
    atualizar({ ...prefs, [lista]: nova })
  }

  const aberto = (chave: string) => !prefs.fechados.includes(chave)
  const ativo = (href: string) => {
    // "Valores" mora dentro de /financeiro, mas tem item próprio no menu: só ele acende.
    if (href === '/financeiro' && pathname.startsWith('/financeiro/valores')) return false
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  function link(item: Item) {
    const Icone = item.icone
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`${styles.item} ${ativo(item.href) ? styles.ativo : ''}`}
        title={item.label}
      >
        <Icone size={20} />
        <span className={styles.texto}>{item.label}</span>
      </Link>
    )
  }

  function grupo(chave: string, titulo: string, conteudo: React.ReactNode) {
    return (
      <div className={styles.grupo}>
        <button type="button" className={styles.tituloGrupo} onClick={() => alternar('fechados', chave)}>
          <span>{titulo}</span>
          {aberto(chave) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {aberto(chave) && <div className={styles.itens}>{conteudo}</div>}
      </div>
    )
  }

  const blocoProjetos = (
    <>
      {projetos.map((projeto) => {
        const chave = `projeto-${projeto.id}`
        // Abre quando a pessoa clica na seta ou quando está numa turma dele.
        const dentro = projeto.turmas.some((t) => pathname.startsWith(`/turmas/${t.id}`))
        const expandido = prefs.abertos.includes(chave) || dentro
        const temTurmas = projeto.turmas.length > 0
        return (
          <div key={projeto.id}>
            <div className={styles.linhaProjeto}>
              <Link
                href={`/projetos/${projeto.id}/turmas`}
                className={`${styles.item} ${pathname.startsWith(`/projetos/${projeto.id}/`) ? styles.ativo : ''}`}
                title={projeto.nome}
              >
                <FolderKanban size={20} />
                <span className={styles.texto}>{projeto.nome}</span>
              </Link>
              {temTurmas && (
                <button
                  type="button"
                  className={styles.seta}
                  onClick={() => alternar('abertos', chave)}
                  aria-label={expandido ? `Esconder turmas de ${projeto.nome}` : `Mostrar turmas de ${projeto.nome}`}
                  aria-expanded={expandido}
                >
                  {expandido ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
            </div>
            {expandido && temTurmas && (
              <div className={styles.turmas}>
                {projeto.turmas.map((turma) => (
                  <Link
                    key={turma.id}
                    href={`/turmas/${turma.id}/alunas`}
                    className={`${styles.turma} ${pathname.startsWith(`/turmas/${turma.id}/`) ? styles.turmaAtiva : ''}`}
                  >
                    <span className={styles.ponto} />
                    <span>{turma.nome}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )
      })}
      {link({ label: 'Todos os projetos', href: '/projetos', icone: LayoutGrid })}
    </>
  )

  const conteudoMenu = (
    <>
      {grupo('principal', 'Principal', PRINCIPAL.map(link))}
      {grupo('projetos', 'Projetos', blocoProjetos)}
      {grupo('gestao', 'Gestão', GESTAO.map(link))}
      <div className={styles.rodape}>{link(PERFIL)}</div>
    </>
  )

  return (
    <>
      {/* Computador: coluna lateral */}
      <nav className={`${styles.lateral} ${prefs.mini ? styles.mini : ''}`} aria-label="Menu principal">
        <button
          type="button"
          className={styles.minimizar}
          onClick={() => atualizar({ ...prefs, mini: !prefs.mini })}
          title={prefs.mini ? 'Abrir menu' : 'Minimizar menu'}
        >
          {prefs.mini ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          <span className={styles.texto}>Minimizar menu</span>
        </button>
        {prefs.mini ? (
          // Minimizado: só os ícones, sem grupos nem turmas.
          <div className={styles.itens}>
            {PRINCIPAL.map(link)}
            {link({ label: 'Projetos', href: '/projetos', icone: FolderKanban })}
            {GESTAO.map(link)}
            <div className={styles.rodape}>{link(PERFIL)}</div>
          </div>
        ) : (
          conteudoMenu
        )}
      </nav>

      {/* Celular: barra de baixo + gaveta com o menu completo */}
      <nav className={styles.barra} aria-label="Menu principal">
        {CELULAR.map((item) => {
          const Icone = item.icone
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.botaoBarra} ${ativo(item.href) ? styles.botaoBarraAtivo : ''}`}
            >
              <Icone size={22} />
              <span>{item.label}</span>
            </Link>
          )
        })}
        <button type="button" className={styles.botaoBarra} onClick={() => setGavetaAberta(true)}>
          <Menu size={22} />
          <span>Menu</span>
        </button>
      </nav>

      {gavetaAberta && (
        <div className={styles.fundoGaveta} onClick={() => setGavetaAberta(false)}>
          <div
            className={styles.gaveta}
            role="dialog"
            aria-label="Menu"
            onClick={(e) => {
              e.stopPropagation()
              // Escolheu uma página na gaveta: fecha.
              if ((e.target as HTMLElement).closest('a')) setGavetaAberta(false)
            }}
          >
            <button type="button" className={styles.fecharGaveta} onClick={() => setGavetaAberta(false)} aria-label="Fechar menu">
              <X size={22} />
            </button>
            {conteudoMenu}
          </div>
        </div>
      )}
    </>
  )
}
