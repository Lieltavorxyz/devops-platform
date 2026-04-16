interface Card {
  title: string
  body: string
}

interface Props {
  cards: Card[]
}

export default function ReasoningMap({ cards }: Props) {
  return (
    <div className="my-6">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
        🗺️ Reasoning Map
      </h2>
      <div
        className={[
          'grid gap-3',
          cards.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2',
        ].join(' ')}
      >
        {cards.map((card, i) => (
          <div
            key={i}
            className="rounded-xl border border-white/[0.07] bg-zinc-900/60 p-4 transition-colors duration-150 hover:border-blue-500/30"
          >
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-blue-400">
              {card.title}
            </div>
            <p className="text-sm leading-relaxed text-zinc-400">{card.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
