'use client'

import { useEffect, useState } from 'react'
import { Bus, MapPin, Megaphone } from 'lucide-react'
import { formatarDiaSemana, formatarHora, formatarDiaCurto, type ViagemDetalhe, type EventoViagem } from '../../lib/viagem'
import styles from './viagem.module.css'

const primeiraMaiuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)

// Agrupa o cronograma por dia, na ordem.
function porDia(eventos: EventoViagem[]) {
  const grupos: { dia: string; eventos: EventoViagem[] }[] = []
  for (const evento of eventos) {
    const dia = new Date(evento.inicio).toDateString()
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.dia === dia) ultimo.eventos.push(evento)
    else grupos.push({ dia, eventos: [evento] })
  }
  return grupos
}

export default function AbaInformacoes({ viagem }: { viagem: ViagemDetalhe }) {
  // A tela só é desenhada no navegador (depois de checar o login), então dá
  // pra ler o relógio direto. Atualiza a cada minuto pra o destaque andar.
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setAgora(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const proximo = viagem.eventos.find((e) => new Date(e.inicio).getTime() >= agora)

  return (
    <div className={styles.coluna}>
      {proximo && (
        <div className={styles.cardDestaque}>
          <p className={styles.destaqueRotulo}>
            <Bus size={20} /> Próximo compromisso
          </p>
          <p className={styles.destaqueTitulo}>{proximo.titulo}</p>
          <p className={styles.destaqueQuando}>
            {primeiraMaiuscula(formatarDiaSemana(proximo.inicio))} às {formatarHora(proximo.inicio)}
          </p>
          {proximo.local && (
            <p className={styles.destaqueLocal}>
              <MapPin size={18} /> {proximo.local}
            </p>
          )}
          {proximo.observacao && <p className={styles.destaqueObs}>{proximo.observacao}</p>}
        </div>
      )}

      {viagem.avisos.length > 0 && (
        <div className={styles.bloco}>
          <h2 className={styles.subtitulo}>
            <Megaphone size={20} /> Avisos
          </h2>
          <ul className={styles.listaSimples}>
            {viagem.avisos.map((aviso) => (
              <li key={aviso.id} className={`${styles.aviso} ${aviso.importante ? styles.avisoImportante : ''}`}>
                {aviso.importante && <span className={styles.seloImportante}>Importante</span>}
                <p className={styles.avisoTitulo}>{aviso.titulo}</p>
                <p className={styles.avisoTexto}>{aviso.texto}</p>
                <p className={styles.avisoRodape}>
                  {aviso.autor.nome} · {formatarDiaCurto(aviso.criadoEm)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.bloco}>
        <h2 className={styles.subtitulo}>Programação</h2>
        {viagem.eventos.length === 0 && (
          <p className={styles.mensagem}>A programação ainda vai ser divulgada.</p>
        )}
        {porDia(viagem.eventos).map((grupo) => (
          <div key={grupo.dia} className={styles.dia}>
            <h3 className={styles.diaTitulo}>{primeiraMaiuscula(formatarDiaSemana(grupo.eventos[0].inicio))}</h3>
            <ol className={styles.listaSimples}>
              {grupo.eventos.map((evento) => {
                const passou = new Date(evento.inicio).getTime() < agora
                return (
                  <li key={evento.id} className={`${styles.evento} ${passou ? styles.eventoPassado : ''}`}>
                    <span className={styles.eventoHora}>{formatarHora(evento.inicio)}</span>
                    <div>
                      <p className={styles.eventoTitulo}>{evento.titulo}</p>
                      {evento.local && <p className={styles.eventoDetalhe}>{evento.local}</p>}
                      {evento.observacao && <p className={styles.eventoDetalhe}>{evento.observacao}</p>}
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        ))}
      </div>

      {viagem.descricao && (
        <div className={styles.bloco}>
          <h2 className={styles.subtitulo}>Sobre a viagem</h2>
          <p className={styles.textoCorrido}>{viagem.descricao}</p>
        </div>
      )}
    </div>
  )
}
