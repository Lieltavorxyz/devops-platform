import { useState, useEffect } from 'react'

interface Props {
  id: string
  placeholder?: string
}

export default function NotesBox({ id, placeholder }: Props) {
  const [val, setVal] = useState(() => sessionStorage.getItem('notes-' + id) || '')
  useEffect(() => { sessionStorage.setItem('notes-' + id, val) }, [val, id])

  return (
    <div className="my-3 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 p-3 transition-colors duration-150 focus-within:border-yellow-600/50 focus-within:bg-yellow-950/10">
      <div className="mb-1.5 text-[11px] font-semibold text-zinc-500">📝 My Experience</div>
      <textarea
        value={val}
        onChange={e => setVal(e.target.value)}
        placeholder={placeholder}
        className="w-full resize-y bg-transparent text-sm leading-relaxed text-zinc-300 outline-none placeholder:text-zinc-600"
        style={{ minHeight: 60 }}
      />
    </div>
  )
}
