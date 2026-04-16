import { useState, useEffect } from 'react';

export default function NotesBox({ id, placeholder }) {
  const [val, setVal] = useState(() => sessionStorage.getItem('notes-' + id) || '');
  useEffect(() => { sessionStorage.setItem('notes-' + id, val); }, [val, id]);
  return (
    <div className="notes-box">
      <div className="notes-label">{'\uD83D\uDCDD'} My Experience</div>
      <textarea value={val} onChange={e => setVal(e.target.value)} placeholder={placeholder} style={{minHeight: 60}} />
    </div>
  );
}
