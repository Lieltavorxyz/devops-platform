import { useState } from 'react'

interface Props {
  children: string
  language?: string
}

export default function CodeBlock({ children, language }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const text = typeof children === 'string' ? children.replace(/<[^>]*>/g, '') : ''
    navigator.clipboard.writeText(text.trim()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="relative my-3 overflow-hidden rounded-xl border border-white/[0.07]">
      {language && (
        <div className="flex items-center justify-between border-b border-white/[0.07] bg-zinc-900 px-4 py-2">
          <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            {language}
          </span>
        </div>
      )}
      <pre
        className="overflow-x-auto bg-[#0d1117] p-4 text-[13px] leading-relaxed text-zinc-200"
        style={{ margin: 0, borderRadius: 0 }}
        dangerouslySetInnerHTML={{ __html: children }}
      />
      <button
        onClick={handleCopy}
        className={[
          'absolute right-3 top-3 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all duration-100',
          copied
            ? 'border-green-700/50 bg-green-950/60 text-green-400'
            : 'border-white/[0.08] bg-zinc-800/80 text-zinc-400 hover:border-white/[0.15] hover:text-zinc-200',
        ].join(' ')}
        style={language ? { top: '46px' } : {}}
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  )
}
