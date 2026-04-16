export default function CompareTable({ headers, rows }) {
  return (
    <table className="compare-table">
      <thead><tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((row, i) => (
        <tr key={i}>{row.map((cell, j) => <td key={j} dangerouslySetInnerHTML={{__html: cell}} />)}</tr>
      ))}</tbody>
    </table>
  );
}
