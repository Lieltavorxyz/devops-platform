import { Ear, Check, X } from 'lucide-react';

const STOP_WORDS = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','is','are','was','were','be','been','have','has','that','this','it','its','you','your','they','their','we','our','not','no','if','as','so','do','can','will','how','what','when','where','why','which']);

function covered(point, userAnswer) {
  if (!userAnswer || userAnswer.trim().length < 10) return null; // not enough text to judge
  const answerLower = userAnswer.toLowerCase();
  const words = point.toLowerCase().match(/\b[a-z][a-z0-9-]{2,}\b/g) || [];
  const keywords = words.filter(w => !STOP_WORDS.has(w));
  if (keywords.length === 0) return null;
  const hits = keywords.filter(w => answerLower.includes(w));
  return hits.length >= Math.ceil(keywords.length * 0.4);
}

export default function KeyPointsBox({ points, userAnswer }) {
  if (!points || points.length === 0) return null;
  const hasAnswer = userAnswer && userAnswer.trim().length >= 10;
  return (
    <div className="iv-keypoints">
      <div className="iv-keypoints-head">
        <Ear size={15} strokeWidth={2} />
        <span>What the interviewer listens for</span>
        {hasAnswer && <span className="iv-keypoints-hint">based on your answer</span>}
      </div>
      <ul className="iv-keypoints-list">
        {points.map((p) => {
          const hit = covered(p, userAnswer);
          return (
            <li key={p} className={`iv-keypoint ${hit === true ? 'iv-keypoint--hit' : hit === false ? 'iv-keypoint--miss' : ''}`}>
              {hit === true  && <Check size={14} strokeWidth={2.5} className="iv-keypoint-icon iv-keypoint-icon--hit" />}
              {hit === false && <X     size={14} strokeWidth={2.5} className="iv-keypoint-icon iv-keypoint-icon--miss" />}
              {hit === null  && <Check size={14} strokeWidth={2.5} className="iv-keypoint-icon" />}
              <span>{p}</span>
            </li>
          );
        })}
      </ul>
      {hasAnswer && (
        <p className="iv-keypoints-note">
          Keyword match — not a perfect judge. Review misses and decide for yourself.
        </p>
      )}
    </div>
  );
}
