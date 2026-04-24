import { CornerDownRight } from 'lucide-react';

export default function FollowUpCallout({ text }) {
  if (!text) return null;
  return (
    <div className="iv-followup">
      <CornerDownRight size={15} strokeWidth={2} />
      <div>
        <strong>Likely follow-up</strong>
        {text}
      </div>
    </div>
  );
}
