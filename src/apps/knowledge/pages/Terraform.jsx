import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import NotesBox from '../components/NotesBox';

export default function Terraform() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">{'\uD83C\uDFD7\uFE0F'} Infrastructure as Code</div>
        <h1>Terraform</h1>
        <p>Understanding the decisions behind how we use Terraform — not just the syntax, but the reasoning.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Problem It Solves',
          body: "Manual cloud resource creation doesn't scale, isn't repeatable, and can't be reviewed or versioned. Terraform gives you declarative, idempotent infrastructure that can be code-reviewed, tested, and tracked in git — just like application code."
        },
        {
          title: 'The Core Value Prop',
          body: 'The plan/apply cycle. You always see what will change before it changes. This makes infrastructure changes reviewable and reduces "surprise" outages from config drift.'
        }
      ]} />

      <Accordion title="State Management" icon={'\uD83D\uDDC2\uFE0F'} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          State is Terraform's source of truth for what exists in the real world. How you manage it matters a lot at scale.
        </p>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Remote state:</span> Always use remote backends (S3 + DynamoDB for locking on AWS). Local state is fine for learning, dangerous in teams — two people applying at the same time = corruption.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">State granularity:</span> One state file per environment per service/layer. Not one giant state for everything — blast radius is too large. Not one per resource — too much overhead.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">State locking:</span> DynamoDB table prevents concurrent applies. If a lock gets stuck (crash during apply), you <code>terraform force-unlock</code> — but verify the other apply really stopped first.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Sensitive values in state:</span> Passwords and secrets end up in state even if marked <code>sensitive</code>. State files should never be readable by all engineers — use S3 bucket policies + encryption.</div>
          </li>
        </ul>
        <NotesBox id="terraform-state" placeholder="How was state organized in your team? Per service? Per environment? Any incidents related to state?" />
      </Accordion>

      <Accordion title="Module Design" icon={'\uD83D\uDCE6'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Modules are the unit of reuse in Terraform. Good module design is the difference between a maintainable codebase and a nightmare.
        </p>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">What makes a good module:</span> Single responsibility, stable interface (inputs/outputs), version-pinned. Think of it like a function — clear inputs, clear outputs, no side effects to other modules.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Module versioning:</span> Pin module source versions. <code>?ref=v1.2.3</code> in the source URL. Never use <code>?ref=main</code> in production — a module update could silently break your infra on next apply.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">When NOT to modularize:</span> If something is only used once, a module adds complexity without benefit. Modularize when you have 2+ consumers or the resource is complex enough to warrant abstraction.</div>
          </li>
        </ul>
        <NotesBox id="terraform-modules" placeholder="What modules did your team maintain? Were they internal or from the Terraform Registry? How were they versioned?" />
      </Accordion>

      <Accordion title="Common Interview Questions" icon={'\u26A1'}>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2753'}</span>
            <div><span className="label">"How do you handle drift?"</span> — <code>terraform plan</code> in CI detects it. For automated drift detection, run plan on a schedule and alert on non-empty plans. Some teams use Terraform Cloud's drift detection.</div>
          </li>
          <li>
            <span className="bullet">{'\u2753'}</span>
            <div><span className="label">"Workspaces vs. separate state files?"</span> — Workspaces share the same backend config and module code, just separate state. Good for small differences. Separate directories/repos better for environments with significant config differences or different teams owning them.</div>
          </li>
          <li>
            <span className="bullet">{'\u2753'}</span>
            <div><span className="label">"How do you test Terraform?"</span> — <code>terraform validate</code> + <code>terraform plan</code> in CI minimum. Terratest for integration testing. Checkov or tfsec for security policy checks.</div>
          </li>
          <li>
            <span className="bullet">{'\u2753'}</span>
            <div><span className="label">"What happens when a resource is deleted outside Terraform?"</span> — Next <code>plan</code> shows it as needing to be re-created. <code>terraform import</code> if you want to bring an existing resource back under management without recreating it.</div>
          </li>
        </ul>
      </Accordion>
    </div>
  );
}
