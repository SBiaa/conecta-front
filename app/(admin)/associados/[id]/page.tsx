'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CirclePlus } from 'lucide-react'
import { apiGet, apiPatch } from '../../../lib/api'
import styles from './perfil.module.css'

type FormaPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO'

type Matricula = {
  id: string
  ativa: boolean
  dataInicio: string
  exameMedico: 'APTO' | 'NAO_APTO' | 'AGUARDANDO' | null
  turma: {
    id: string
    nome: string
    horario: string | null
    dias: string[]
    projeto: { id: string; nome: string }
  }
}

type Associado = {
  id: string
  nome: string
  cpf: string
  email: string | null
  telefone: string | null
  status: 'ATIVO' | 'INATIVO'
  rg: string | null
  dataNascimento: string | null
  tomaMedicamento: boolean | null
  qualMedicamento: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  matriculas: Matricula[]
}

type Pagamento = {
  id: string
  valor: string
  status: 'PAGA' | 'PENDENTE'
  mesReferencia: string
  vencimento: string
  formaPagamento: FormaPagamento | null
  matricula: {
    usuario: { nome: string }
    turma: { nome: string; projeto: { nome: string } }
  }
}

type PagamentoParaRegistrar = {
  id: string
  valor: string
}

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const LABELS_DIA: Record<string, string> = {
  SEGUNDA: 'Seg',
  TERCA: 'Ter',
  QUARTA: 'Qua',
  QUINTA: 'Qui',
  SEXTA: 'Sex',
  SABADO: 'Sáb',
  DOMINGO: 'Dom',
}

const LABELS_EXAME: Record<string, string> = {
  APTO: 'Apto',
  NAO_APTO: 'Não apto',
  AGUARDANDO: 'Aguardando',
}

const LABELS_FORMA: Record<FormaPagamento, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  CARTAO: 'Cartão',
}

function formatarMes(mes: string) {
  const [ano, mesNumero] = mes.split('-')
  return `${NOMES_MESES[Number(mesNumero) - 1]} ${ano}`
}

function formatarData(data: string | null) {
  if (!data) return '—'
  const d = new Date(data)
  return d.toLocaleDateString('pt-BR')
}

function formatarMoeda(valor: string) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function dataHojeISO() {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function montarEndereco(a: Associado): string | null {
  const partes: string[] = []
  if (a.logradouro) {
    let linha = a.logradouro
    if (a.numero) linha += `, ${a.numero}`
    if (a.complemento) linha += ` — ${a.complemento}`
    partes.push(linha)
  }
  if (a.bairro) partes.push(a.bairro)
  if (a.cidade || a.uf) {
    partes.push([a.cidade, a.uf].filter(Boolean).join('/'))
  }
  if (a.cep) partes.push(`CEP ${a.cep}`)
  return partes.length > 0 ? partes.join(', ') : null
}

export default function PerfilAssociadoPage() {
  const { id } = useParams<{ id: string }>()

  const [associado, setAssociado] = useState<Associado | null>(null)
  const [carregandoAssociado, setCarregandoAssociado] = useState(true)
  const [erroAssociado, setErroAssociado] = useState('')

  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [carregandoPagamentos, setCarregandoPagamentos] = useState(true)

  const [pagamentoSelecionado, setPagamentoSelecionado] = useState<PagamentoParaRegistrar | null>(null)
  const [formaPagamentoModal, setFormaPagamentoModal] = useState<FormaPagamento>('DINHEIRO')
  const [dataPagamentoModal, setDataPagamentoModal] = useState('')
  const [valorModal, setValorModal] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erroModal, setErroModal] = useState('')

  useEffect(() => {
    apiGet<Associado>(`/usuarios/${id}`)
      .then(setAssociado)
      .catch(() => setErroAssociado('Associado não encontrado'))
      .finally(() => setCarregandoAssociado(false))
  }, [id])

  function buscarPagamentos() {
    setCarregandoPagamentos(true)
    return apiGet<Pagamento[]>(`/pagamentos?usuarioId=${id}`)
      .then(setPagamentos)
      .finally(() => setCarregandoPagamentos(false))
  }

  useEffect(() => {
    buscarPagamentos()
  }, [id])

  function abrirModal(pagamento: PagamentoParaRegistrar) {
    setPagamentoSelecionado(pagamento)
    setFormaPagamentoModal('DINHEIRO')
    setDataPagamentoModal(dataHojeISO())
    setValorModal(pagamento.valor)
    setErroModal('')
  }

  function fecharModal() {
    setPagamentoSelecionado(null)
  }

  async function confirmarRegistro() {
    if (!pagamentoSelecionado) return
    setEnviando(true)
    setErroModal('')
    try {
      await apiPatch(`/pagamentos/${pagamentoSelecionado.id}/pagar`, {
        dataPagamento: dataPagamentoModal,
        formaPagamento: formaPagamentoModal,
        valor: Number(valorModal),
      })
      await buscarPagamentos()
      fecharModal()
    } catch {
      setErroModal('Não foi possível registrar o pagamento')
    } finally {
      setEnviando(false)
    }
  }

  if (carregandoAssociado) {
    return <div className={styles.pagina}><p className={styles.mensagem}>Carregando...</p></div>
  }

  if (erroAssociado || !associado) {
    return <div className={styles.pagina}><p className={styles.erro}>{erroAssociado || 'Erro ao carregar associado'}</p></div>
  }

  const endereco = montarEndereco(associado)

  return (
    <div className={styles.pagina}>
      <h1 className={styles.titulo}>{associado.nome}</h1>

      {/* Bloco 1 — Dados pessoais */}
      <div className={styles.card}>
        <h2 className={styles.subtitulo}>Dados pessoais</h2>

        <dl className={styles.grade}>
          <div className={styles.campo}>
            <dt>CPF</dt>
            <dd>{associado.cpf}</dd>
          </div>
          <div className={styles.campo}>
            <dt>Telefone</dt>
            <dd>{associado.telefone || '—'}</dd>
          </div>
          <div className={styles.campo}>
            <dt>RG</dt>
            <dd>{associado.rg || '—'}</dd>
          </div>
          <div className={styles.campo}>
            <dt>Data de nascimento</dt>
            <dd>{formatarData(associado.dataNascimento)}</dd>
          </div>
          <div className={`${styles.campo} ${styles.campoLargo}`}>
            <dt>Endereço</dt>
            <dd>{endereco || '—'}</dd>
          </div>
          <div className={`${styles.campo} ${styles.campoLargo}`}>
            <dt>Medicamento</dt>
            <dd>
              {associado.tomaMedicamento === true
                ? `Toma medicamento: ${associado.qualMedicamento || '—'}`
                : associado.tomaMedicamento === false
                ? 'Não toma medicamento'
                : '—'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Bloco 2 — Matrículas */}
      <div className={styles.card}>
        <h2 className={styles.subtitulo}>Matrículas</h2>

        {associado.matriculas.length === 0 ? (
          <p className={styles.mensagem}>Nenhuma matrícula</p>
        ) : (
          <ul className={styles.listaMatriculas}>
            {associado.matriculas.map((matricula) => (
              <li key={matricula.id} className={styles.itemMatricula}>
                <div className={styles.infoMatricula}>
                  <span className={styles.nomeProjeto}>{matricula.turma.projeto.nome}</span>
                  <span className={styles.nomeTurma}>{matricula.turma.nome}</span>
                  {matricula.turma.horario && (
                    <span className={styles.detalhe}>{matricula.turma.horario}</span>
                  )}
                  {matricula.turma.dias.length > 0 && (
                    <span className={styles.detalhe}>
                      {matricula.turma.dias.map((d) => LABELS_DIA[d] ?? d).join(', ')}
                    </span>
                  )}
                </div>
                <div className={styles.badgesMatricula}>
                  {matricula.exameMedico && (
                    <span className={`${styles.badge} ${styles[`exame${matricula.exameMedico}`]}`}>
                      {LABELS_EXAME[matricula.exameMedico]}
                    </span>
                  )}
                  <span className={`${styles.badge} ${matricula.ativa ? styles.badgeAtiva : styles.badgeInativa}`}>
                    {matricula.ativa ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Bloco 3 — Extrato de pagamentos */}
      <div className={styles.card}>
        <h2 className={styles.subtitulo}>Extrato de pagamentos</h2>

        {carregandoPagamentos && <p className={styles.mensagem}>Carregando pagamentos...</p>}

        {!carregandoPagamentos && pagamentos.length === 0 && (
          <p className={styles.mensagem}>Nenhum pagamento encontrado</p>
        )}

        {!carregandoPagamentos && pagamentos.length > 0 && (
          <ul className={styles.listaPagamentos}>
            {pagamentos.map((pagamento) => (
              <li key={pagamento.id} className={styles.itemPagamento}>
                <div className={styles.infoPagamento}>
                  <span className={styles.mesPagamento}>{formatarMes(pagamento.mesReferencia)}</span>
                  <span className={styles.detalhe}>
                    {pagamento.matricula.turma.projeto.nome} — {pagamento.matricula.turma.nome}
                  </span>
                  <span className={styles.detalhe}>
                    Vencimento: {formatarData(pagamento.vencimento)}
                    {pagamento.formaPagamento && ` · ${LABELS_FORMA[pagamento.formaPagamento]}`}
                  </span>
                </div>
                <div className={styles.acoesPagamento}>
                  <span className={styles.valorPagamento}>{formatarMoeda(pagamento.valor)}</span>
                  <span
                    className={`${styles.statusBadge} ${
                      pagamento.status === 'PAGA' ? styles.statusPaga : styles.statusPendente
                    }`}
                  >
                    {pagamento.status === 'PAGA' ? 'Paga' : 'Pendente'}
                  </span>
                  {pagamento.status === 'PENDENTE' && (
                    <button
                      className={styles.botaoRegistrar}
                      onClick={() => abrirModal({ id: pagamento.id, valor: pagamento.valor })}
                      title="Registrar pagamento"
                    >
                      <CirclePlus size={20} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal registrar pagamento */}
      {pagamentoSelecionado && (
        <div className={styles.overlay} onClick={fecharModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitulo}>Registrar pagamento</h3>

            <div className={styles.campo}>
              <label htmlFor="formaPagamento">Forma de pagamento</label>
              <select
                id="formaPagamento"
                value={formaPagamentoModal}
                onChange={(e) => setFormaPagamentoModal(e.target.value as FormaPagamento)}
              >
                <option value="DINHEIRO">Dinheiro</option>
                <option value="PIX">Pix</option>
                <option value="CARTAO">Cartão</option>
              </select>
            </div>

            <div className={styles.campo}>
              <label htmlFor="dataPagamento">Data do pagamento</label>
              <input
                type="date"
                id="dataPagamento"
                value={dataPagamentoModal}
                onChange={(e) => setDataPagamentoModal(e.target.value)}
              />
            </div>

            <div className={styles.campo}>
              <label htmlFor="valorPago">Valor</label>
              <input
                type="number"
                id="valorPago"
                value={valorModal}
                onChange={(e) => setValorModal(e.target.value)}
              />
            </div>

            {erroModal && <p className={styles.erroModal}>{erroModal}</p>}

            <div className={styles.acoesModal}>
              <button className={styles.botaoCancelar} onClick={fecharModal}>
                Cancelar
              </button>
              <button className={styles.botaoConfirmar} onClick={confirmarRegistro} disabled={enviando}>
                {enviando ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
