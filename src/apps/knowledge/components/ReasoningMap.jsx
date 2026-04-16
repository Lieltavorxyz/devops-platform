export default function ReasoningMap({ cards }) {
  return (
    <div className="reasoning-map">
      <h2>{'\uD83D\uDDFA\uFE0F'} Reasoning Map</h2>
      <div className={`cards${cards.length === 3 ? ' three' : ''}`}>
        {cards.map((card, i) => (
          <div className="card" key={i}>
            <div className="card-title">{card.title}</div>
            <p>{card.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
