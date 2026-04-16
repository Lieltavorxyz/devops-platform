interface Props {
  headers: string[]
  rows: string[][]
}

export default function CompareTable({ headers, rows }: Props) {
  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-white/[0.07]">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/[0.07] bg-zinc-900/80">
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-white/[0.04] transition-colors duration-100 last:border-0 hover:bg-white/[0.02]"
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="px-4 py-3 text-zinc-300"
                  dangerouslySetInnerHTML={{ __html: cell }}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
