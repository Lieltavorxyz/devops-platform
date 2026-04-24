import { Ear, Check } from 'lucide-react';

export default function KeyPointsBox({ points }) {
  if (!points || points.length === 0) return null;
  return (
    <div className="iv-keypoints">
      <div className="iv-keypoints-head">
        <Ear size={15} strokeWidth={2} />
        <span>What the interviewer listens for</span>
      </div>
      <ul className="iv-keypoints-list">
        {points.map((p) => (
          <li key={p} className="iv-keypoint">
            <Check size={14} strokeWidth={2.5} />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
