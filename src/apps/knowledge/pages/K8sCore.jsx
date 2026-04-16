import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import NotesBox from '../components/NotesBox';
import HighlightBox from '../components/HighlightBox';

export default function K8sCore() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">{'\u2638\uFE0F'} Container Orchestration</div>
        <h1>Kubernetes — Core Concepts</h1>
        <p>The reasoning behind K8s resource decisions — what interviewers at product companies really care about.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Why Kubernetes',
          body: "Containers need to be scheduled across machines, restarted on failure, scaled up/down on demand, and updated without downtime. Kubernetes provides a declarative API for all of this \u2014 you describe the desired state, the control plane continuously reconciles reality to match."
        },
        {
          title: 'Core Design Philosophy',
          body: 'Everything in K8s is a control loop: observe current state, compare to desired state, take action. This means K8s is self-healing by design. The scheduler, HPA, and kubelets all operate this way.'
        }
      ]} />

      <Accordion title="Resource Requests & Limits" icon={'\u2696\uFE0F'} defaultOpen={true}>
        <HighlightBox type="warn">This is one of the most common topics in K8s interviews. Know it cold.</HighlightBox>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Requests:</span> What the scheduler uses to place the pod. A node needs at least this much available. Under-requesting = pods getting scheduled on overloaded nodes.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Limits:</span> What the pod is allowed to use. CPU limit = throttled (not killed). Memory limit = OOMKilled. This is a critical difference.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">QoS Classes:</span> Guaranteed (req=limit), Burstable (req&lt;limit), BestEffort (no req/limit). BestEffort pods are evicted first under pressure.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Common mistake:</span> Setting CPU limit = CPU request. This prevents bursting and causes unnecessary throttling. Many teams intentionally omit CPU limits for latency-sensitive services.</div>
          </li>
        </ul>
        <NotesBox id="k8s-resources" placeholder="How did your team handle resource tuning? Did you use VPA? Any OOMKill or throttling incidents?" />
      </Accordion>

      <Accordion title="HPA & Autoscaling" icon={'\uD83D\uDCC8'}>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">HPA:</span> Scales pods based on CPU/memory or custom metrics. Requires metrics-server. Works well for stateless services. The <code>stabilizationWindowSeconds</code> setting prevents flapping.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">KEDA:</span> Event-driven autoscaling. Can scale on queue depth (SQS, Kafka), cron schedules, HTTP request rate, and more. Can scale to zero (HPA can't go below 1).</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Cluster Autoscaler vs Karpenter:</span> CA scales node groups, requires pre-defined instance types. Karpenter is more flexible — provisions exact right-sized nodes on demand. Better for cost optimization on EKS.</div>
          </li>
        </ul>
        <NotesBox id="k8s-autoscaling" placeholder="Did you use HPA, KEDA, or both? What metrics did you scale on? Any autoscaling incidents?" />
      </Accordion>

      <Accordion title="RBAC" icon={'\uD83D\uDD10'}>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Core model:</span> Role (namespace-scoped) or ClusterRole {'\u2192'} RoleBinding/ClusterRoleBinding {'\u2192'} ServiceAccount or User. Always least-privilege.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">ServiceAccounts for apps:</span> Every app that needs to call the K8s API or AWS (via IRSA) gets its own ServiceAccount. Never use the default SA — it has no restrictions by default.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">IRSA (IAM Roles for Service Accounts):</span> Binds an AWS IAM role to a K8s ServiceAccount. The pod gets AWS credentials via projected token — no static keys needed. This is the correct pattern for EKS workloads needing AWS access.</div>
          </li>
        </ul>
        <NotesBox id="k8s-rbac" placeholder="How did your team manage RBAC? Did you use IRSA? How were service accounts provisioned — manually or via Helm/Terraform?" />
      </Accordion>

      <Accordion title="Disruption & Availability" icon={'\uD83D\uDCA5'}>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">PodDisruptionBudget (PDB):</span> Guarantees a minimum number of pods stay up during voluntary disruptions (node drain, rolling updates). Without PDB, a drain could take all replicas offline simultaneously.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Pod Anti-affinity:</span> Spreads pods across nodes/AZs. Use <code>topologySpreadConstraints</code> (newer, more flexible) or <code>podAntiAffinity</code>. Critical for any service with SLA requirements.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Readiness vs Liveness probes:</span> Readiness controls traffic routing — failing readiness = removed from Service endpoints. Liveness triggers restarts. Never use the same endpoint for both if startup time varies.</div>
          </li>
        </ul>
        <NotesBox id="k8s-disruption" placeholder="Did you use PDBs? Any incidents from missing PDBs during maintenance? How were probes configured?" />
      </Accordion>

      <Accordion title="Interview Q&A" icon={'\u26A1'}>
        <HighlightBox>
          <strong>Q: What's the difference between a CPU limit and a memory limit in Kubernetes?</strong>
          <br /><br />
          CPU limits throttle — if a container tries to use more CPU than its limit, it gets throttled (slowed down). Memory limits terminate — if a container exceeds its memory limit, the kernel kills it (OOMKilled). This is why you need to be especially careful with memory limits: set them too low and you get constant OOMKills; set them too high and you risk starving other pods. With CPU, an undersized limit just causes latency.
        </HighlightBox>
        <HighlightBox>
          <strong>Q: What happens when a node runs out of memory?</strong>
          <br /><br />
          Kubernetes evicts pods in QoS order: BestEffort first (no requests/limits), then Burstable (requests &lt; limits), then Guaranteed (requests = limits) last. The kubelet watches memory pressure and evicts when thresholds are hit. This is why setting both requests and limits is important — it determines your pod's eviction priority.
        </HighlightBox>
        <HighlightBox>
          <strong>Q: How would you troubleshoot a pod that keeps getting OOMKilled?</strong>
          <br /><br />
          First, check <code>kubectl describe pod</code> — look at the Last State section for OOMKilled exit code (137). Then check <code>kubectl top pod</code> to see actual memory usage. If the pod is legitimately using more than its limit, increase the memory limit. If it's a memory leak, fix the application. If it's a spike pattern, consider using a VPA recommendation to right-size or give more headroom.
        </HighlightBox>
      </Accordion>
    </div>
  );
}
