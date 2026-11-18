'use client'

import LayoutCompartilhado from '../components/LayoutCompartilhado'
import Feed from '../components/Feed'

export default function FeedPage() {
  return <LayoutCompartilhado>{() => <Feed />}</LayoutCompartilhado>
}
