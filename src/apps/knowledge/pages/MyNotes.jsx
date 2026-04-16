import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import NotesBox from '../components/NotesBox';
import HighlightBox from '../components/HighlightBox';

export default function MyNotes() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">{'\uD83D\uDCDD'} Personal</div>
        <h1>My Notes & Repo Insights</h1>
        <p>Space for your personal notes from repo review, things to remember, and interview prep observations.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Purpose',
          body: 'This page is your personal space to capture architecture decisions, real incident stories, and honest self-assessments. Fill these in from your actual work experience — they become your interview stories.'
        },
        {
          title: 'How to Use It',
          body: 'Review your work repos and fill in each section. Be specific: names, numbers, timelines. "We migrated 12 microservices to EKS over 3 months" is better than "we used Kubernetes." Interviewers remember concrete details.'
        }
      ]} />

      <Accordion title="Repo Architecture Notes" icon={'\uD83C\uDFD7\uFE0F'} defaultOpen={true}>
        <HighlightBox type="tip">
          <strong>Fill this in when repos are ready.</strong> Document the overall architecture: monorepo or multi-repo? How many environments? How many clusters? What does the deployment pipeline look like end to end?
        </HighlightBox>

        <NotesBox id="mynotes-repo-arch" placeholder="Overall architecture: what did the system look like? Monorepo or multi-repo? How many environments? How many clusters?" />
      </Accordion>

      <Accordion title="Key Architecture Decisions I Can Talk About" icon={'\uD83D\uDCA1'}>
        <HighlightBox type="info">
          <strong>List the 3-5 most important decisions made in your system and why.</strong> These are your interview stories. Frame each as: (1) What was the problem? (2) What options did we consider? (3) What did we choose and why? (4) What was the result?
        </HighlightBox>

        <NotesBox id="mynotes-arch-decisions" placeholder="List the 3-5 most important decisions made in your system and why. These are your interview stories." />
      </Accordion>

      <Accordion title="Incidents & Lessons Learned" icon={'\uD83D\uDEA8'}>
        <HighlightBox type="warn">
          <strong>Real incident stories are gold in interviews.</strong> Structure each story: (1) What was the impact? (2) How did you discover it? (3) What was your debugging process? (4) What was the root cause? (5) What changed after? Keep each to 2 minutes when speaking.
        </HighlightBox>

        <NotesBox id="mynotes-incidents" placeholder="Outages or near-misses you were involved in. What broke, how you found it, how you fixed it, what changed after." />
      </Accordion>

      <Accordion title="Things I'm Still Unsure About (to study)" icon={'\uD83D\uDCDA'}>
        <HighlightBox type="info">
          <strong>Be honest with yourself.</strong> Knowing your gaps is more valuable than pretending you know everything. These are your study targets before the next interview.
        </HighlightBox>

        <NotesBox id="mynotes-gaps" placeholder="Be honest with yourself. List the gaps. These are your study targets." />
      </Accordion>

      <Accordion title="Interview Q&A — Personal Answers to Practice" icon={'\uD83C\uDFAF'}>
        <HighlightBox type="tip">
          <strong>Practice answering these out loud, not just in your head.</strong> Write your personalized answers below, then rehearse them. Aim for 1-2 minute answers that include specific details from your experience.
        </HighlightBox>

        <NotesBox id="mynotes-tell-me-about-yourself" placeholder="'Tell me about yourself' — Write your 90-second intro. Focus on: current role, key accomplishments, why you're looking for a new opportunity." />

        <NotesBox id="mynotes-biggest-project" placeholder="'What's the most complex project you've worked on?' — Describe the system, your role, the challenges, and the outcome." />

        <NotesBox id="mynotes-why-leaving" placeholder="'Why are you looking to leave?' — Keep it positive. Focus on growth, new challenges, or the kind of engineering culture you're looking for." />
      </Accordion>
    </div>
  );
}
