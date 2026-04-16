import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import NotesBox from '../components/NotesBox';
import HighlightBox from '../components/HighlightBox';
import CompareTable from '../components/CompareTable';
import CodeBlock from '../components/CodeBlock';

export default function K8sPatterns() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">{'\u2638\uFE0F'} Kubernetes</div>
        <h1>Kubernetes — Patterns & Design</h1>
        <p>Architectural patterns for multi-tenancy, networking, and operational decisions at scale.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'The Problem',
          body: "A single K8s cluster serving 20 teams across 3 environments is operationally efficient but a blast radius nightmare. How do you isolate teams from each other, control resource consumption, prevent noisy-neighbour problems, and enforce security posture \u2014 without running a fleet of clusters?"
        },
        {
          title: 'The Core Tradeoffs',
          body: 'Cluster isolation (one cluster per team/env) is safest but expensive and operationally heavy. Namespace isolation inside a shared cluster is cheap but requires NetworkPolicy, RBAC, ResourceQuota, and Pod Security Standards all working together. Most companies land somewhere in between.'
        }
      ]} />

      <Accordion title="Namespace Strategy — How to Slice a Cluster" icon={'\uD83C\uDFD7\uFE0F'} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          There is no single right answer — the namespace strategy you choose should reflect your team structure, blast radius tolerance, and cost model.
        </p>
        <CompareTable
          headers={['Strategy', 'Structure', 'Best For', 'Gotcha']}
          rows={[
            ['Per-environment', 'ns: dev, staging, prod', 'Small teams, &lt;5 services', 'Dev and prod share the same cluster — any cluster-level incident affects prod'],
            ['Per-team', 'ns: team-a, team-b', 'Platform teams running internal services', 'No env isolation — team-a prod and team-a dev coexist'],
            ['Per-team-per-env', 'ns: team-a-prod, team-a-staging', 'Mid-size orgs, 5-20 teams', 'Namespace sprawl — hard to manage at 100+ namespaces without HNC'],
            ['Per-service', 'ns: payments, auth, api-gateway', 'Strict security domains', 'Very fine-grained — RBAC and NetworkPolicy explosion'],
          ]}
        />
        <HighlightBox type="tip">Real-world recommendation: Per-team-per-env is the most common pattern at growth-stage companies. Use a naming convention like <code>&lt;team&gt;-&lt;env&gt;</code> enforced by Terraform. If you have a platform team, they own a separate platform namespace.</HighlightBox>
        <CodeBlock>{`# Namespace with labels for NetworkPolicy selectors
apiVersion: v1
kind: Namespace
metadata:
  name: payments-prod
  labels:
    team: payments
    env: prod
    # Pod Security Standards label — enforced at namespace level
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/warn: restricted`}</CodeBlock>
        <NotesBox id="k8s-namespaces" placeholder="What namespace strategy did your team use? How were namespaces provisioned — manually, Terraform, ArgoCD? Any sprawl issues?" />
      </Accordion>

      <Accordion title="NetworkPolicy — Default-Deny and Surgical Allow" icon={'\uD83C\uDF10'}>
        <HighlightBox type="warn">Default K8s behaviour: All pods can talk to all pods in the cluster, across namespaces. No NetworkPolicy = fully open mesh. This is fine for dev but a security problem in prod.</HighlightBox>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          NetworkPolicy is implemented by the CNI (not kube-proxy). On EKS, you need VPC CNI with network policy support enabled — it's not on by default.
        </p>
        <CodeBlock>{`# Step 1: Default deny-all in the namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: payments-prod
spec:
  podSelector: {}          # matches ALL pods in this namespace
  policyTypes:
    - Ingress
    - Egress
---
# Step 2: Allow payments API to receive from ingress-nginx only
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-to-payments
  namespace: payments-prod
spec:
  podSelector:
    matchLabels:
      app: payments-api
  policyTypes: [Ingress]
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8080
---
# Step 3: Allow DNS (otherwise nothing resolves)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
  namespace: payments-prod
spec:
  podSelector: {}
  policyTypes: [Egress]
  egress:
    - ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53`}</CodeBlock>
        <HighlightBox type="warn">Classic gotcha: Apply default-deny, forget the DNS allow rule, every pod stops resolving hostnames. Always add the DNS egress policy.</HighlightBox>
        <HighlightBox type="tip">Namespace isolation pattern: Use <code>namespaceSelector</code> with label matching — never hardcode namespace names in the policy. This makes policies reusable across envs.</HighlightBox>
      </Accordion>

      <Accordion title="Multi-Tenancy — ResourceQuota, LimitRange & RBAC" icon={'\uD83D\uDC65'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Three resources work together to create meaningful namespace isolation. Miss any one and the isolation leaks.
        </p>
        <CodeBlock>{`# ResourceQuota — caps total resource usage in a namespace
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-a-quota
  namespace: team-a-prod
spec:
  hard:
    requests.cpu: "8"
    requests.memory: 16Gi
    limits.cpu: "16"
    limits.memory: 32Gi
    pods: "40"
    services: "10"
---
# LimitRange — sets defaults and max per-container
apiVersion: v1
kind: LimitRange
metadata:
  name: team-a-limits
  namespace: team-a-prod
spec:
  limits:
    - type: Container
      default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      max:
        cpu: "4"
        memory: 4Gi
---
# RBAC — team gets edit access to their namespace only
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-a-edit
  namespace: team-a-prod
subjects:
  - kind: Group
    name: team-a-devs
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: edit
  apiGroup: rbac.authorization.k8s.io`}</CodeBlock>
        <HighlightBox>LimitRange + ResourceQuota interaction: If you have a ResourceQuota but no LimitRange, pods without explicit resource requests will be rejected by the quota. LimitRange fills in the defaults so pods without resource specs still get admitted.</HighlightBox>
        <NotesBox id="k8s-multitenancy" placeholder="Did your team use ResourceQuotas? Who owned RBAC — platform team or individual teams? Any quota exhaustion incidents?" />
      </Accordion>

      <Accordion title="Pod Security Standards — Migration from PSP" icon={'\uD83D\uDD12'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          PodSecurityPolicy (PSP) was deprecated in K8s 1.21 and removed in 1.25. Pod Security Standards (PSS) replaced it — simpler, namespace-scoped, three levels.
        </p>
        <CompareTable
          headers={['Level', 'What It Allows', 'Use Case']}
          rows={[
            ['<strong>Privileged</strong>', 'Anything. No restrictions.', 'System components (CNI plugins, node agents like Datadog, Falco)'],
            ['<strong>Baseline</strong>', 'Most workloads. Blocks known privilege escalation vectors. No hostPath, no hostNetwork, no privileged containers.', 'Default for application namespaces'],
            ['<strong>Restricted</strong>', 'Hardened. Must run as non-root, must drop all capabilities, seccompProfile required.', 'High-security workloads, compliance environments'],
          ]}
        />
        <CodeBlock>{`# Namespace labels for Pod Security Standards
apiVersion: v1
kind: Namespace
metadata:
  name: payments-prod
  labels:
    # enforce = reject pods that violate
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: latest
    # warn = allow but show warning
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/warn-version: latest
    # audit = allow but log
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/audit-version: latest`}</CodeBlock>
        <HighlightBox type="tip">Migration path from PSP: (1) Add warn + audit labels — see what would break. (2) Fix violating workloads. (3) Switch to enforce. Never jump straight to enforce on existing namespaces.</HighlightBox>
        <HighlightBox type="warn">Restricted gotcha: Many Helm charts ship with <code>runAsRoot</code> or missing <code>seccompProfile</code>. When you enforce Restricted, these will fail to deploy. Check Helm chart values for <code>securityContext</code> overrides before enforcing.</HighlightBox>
      </Accordion>

      <Accordion title="Architecture Interview Q&A" icon={'\uD83C\uDFAF'}>
        <HighlightBox>
          <strong>Q: Design K8s multi-tenancy for 20 teams, 3 environments, shared cluster. Walk me through every layer.</strong>
          <br /><br />
          I'd start by asking: does "shared cluster" mean one cluster for all 3 envs, or one cluster per env with multiple teams? I'd push for one cluster per environment at minimum — dev/staging/prod separation at the cluster level is worth the overhead because it bounds blast radius. Within each cluster: namespace per team (team-name-env format enforced by Terraform). Each namespace gets a ResourceQuota, a LimitRange, a default-deny NetworkPolicy with surgical allow rules, and a RoleBinding to the team's OIDC group. Pod Security Standards at Baseline minimum, Restricted for prod. RBAC hierarchy: platform team has cluster-admin, team leads have edit on their namespaces, developers have view + pod exec.
        </HighlightBox>
        <HighlightBox>
          <strong>Q: A developer deploys a pod that starts consuming all CPU on a node, causing evictions. What failed and how do you prevent it?</strong>
          <br /><br />
          Root cause: missing or too-high ResourceQuota and LimitRange in that namespace. Fix is three-layered: (1) LimitRange with a sensible max CPU per container (e.g., 4 cores). (2) ResourceQuota on the namespace so the team's total CPU is bounded. (3) PodDisruptionBudgets on critical workloads so node pressure evicts best-effort pods first. Also: Karpenter should have scaled out a new node, but that doesn't help if the problem pod had no limits and consumed all resources before the new node was ready.
        </HighlightBox>
        <HighlightBox>
          <strong>Q: When would you choose separate cluster per team vs namespaces in a shared cluster?</strong>
          <br /><br />
          Separate cluster wins when: (1) Compliance requires hard network isolation (PCI DSS, HIPAA) that NetworkPolicy doesn't satisfy. (2) Teams need different K8s versions. (3) Very small number of large teams with their own infra ownership. Shared cluster wins when: 10+ small teams, central platform team owns the cluster, and operational overhead of 30+ clusters is unsustainable. The cost of 30 EKS control planes ($0.10/hr each = $2,160/month just for control planes) alone is a strong argument for consolidation.
        </HighlightBox>
      </Accordion>
    </div>
  );
}
