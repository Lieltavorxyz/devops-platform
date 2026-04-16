import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import NotesBox from '../components/NotesBox';
import HighlightBox from '../components/HighlightBox';
import CompareTable from '../components/CompareTable';
import CodeBlock from '../components/CodeBlock';

export default function ArgoRollouts() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">{'\uD83D\uDE80'} GitOps</div>
        <h1>Argo Rollouts</h1>
        <p>Advanced deployment strategies for Kubernetes — canary releases, blue-green deployments, and automated analysis to catch regressions before they affect all users.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'The Problem with Rolling Updates',
          body: "K8s rolling updates are all-or-nothing — you gradually replace pods but there's no traffic control. 10% of pods updated = 10% of traffic hits new version immediately, but only by accident. If the new version is broken, you've already served bad responses to some users before you notice."
        },
        {
          title: 'What Argo Rollouts Adds',
          body: 'Traffic control during deploys. Send 5% of traffic to the new version, measure error rate + latency, automatically promote or roll back based on the analysis result. Works with any ingress controller or service mesh.'
        }
      ]} />

      <Accordion title="Canary Deployment" icon={'\uD83D\uDC26'} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Canary: send a small % of traffic to the new version. Watch metrics. Gradually increase the % if healthy. Roll back if metrics degrade. Named after the canary-in-a-coal-mine — a small number of users are your canary.
        </p>
        <CodeBlock>{`apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: my-app
spec:
  replicas: 10
  strategy:
    canary:
      steps:
        - setWeight: 10          # 10% traffic to new version
        - pause: {duration: 5m}  # wait 5 minutes
        - analysis:              # run automated analysis
            templates:
              - templateName: success-rate
        - setWeight: 50          # 50% if analysis passed
        - pause: {duration: 10m}
        - setWeight: 100         # full rollout
      canaryService: my-app-canary
      stableService: my-app-stable
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app`}</CodeBlock>
        <CodeBlock>{`apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  metrics:
    - name: success-rate
      interval: 1m
      successCondition: "result[0] >= 0.99"    # 99%+ success rate
      failureLimit: 3
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(http_requests_total{status!~"5..",app="my-app-canary"}[5m]))
            /
            sum(rate(http_requests_total{app="my-app-canary"}[5m]))`}</CodeBlock>
        <HighlightBox type="tip"><strong>Analysis Template</strong> — the automated check: query Prometheus for error rate on the canary. If error rate exceeds 1%, automatically roll back.</HighlightBox>
      </Accordion>

      <Accordion title="Blue-Green Deployment" icon={'\uD83D\uDD35\uD83D\uDFE2'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Blue-green: run two identical environments. Blue is live. Green is the new version. Switch traffic atomically. If green has issues, switch back instantly.
        </p>
        <CompareTable
          headers={['Aspect', 'Blue-Green', 'Canary']}
          rows={[
            ['Traffic split', 'All-or-nothing switch', 'Gradual % increase'],
            ['Resource cost', '2x replicas during deploy', 'Small canary pod count'],
            ['Rollback speed', 'Instant — switch service selector back', 'Fast but must drain canary pods'],
            ['User impact', 'Zero — users hit one version at a time', 'Small % hit new version during test'],
            ['Best for', 'Breaking changes, DB migrations, compliance', 'Gradual feature rollout, catching regressions'],
          ]}
        />
        <HighlightBox type="warn"><strong>Blue-green gotcha:</strong> DB schema changes. If the new version requires a new DB schema, you can't switch traffic atomically — the old version won't understand the new schema. Solution: always deploy backward-compatible DB changes first (expand), then switch traffic, then remove old columns (contract). This is the expand/contract pattern.</HighlightBox>
        <NotesBox id="rollouts-bluegreen" placeholder="Did you use Argo Rollouts or just standard K8s rolling updates? Any canary or blue-green experience? What deployment strategy did your company use?" />
      </Accordion>

      <Accordion title="Traffic Management" icon={'\uD83D\uDEE3\uFE0F'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Argo Rollouts integrates with various traffic providers to control how requests are routed during a deployment.
        </p>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Ingress-based (NGINX):</span> Uses NGINX annotations to split traffic by weight between canary and stable services. Simple to set up, limited to weight-based routing.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Service Mesh (Istio):</span> Uses VirtualService to control traffic split. Supports header-based routing (e.g., send internal testers to canary). Most flexible option.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">AWS ALB Ingress:</span> Uses ALB target groups to split traffic. Native AWS integration, works well with EKS.</div>
          </li>
        </ul>
        <HighlightBox type="info">Without a traffic provider, Argo Rollouts falls back to replica-based weighting — the canary percentage is approximated by the ratio of canary to stable pods. This is less precise than true traffic splitting.</HighlightBox>
      </Accordion>

      <Accordion title="Common Interview Questions" icon={'\u26A1'}>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2753'}</span>
            <div><span className="label">"What's the difference between a rolling update and a canary deployment?"</span> — "A rolling update gradually replaces old pods with new ones but sends traffic to both old and new pods simultaneously without explicit control. A canary explicitly routes a small % of traffic (say 5%) to the new version while 95% stays on stable, then uses metrics to decide whether to proceed. Canary gives you the ability to catch regressions at small blast radius before they affect all users, and to automatically roll back if error rate or latency degrades."</div>
          </li>
          <li>
            <span className="bullet">{'\u2753'}</span>
            <div><span className="label">"When would you use blue-green over canary?"</span> — "Blue-green when I need atomic traffic switching — for example, a breaking API change where I can't have some users hit v1 and some hit v2 simultaneously. Or when a DB migration makes the schema incompatible with the old app version. Canary when I want gradual confidence-building on a new feature — send 5% of real traffic, measure real metrics, promote only if healthy."</div>
          </li>
          <li>
            <span className="bullet">{'\u2753'}</span>
            <div><span className="label">"How does the automated analysis work?"</span> — "You define an AnalysisTemplate that queries a metrics provider like Prometheus. During the canary rollout, Argo Rollouts runs the analysis at each step. If the success condition fails (e.g., error rate exceeds threshold), the rollout automatically aborts and scales the canary back to zero. No human intervention needed."</div>
          </li>
        </ul>
      </Accordion>
    </div>
  );
}
