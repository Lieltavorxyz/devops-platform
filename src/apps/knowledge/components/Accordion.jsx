import { useState } from 'react';

export default function Accordion({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`accordion${open ? ' open' : ''}`}>
      <div className="accordion-header" onClick={() => setOpen(!open)}>
        <div className="accordion-title">
          <span className="accordion-icon">{icon}</span>
          {title}
        </div>
        <span className="accordion-chevron">{'\u25BC'}</span>
      </div>
      {open && <div className="accordion-body">{children}</div>}
    </div>
  );
}
