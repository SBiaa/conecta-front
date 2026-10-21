'use client'

import ListaImpressa from '../../../../components/ListaImpressa'

export default function ListaImpressaAdminPage() {
  return <ListaImpressa hrefVoltar={(id) => `/turmas/${id}/alunas`} />
}
