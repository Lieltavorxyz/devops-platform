import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import HighlightBox from '../components/HighlightBox';
import CodeBlock from '../components/CodeBlock';
import CompareTable from '../components/CompareTable';
import { Cpu, TrendingDown, Settings, AlertTriangle, Zap, Server } from 'lucide-react';

export default function Karpenter() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">Kubernetes</div>
        <h1>Karpenter</h1>
        <p>How Karpenter provisions EC2 nodes on demand, why it beats Cluster Autoscaler for cost and speed, and how to configure NodePools and disruption correctly.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Problem with Cluster Autoscaler',
          body: 'Cluster Autoscaler scales Auto Scaling Groups, which means you need a separate node group for each instance type you might want. It cannot pick the right instance type on demand — it can only scale groups you pre-defined. Provisioning takes 2-3 minutes: ASG → EC2 launch → kubelet registration.'
        },
        {
          title: 'How Karpenter Works',
          body: 'Karpenter watches for unschedulable pods, evaluates their requirements (CPU, memory, GPU, architecture, capacity type), and calls the EC2 Fleet API directly to launch the optimal instance. No ASG involved. Nodes appear in 30-60 seconds. It can choose from hundreds of instance types per NodePool.'
        },
        {
          title: 'Consolidation',
          body: 'Beyond provisioning, Karpenter actively optimizes: it identifies underutilized nodes whose pods can fit elsewhere, cordons them, drains pods to other nodes, and terminates the empty nodes. This automated bin-packing reduces waste without manual intervention.'
        }
      ]} />

      <Accordion title="NodePool and EC2NodeClass — Core Configuration" icon={Settings} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Karpenter's two CRDs: <code>NodePool</code> defines scheduling requirements and constraints. <code>EC2NodeClass</code> defines AWS-specific configuration (AMI, subnet, security groups, instance profile). They reference each other.
        </p>
        <CodeBlock language="yaml">
{`apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: default
spec:
  template:
    metadata:
      labels:
        node-type: general
    spec:
      nodeClassRef:
        apiVersion: karpenter.k8s.aws/v1
        kind: EC2NodeClass
        name: default
      requirements:
        - key: kubernetes.io/arch
          operator: In
          values: ["amd64"]
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["spot", "on-demand"]   # prefer spot, EC2 falls back to on-demand
        - key: karpenter.k8s.aws/instance-category
          operator: In
          values: ["c", "m", "r"]         # compute, general, memory-optimized
        - key: karpenter.k8s.aws/instance-generation
          operator: Gt
          values: ["3"]                   # 4th gen+ only — better perf/cost ratio
        - key: karpenter.k8s.aws/instance-size
          operator: NotIn
          values: ["nano", "micro", "small", "medium"]  # min xlarge for prod
  limits:
    cpu: "1000"                           # total CPU cap across all Karpenter nodes
    memory: 4000Gi
  disruption:
    consolidationPolicy: WhenUnderutilized
    consolidateAfter: 30s
    expireAfter: 720h                     # rotate nodes every 30 days (fresh AMIs)
---
apiVersion: karpenter.k8s.aws/v1
kind: EC2NodeClass
metadata:
  name: default
spec:
  amiFamily: AL2023                       # Amazon Linux 2023 — recommended
  role: "KarpenterNodeRole-my-cluster"    # EC2 instance profile role
  subnetSelectorTerms:
    - tags:
        karpenter.sh/discovery: "my-cluster"   # Karpenter finds subnets by tag
  securityGroupSelectorTerms:
    - tags:
        karpenter.sh/discovery: "my-cluster"
  tags:
    Name: karpenter-node
    Environment: prod`}
        </CodeBlock>
        <HighlightBox type="tip">Listing multiple instance categories (c, m, r) and many generations gives Karpenter hundreds of instance type options for spot selection. More options means lower probability of all options being interrupted simultaneously — Karpenter can pick whatever has availability. This is the biggest operational advantage over Cluster Autoscaler for spot workloads.</HighlightBox>
      </Accordion>

      <Accordion title="Karpenter vs Cluster Autoscaler — Full Comparison" icon={Cpu}>
        <CompareTable
          headers={['Aspect', 'Cluster Autoscaler', 'Karpenter']}
          rows={[
            ['Provisioning speed', '2-3 min (ASG → EC2 → kubelet)', '30-60 seconds (direct EC2 Fleet API)'],
            ['Instance type flexibility', 'Fixed per ASG node group', 'Hundreds of types per NodePool — picks optimal on demand'],
            ['Spot handling', 'Requires separate spot node group per instance type', 'Native spot + on-demand fallback in one NodePool'],
            ['Node consolidation', 'Scale-down only (node empty or under threshold)', 'Active bin-packing — moves pods to compact nodes, terminates underutilized'],
            ['Configuration complexity', 'Low — configure ASGs in Terraform, done', 'Medium — NodePool + EC2NodeClass + IAM + discovery tags'],
            ['Maturity on EKS', 'Battle-tested, GA for years', 'GA since late 2023, AWS-backed, widely adopted'],
            ['Multi-architecture', 'Separate node group per arch', 'Single NodePool with arch requirement list'],
          ]}
        />
        <HighlightBox type="warn">Never run Karpenter and Cluster Autoscaler simultaneously managing the same pods. They will compete over unschedulable pods. If migrating from CA to Karpenter: (1) install Karpenter, (2) add a NodePool, (3) cordon all CA-managed nodes to force new pods to Karpenter nodes, (4) remove CA once all pods have migrated.</HighlightBox>
      </Accordion>

      <Accordion title="Spot Instance Strategy — Interruption Handling" icon={Zap}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          AWS sends a 2-minute termination notice before reclaiming a spot instance. Karpenter handles this natively — it watches for spot interruption signals and cordons + drains affected nodes gracefully.
        </p>
        <CodeBlock language="yaml">
{`# Node Termination Handler is not needed with Karpenter — it handles interruptions natively
# But your pods must be resilient to termination

# Pod spec for spot-resilient workloads
spec:
  # Spread across AZs so a spot interruption in one AZ doesn't kill all replicas
  topologySpreadConstraints:
    - maxSkew: 1
      topologyKey: topology.kubernetes.io/zone
      whenUnsatisfiable: DoNotSchedule
      labelSelector:
        matchLabels:
          app: my-service

  # Terminate gracefully within the 2-minute window
  terminationGracePeriodSeconds: 90   # gives 90s for graceful shutdown

  # PDB ensures minimum replicas stay up during drain
  # (defined separately as a PodDisruptionBudget resource)`}
        </CodeBlock>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Capacity type preference:</span> Karpenter's <code>spot, on-demand</code> ordering means it tries spot first. If no spot capacity is available for any of the instance types in the NodePool, it falls back to on-demand. You get the cost savings automatically when spot is available.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Workloads that cannot use spot:</span> StatefulSets with EBS volumes (volume AZ must match node AZ — interruption may strand the volume), long-running jobs with no checkpoint, services with strict availability SLOs. Use separate NodePools with <code>values: ["on-demand"]</code> for these.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Spot price variation:</span> Karpenter does not optimize purely for price — it picks any available instance that meets requirements. For batch workloads where cost matters more than latency, consider KEDA + spot-only NodePools with explicit instance type preferences.</div>
          </li>
        </ul>
      </Accordion>

      <Accordion title="Consolidation and Node Expiry" icon={TrendingDown}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Karpenter's consolidation engine runs continuously, looking for opportunities to reduce node count by moving pods to better-utilized nodes and terminating underutilized ones.
        </p>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">WhenUnderutilized:</span> Karpenter checks if all pods on a node can be scheduled on other existing nodes. If yes, it cordons the node, drains pods (respecting PDBs and terminationGracePeriodSeconds), and terminates the EC2 instance. This is aggressive and effective for cost savings.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">WhenEmpty:</span> Only removes nodes when they have no non-DaemonSet pods. Much safer and less disruptive. Use this if your workloads cannot tolerate frequent rescheduling (long TCP connections, stateful in-memory state).</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">expireAfter:</span> Nodes are terminated after a configured lifetime regardless of utilization. This forces node rotation, ensuring nodes run recent AMIs with security patches. 720h (30 days) is a common value — nodes get fresh AMIs without manual intervention.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">budgets field:</span> Karpenter v1 adds disruption budgets at the NodePool level, letting you control how many nodes can be disrupted simultaneously. Critical for limiting the blast radius of consolidation in production.</div>
          </li>
        </ul>
        <CodeBlock language="yaml">
{`spec:
  disruption:
    consolidationPolicy: WhenUnderutilized
    consolidateAfter: 30s
    expireAfter: 720h
    budgets:
      - nodes: "10%"    # disrupt at most 10% of nodes at once
      - schedule: "0 8 * * 1-5"   # allow consolidation only during business hours
        duration: 8h
        nodes: "5%"`}
        </CodeBlock>
        <HighlightBox type="warn">PodDisruptionBudgets are what protect your workloads during Karpenter consolidation. If a service has no PDB and only one replica, consolidation can drain the node hosting that replica, taking the service down briefly. Every production service needs both multiple replicas and a PDB.</HighlightBox>
      </Accordion>

      <Accordion title="Multiple NodePools — Workload Isolation" icon={Server}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Use multiple NodePools to create dedicated node pools for different workload classes. Pods select their NodePool via node selectors or the <code>karpenter.sh/nodepool</code> label in requirements.
        </p>
        <CodeBlock language="yaml">
{`# NodePool for GPU workloads
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: gpu
spec:
  template:
    spec:
      nodeClassRef:
        name: gpu-class
      requirements:
        - key: karpenter.k8s.aws/instance-category
          operator: In
          values: ["g", "p"]       # GPU instance families
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["on-demand"]    # GPU spot is rare and unreliable
      taints:
        - key: nvidia.com/gpu
          effect: NoSchedule       # only pods with GPU toleration land here
  limits:
    cpu: "200"
---
# NodePool for spot batch workloads
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: spot-batch
spec:
  template:
    spec:
      nodeClassRef:
        name: default
      requirements:
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["spot"]         # spot only — cost-optimized
      taints:
        - key: workload-type
          value: batch
          effect: NoSchedule`}
        </CodeBlock>
        <HighlightBox type="tip">Assign workloads to NodePools via node selectors and tolerations. A pod with a GPU toleration and <code>resources.limits.nvidia.com/gpu: "1"</code> will only schedule on the gpu NodePool. This prevents batch jobs from consuming capacity reserved for real-time services.</HighlightBox>
      </Accordion>

      <Accordion title="Debugging — Pod Stuck Pending with Karpenter" icon={AlertTriangle}>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Check Karpenter controller logs:</span> <code>kubectl logs -n karpenter -l app.kubernetes.io/name=karpenter -c controller --tail=50</code>. Karpenter logs why it cannot provision a node: EC2 capacity unavailable, NodePool limits exceeded, no instance type matches pod requirements, IRSA permission error.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Check NodePool status:</span> <code>kubectl get nodepool default -o yaml</code>. The status conditions show if limits have been hit or if there are provisioning errors.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Check NodeClaim:</span> When Karpenter decides to provision a node, it creates a NodeClaim object. <code>kubectl get nodeclaim</code> shows the state. If a NodeClaim is stuck in Pending, look at its events for EC2 launch errors.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">IAM permissions:</span> Karpenter needs specific IAM permissions to call EC2 Fleet API, describe subnets, and manage instances. The most common cause of silent provisioning failure is missing <code>ec2:RunInstances</code> or <code>ec2:CreateTags</code> permissions. Use the official Karpenter IAM policy from the docs.</div>
          </li>
        </ul>
        <CodeBlock language="bash">
{`# Describe the unschedulable pod to see why it's Pending
kubectl describe pod stuck-pod-name

# Check Karpenter logs for provisioning decisions
kubectl logs -n karpenter \
  -l app.kubernetes.io/name=karpenter \
  -c controller \
  --since=5m | grep -E "provision|error|warn"

# Check NodeClaims (nodes Karpenter is attempting to provision)
kubectl get nodeclaim

# Check NodePool status for limits or errors
kubectl get nodepool default -o jsonpath='{.status.conditions}' | jq .`}
        </CodeBlock>
      </Accordion>
    </div>
  );
}
