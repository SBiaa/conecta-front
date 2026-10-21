'use client'

import ListaImpressa from '../../../../components/ListaImpressa'

export default function ListaImpressaProfessoraPage() {
  return <ListaImpressa hrefVoltar={(id) => `/turmas/${id}/chamada`} />
}
