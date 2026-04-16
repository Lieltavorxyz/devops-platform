import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import NotesBox from '../components/NotesBox';
import HighlightBox from '../components/HighlightBox';
import CompareTable from '../components/CompareTable';

export default function ArgoCD() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">{'\uD83D\uDC19'} GitOps</div>
        <h1>ArgoCD</h1>
        <p>GitOps patterns, ApplicationSets, sync strategies, and secrets — the real operational decisions.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Why GitOps / Why ArgoCD',
          body: "Git becomes the single source of truth for cluster state. No manual kubectl apply. Every change is a PR — reviewed, audited, and reversible. ArgoCD continuously reconciles what's in git with what's in the cluster."
        },
        {
          title: 'What It Solves vs. Push-Based CI',
          body: "Push-based (CI applies directly to cluster) requires cluster credentials in your CI system. Pull-based (ArgoCD pulls from git) keeps credentials inside the cluster. Better security posture, especially at scale."
        }
      ]} />

      <Accordion title="Applications & ApplicationSets" icon={'\uD83D\uDCF1'} defaultOpen={true}>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Application:</span> Watches a git path and syncs it to a target cluster/namespace. One app per service per environment is typical.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">ApplicationSet:</span> Generates multiple Applications from a template + a generator (list, git directory, cluster). Massive DRY win when you have many services or many clusters. One ApplicationSet can manage 50 services across 3 environments.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">App of Apps pattern:</span> A root Application that manages other Applications. Bootstraps an entire cluster's state from a single git commit. Used for initial cluster setup.</div>
          </li>
        </ul>
        <NotesBox id="argocd-apps" placeholder="Did you use ApplicationSets or the App of Apps pattern? How were applications organized — per team, per service? Who had access to create/modify ArgoCD applications?" />
      </Accordion>

      <Accordion title="Sync Strategies & Waves" icon={'\uD83D\uDD04'}>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Auto vs Manual sync:</span> Auto-sync means ArgoCD applies changes as soon as git changes. Manual requires human approval. In prod many teams use manual for safety — auto-sync in staging.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Self-heal:</span> Auto-sync + self-heal means ArgoCD also reverts manual changes to the cluster. Enforces GitOps strictly — good for compliance, annoying during debugging.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Sync waves:</span> Order resource creation within an Application. Annotate resources with <code>argocd.argoproj.io/sync-wave: "0"</code>. Wave 0 before wave 1. Use for: CRDs before CRs, namespaces before resources, secrets before deployments.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Resource hooks:</span> PreSync, Sync, PostSync, SyncFail hooks for running Jobs at specific points. DB migrations as PreSync hooks are a classic pattern.</div>
          </li>
        </ul>
        <NotesBox id="argocd-sync" placeholder="Auto or manual sync in prod? Did you use sync waves? Any sync issues that caused incidents?" />
      </Accordion>

      <Accordion title="Secrets Management" icon={'\uD83D\uDD11'}>
        <HighlightBox type="warn">Never store secrets in git, even encrypted. This is a common interview trap.</HighlightBox>
        <CompareTable
          headers={['Approach', 'How It Works', 'Trade-off']}
          rows={[
            ['<strong>External Secrets Operator</strong>', 'CRD syncs secrets from AWS Secrets Manager / SSM into K8s Secrets. Best practice for AWS environments.', '<span class="tag green">Preferred</span> — secrets never in git'],
            ['<strong>Sealed Secrets</strong>', 'Secrets encrypted with cluster public key, stored in git. Only the cluster can decrypt.', '<span class="tag yellow">OK</span> — still in git, harder to rotate'],
            ['<strong>Vault + Agent Injector</strong>', 'Sidecar injects secrets into pod at runtime from HashiCorp Vault.', '<span class="tag yellow">Powerful</span> but adds Vault dependency'],
            ['<strong>Plain K8s Secrets in git</strong>', 'Base64 in the repo.', '<span class="tag red">Never</span> — base64 is not encryption'],
          ]}
        />
        <NotesBox id="argocd-secrets" placeholder="Which secrets approach did your team use? ESO, Sealed Secrets, or something else? How were secrets rotated?" />
      </Accordion>

      <Accordion title="Common Interview Questions" icon={'\u26A1'}>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2753'}</span>
            <div><span className="label">"What is GitOps and why use ArgoCD?"</span> — "GitOps means git is the single source of truth for cluster state. ArgoCD is a pull-based controller that continuously reconciles what's declared in git with what's running in the cluster. Every change goes through a PR, so you get code review, audit trail, and easy rollback. Unlike push-based CI/CD, credentials stay inside the cluster."</div>
          </li>
          <li>
            <span className="bullet">{'\u2753'}</span>
            <div><span className="label">"Application vs ApplicationSet?"</span> — "An Application watches a single git path and syncs to one namespace/cluster. An ApplicationSet is a template with generators — it creates many Applications from a single definition. Use ApplicationSet when you have the same service pattern across many environments or clusters."</div>
          </li>
          <li>
            <span className="bullet">{'\u2753'}</span>
            <div><span className="label">"How do you handle secrets with ArgoCD?"</span> — "Never store secrets in git. Use External Secrets Operator to sync from AWS Secrets Manager or SSM into K8s Secrets. The ExternalSecret CRD lives in git, the actual secret value does not. ESO reconciles and creates the K8s Secret at runtime."</div>
          </li>
          <li>
            <span className="bullet">{'\u2753'}</span>
            <div><span className="label">"What are sync waves?"</span> — "Sync waves let you order resource creation within a single Application. Annotate resources with sync-wave numbers. Wave 0 deploys before wave 1. Classic use: CRDs before custom resources, namespaces before workloads, secrets before deployments that reference them."</div>
          </li>
        </ul>
      </Accordion>
    </div>
  );
}
