import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function Accordion({ title, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`accordion${open ? ' open' : ''}`}>
      <div className="accordion-header" onClick={() => setOpen(!open)}>
        <div className="accordion-title">
          {Icon && <span className="accordion-icon"><Icon size={15} strokeWidth={1.75} /></span>}
          {title}
        </div>
        <ChevronDown
          size={15}
          className="accordion-chevron"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        />
      </div>
      {open && <div className="accordion-body">{children}</div>}
    </div>
  );
}
