import { useState } from 'react';

export default function CodeBlock({ children, language }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = typeof children === 'string'
      ? children.replace(/<[^>]*>/g, '')
      : '';
    navigator.clipboard.writeText(text.trim()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="code-wrap">
      {language && (
        <div className="code-lang">
          <span>{language}</span>
        </div>
      )}
      <pre style={language ? {borderRadius: '0 0 var(--radius) var(--radius)', marginTop: 0} : {}}
           dangerouslySetInnerHTML={{__html: children}} />
      <button
        className={`code-copy-btn${copied ? ' copied' : ''}`}
        onClick={handleCopy}
        style={language ? {} : {top: 10}}
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}
