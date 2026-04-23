import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import HighlightBox from '../components/HighlightBox';
import CodeBlock from '../components/CodeBlock';
import CompareTable from '../components/CompareTable';
import { Cpu, BarChart2, Shield, Zap, Server, RefreshCw } from 'lucide-react';

export default function K8sCore() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">Container Orchestration</div>
        <h1>Kubernetes — Core Concepts</h1>
        <p>How Kubernetes scheduling, resource enforcement, RBAC, and autoscaling work under the hood — not just the YAML.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Why Kubernetes Exists',
          body: 'Containers need to be scheduled across machines, restarted on failure, scaled on demand, and updated without downtime — at scale across hundreds of nodes. Kubernetes provides a declarative API for all of this: you declare desired state, and a set of control loops continuously reconcile reality to match.'
        },
        {
          title: 'The Reconciliation Model',
          body: 'Every Kubernetes component is a control loop: observe current state, compare to desired state, take corrective action. This is why K8s is self-healing by design. The scheduler, HPA, Deployment controller, and kubelet all operate independently using this same pattern against etcd as the shared source of truth.'
        }
      ]} />

      <Accordion title="Resource Requests and Limits — The Enforcement Mechanism" icon={Cpu} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Requests and limits are not just YAML fields — they map directly to Linux cgroup settings on the node. Understanding what each actually does in the kernel is what makes you effective at debugging resource problems.
        </p>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">CPU requests (scheduling):</span> The scheduler sums CPU requests across all pods on a node and compares to the node's allocatable CPU. If there is not enough allocatable capacity, the pod stays Pending. Under-requesting means your pod gets scheduled on an overloaded node — it will compete with neighbors for real CPU.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">CPU limits (enforcement):</span> Translate to CFS (Completely Fair Scheduler) quota in cgroup. <code>limits.cpu: "500m"</code> means 50ms of CPU per 100ms period. If the container tries to burst beyond this in a 100ms window, it is throttled — slowed down, not killed. This is why a pod can show 30% average CPU usage but still be slow: the burst pattern exceeds the per-period quota.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Memory limits (enforcement):</span> Translate to <code>memory.limit_in_bytes</code> in cgroup. When exceeded, the kernel's OOM killer terminates the container immediately. Exit code 137. Unlike CPU throttling, there is no "slow down" — memory limit violation is instant death.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">QoS classes:</span> Kubernetes assigns a QoS class based on your requests/limits, which determines eviction priority during memory pressure. Guaranteed (request = limit) is evicted last. Burstable (request &lt; limit or only request set) is evicted second. BestEffort (no requests or limits) is evicted first.</div>
          </li>
        </ul>
        <CompareTable
          headers={['QoS Class', 'Condition', 'Eviction Priority', 'Use Case']}
          rows={[
            ['<strong>Guaranteed</strong>', 'All containers: request == limit for CPU and memory', 'Last to be evicted', 'Latency-sensitive services, databases'],
            ['<strong>Burstable</strong>', 'At least one container has a request or limit set', 'Middle priority', 'Most workloads'],
            ['<strong>BestEffort</strong>', 'No requests or limits on any container', 'First to be evicted', 'Batch jobs that can be restarted'],
          ]}
        />
        <HighlightBox type="warn">The CPU limits trap: a common pattern is setting CPU limit equal to CPU request to get Guaranteed QoS. This prevents any CPU bursting. For latency-sensitive services that occasionally need more CPU (garbage collection, connection storms, startup), this causes unnecessary throttling. Many production teams deliberately omit CPU limits and use only requests, relying on node-level monitoring instead.</HighlightBox>
        <CodeBlock language="yaml">
{`# A well-configured deployment with resource settings
resources:
  requests:
    cpu: 250m       # scheduling: needs 0.25 CPU available on node
    memory: 256Mi   # scheduling: needs 256MB available on node
  limits:
    # cpu omitted intentionally — allow bursting
    memory: 512Mi   # hard cap: OOMKilled if exceeded`}
        </CodeBlock>
      </Accordion>

      <Accordion title="Horizontal Pod Autoscaler — How Scaling Decisions Are Made" icon={BarChart2}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          HPA runs as a controller in the control plane. Every 15 seconds (configurable), it fetches metrics and computes the desired replica count. The formula is simple: <code>desiredReplicas = ceil(currentReplicas * (currentMetricValue / targetMetricValue))</code>.
        </p>
        <CodeBlock language="yaml">
{`apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: payments-api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payments-api
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60   # target: 60% of CPU request across pods
    - type: Resource
      resource:
        name: memory
        target:
          type: AverageValue
          averageValue: 400Mi      # scale when avg memory > 400Mi per pod
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300   # wait 5 min before scaling down
      policies:
        - type: Pods
          value: 2
          periodSeconds: 60             # remove max 2 pods per minute
    scaleUp:
      stabilizationWindowSeconds: 0    # scale up immediately
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15            # can double replica count every 15s`}
        </CodeBlock>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Metrics server requirement:</span> CPU and memory HPA requires metrics-server installed. If metrics-server is down or slow, HPA cannot make scaling decisions. Check with <code>kubectl top pods</code> — if this command fails, HPA is blind.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Stabilization window:</span> Without a scaleDown stabilization window, HPA may scale down immediately after a traffic spike subsides, causing oscillation (flapping). A 300-second window means HPA waits 5 minutes of sustained low load before scaling down.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">KEDA for event-driven scaling:</span> HPA can scale on CPU and memory only. KEDA extends this to external metrics: SQS queue depth, Kafka consumer lag, Prometheus queries, HTTP request rate, cron schedule. KEDA can also scale to zero, which HPA cannot (minimum 1).</div>
          </li>
        </ul>
      </Accordion>

      <Accordion title="RBAC — Principals, Roles, and Bindings" icon={Shield}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Kubernetes RBAC has three components: the role (what is allowed), the subject (who can do it), and the binding (connecting them). Everything is additive — there is no deny in Kubernetes RBAC. If no rule allows it, it is denied.
        </p>
        <CodeBlock language="yaml">
{`# Role: namespace-scoped permissions
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployment-manager
  namespace: payments-prod
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "patch"]
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]
---
# RoleBinding: attach the role to a group
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: payments-team-deploy
  namespace: payments-prod
subjects:
  - kind: Group
    name: payments-developers    # OIDC group from your SSO
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: deployment-manager
  apiGroup: rbac.authorization.k8s.io`}
        </CodeBlock>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">ClusterRole vs Role:</span> A Role is namespace-scoped. A ClusterRole can be namespace-scoped (via RoleBinding) or cluster-scoped (via ClusterRoleBinding). Use a ClusterRole with a RoleBinding to grant the same permissions in multiple namespaces without redefining the rules.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">ServiceAccounts for workloads:</span> Every pod that calls the Kubernetes API or uses IRSA (AWS) needs its own ServiceAccount. The default ServiceAccount in each namespace has no permissions by default but should still be avoided — giving it permissions affects every pod that does not explicitly set a ServiceAccount.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">IRSA (IAM Roles for Service Accounts):</span> The ServiceAccount is annotated with an IAM role ARN. The pod's projected token is exchanged with AWS STS via OIDC federation, returning temporary AWS credentials. No static keys in the pod. This is the correct pattern for any EKS workload that needs AWS access.</div>
          </li>
        </ul>
        <CodeBlock language="yaml">
{`# ServiceAccount with IRSA annotation
apiVersion: v1
kind: ServiceAccount
metadata:
  name: payments-worker
  namespace: payments-prod
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/payments-s3-role
---
# Deployment using the ServiceAccount
spec:
  template:
    spec:
      serviceAccountName: payments-worker   # must be explicit
      containers:
        - name: app
          image: payments-worker:v1.2.3`}
        </CodeBlock>
      </Accordion>

      <Accordion title="Pod Disruption Budgets and Availability" icon={Zap}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          PodDisruptionBudgets are the mechanism that ensures Kubernetes does not voluntarily remove too many pods at once. Without PDBs, a node drain during a cluster upgrade could evict all replicas of a deployment simultaneously.
        </p>
        <CodeBlock language="yaml">
{`apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: payments-api-pdb
spec:
  # At least 2 pods must be available during voluntary disruption
  minAvailable: 2
  # OR: at most 1 pod can be unavailable at a time
  # maxUnavailable: 1
  selector:
    matchLabels:
      app: payments-api`}
        </CodeBlock>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Voluntary vs involuntary disruption:</span> PDBs only protect against voluntary disruptions — node drains, cluster upgrades, manual evictions. They do not protect against involuntary disruptions (node crashes, OOMKills). For those, use topology spread constraints and multiple replicas.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">PDB deadlock:</span> A PDB with <code>minAvailable: 3</code> on a deployment with 3 replicas means a node drain will block forever — it cannot evict any pod without violating the PDB. Always set minAvailable below the total replica count, or use <code>maxUnavailable: 1</code> instead.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Topology spread constraints:</span> Ensure pods are distributed across nodes, AZs, or other topology domains. If all 5 replicas land on one AZ and that AZ has issues, the service is down despite having "5 replicas."</div>
          </li>
        </ul>
        <CodeBlock language="yaml">
{`# Spread pods across availability zones
spec:
  topologySpreadConstraints:
    - maxSkew: 1
      topologyKey: topology.kubernetes.io/zone
      whenUnsatisfiable: DoNotSchedule
      labelSelector:
        matchLabels:
          app: payments-api
    - maxSkew: 1
      topologyKey: kubernetes.io/hostname
      whenUnsatisfiable: ScheduleAnyway   # best effort across nodes`}
        </CodeBlock>
      </Accordion>

      <Accordion title="Probes — Readiness vs Liveness vs Startup" icon={RefreshCw}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The three probe types serve different purposes and interact with different Kubernetes mechanisms. Misconfiguring them is a common source of production incidents.
        </p>
        <CompareTable
          headers={['Probe', 'What Failure Does', 'Traffic Impact', 'When to Use']}
          rows={[
            ['<strong>Readiness</strong>', 'Removes pod from Service endpoints', 'Pod stops receiving traffic — others absorb it', 'App needs time to warm up, or has transient unavailability'],
            ['<strong>Liveness</strong>', 'Kills and restarts the container', 'Brief unavailability during restart', 'App can deadlock or enter unrecoverable state'],
            ['<strong>Startup</strong>', 'Kills container if not ready within failureThreshold * periodSeconds', 'Container never starts if startup probe never passes', 'Slow-starting apps (JVM, large model loads)'],
          ]}
        />
        <HighlightBox type="warn">Do not use the same endpoint for readiness and liveness. If your health endpoint itself is slow (e.g., DB query timeout), a failing liveness probe will kill and restart pods — making a degraded service become completely down. Readiness should gate traffic; liveness should only restart on true deadlock. Consider separate endpoints: <code>/ready</code> (deep check) and <code>/live</code> (always 200 unless deadlocked).</HighlightBox>
        <CodeBlock language="yaml">
{`livenessProbe:
  httpGet:
    path: /live      # lightweight — just confirms process is not deadlocked
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
  failureThreshold: 3   # 30 seconds of failures before restart

readinessProbe:
  httpGet:
    path: /ready     # checks DB connectivity, cache warm-up, dependencies
    port: 8080
  periodSeconds: 5
  failureThreshold: 3   # 15 seconds to remove from Service endpoints

startupProbe:
  httpGet:
    path: /live
    port: 8080
  failureThreshold: 30
  periodSeconds: 10     # allow up to 300 seconds for startup`}
        </CodeBlock>
      </Accordion>

      <Accordion title="Scheduler Internals — How Pods Get Placed" icon={Server}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The scheduler is a control loop that watches for pods with no <code>spec.nodeName</code> set. For each unscheduled pod, it runs a two-phase algorithm: filtering (which nodes are eligible?) then scoring (which eligible node is best?).
        </p>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Filtering plugins:</span> NodeResourcesFit (enough CPU/memory), TaintToleration (node taints match pod tolerations), NodeAffinity (affinity rules), VolumeBinding (PVCs can be bound on this node). A node that fails any filter is eliminated from consideration.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Scoring plugins:</span> Remaining nodes are scored. LeastAllocated prefers nodes with the most free resources. InterPodAffinity scores based on co-location preferences. The highest-scoring node wins. The scheduler writes the node name to the pod object in etcd — it does not start anything itself.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Taints and tolerations:</span> Taints mark nodes as "not for general use." Only pods with a matching toleration are scheduled there. Use for dedicated node pools (GPU nodes, spot nodes, high-memory nodes). A taint with <code>effect: NoExecute</code> also evicts existing pods without matching tolerations.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Pod Pending debugging:</span> If a pod is stuck Pending, <code>kubectl describe pod</code> shows scheduler events explaining why no node was found: "Insufficient cpu", "node(s) had taint that pod didn't tolerate", "no nodes matched pod affinity rules". Each message points to a specific constraint to relax or fix.</div>
          </li>
        </ul>
      </Accordion>
    </div>
  );
}
