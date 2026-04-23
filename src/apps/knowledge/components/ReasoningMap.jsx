export default function ReasoningMap({ cards }) {
  return (
    <div className="reasoning-map">
      <h2>Why This Exists</h2>
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
