import { apiGet } from './api'

export type PlanoValor = {
  aulasPorSemana: number
  valorMensal: number
  matriculasAtivas: number
}

export type ValoresProjeto = {
  id: number
  nome: string
  ativo: boolean
  taxaInscricao: number
  planos: PlanoValor[]
  matriculasSemPlano: number
}

export function buscarValoresDoProjeto(projetoId: number | string) {
  return apiGet<ValoresProjeto>(`/projetos/${projetoId}/valores`)
}

export function rotuloPlano(aulas: number) {
  return `${aulas} ${aulas === 1 ? 'aula' : 'aulas'}`
}
