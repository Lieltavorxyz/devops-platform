import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import NotesBox from '../components/NotesBox';
import HighlightBox from '../components/HighlightBox';
import CompareTable from '../components/CompareTable';
import CodeBlock from '../components/CodeBlock';

export default function Karpenter() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">{'\uD83C\uDFAF'} Kubernetes</div>
        <h1>Karpenter</h1>
        <p>A flexible, high-performance node provisioner for Kubernetes. Karpenter directly provisions EC2 instances in response to pod demand — no node groups, no warm pools required.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'The Problem with Cluster Autoscaler',
          body: "Cluster Autoscaler scales ASG node groups, but ASGs are rigid — fixed instance type, fixed AZ, slow to provision (2-3 min). You need to pre-create node groups for every instance type combination you might want. Karpenter provisions nodes directly via EC2 Fleet API — faster (30-60s), flexible (picks the right instance type on demand), and cheaper."
        },
        {
          title: 'How Karpenter Works',
          body: "Karpenter watches for unschedulable pods, evaluates their requirements (CPU, memory, GPU, zone, spot/on-demand), picks the optimal instance type from hundreds of options, and launches it directly via EC2. No ASG involved. It also consolidates underutilized nodes to save cost."
        }
      ]} />

      <Accordion title="NodePool — The Core Config" icon={'\uD83D\uDCCB'} defaultOpen={true}>
        <CodeBlock>{`# NodePool — defines what nodes Karpenter can provision
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata:
  name: default
spec:
  template:
    spec:
      requirements:
        - key: kubernetes.io/arch
          operator: In
          values: ["amd64"]
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["spot", "on-demand"]   # prefer spot, fall back to on-demand
        - key: karpenter.k8s.aws/instance-category
          operator: In
          values: ["c", "m", "r"]         # compute, general, memory families
        - key: karpenter.k8s.aws/instance-generation
          operator: Gt
          values: ["2"]                   # 3rd gen+ only (better perf/cost)
      nodeClassRef:
        apiVersion: karpenter.k8s.aws/v1beta1
        kind: EC2NodeClass
        name: default
  limits:
    cpu: 1000                             # max total CPU across all Karpenter nodes
  disruption:
    consolidationPolicy: WhenUnderutilized
    consolidateAfter: 30s                 # compact underutilized nodes aggressively`}</CodeBlock>
        <HighlightBox type="tip"><strong>Spot strategy:</strong> Listing multiple instance families (c, m, r) + multiple generations gives Karpenter hundreds of instance type options for spot. More options = less chance of spot interruption, better pricing. This is why Karpenter beats CA for spot workloads.</HighlightBox>
        <NotesBox id="karpenter-nodepool" placeholder="How did you configure Karpenter NodePools? What instance families and capacity types did you use?" />
      </Accordion>

      <Accordion title="Karpenter vs Cluster Autoscaler" icon={'\u2696\uFE0F'}>
        <CompareTable
          headers={['Aspect', 'Cluster Autoscaler', 'Karpenter']}
          rows={[
            ['Provisioning speed', '2-3 min (ASG → EC2)', '30-60s (direct EC2 Fleet)'],
            ['Instance flexibility', 'Fixed per node group', 'Hundreds of types per NodePool'],
            ['Spot handling', 'Needs separate spot node group', 'Native spot + fallback in one NodePool'],
            ['Node consolidation', 'No (only scale down)', 'Yes — moves pods to compact nodes, terminates underused'],
            ['Config complexity', 'Low — just configure ASGs', 'Medium — NodePool + EC2NodeClass + IAM'],
            ['Maturity', 'Stable, battle-tested', 'GA since 2023, AWS-native, widely adopted on EKS'],
          ]}
        />
        <HighlightBox type="tip"><strong>When to use which:</strong> New EKS cluster → Karpenter. Existing cluster with many node groups → Karpenter migration is worth it for cost. Don't mix both — they fight over the same unschedulable pods.</HighlightBox>
      </Accordion>

      <Accordion title="Consolidation & Disruption" icon={'\uD83D\uDCC9'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Karpenter actively optimizes your cluster by consolidating underutilized nodes and replacing them with better-fit instances.
        </p>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">WhenUnderutilized:</span> Karpenter deletes nodes that have pods which can fit on other existing nodes. This reduces waste from partially-filled nodes.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">WhenEmpty:</span> Only removes nodes when they have no non-DaemonSet pods. Safer but less aggressive on cost savings.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Expiration:</span> Set <code>expireAfter</code> on NodePool to force node rotation (e.g., 720h = 30 days). Ensures nodes get fresh AMIs and don't accumulate drift.</div>
          </li>
        </ul>
        <HighlightBox type="warn"><strong>Disruption budget:</strong> Use PodDisruptionBudgets (PDBs) to protect critical workloads during consolidation. Without PDBs, Karpenter may drain a node that hosts your only replica.</HighlightBox>
      </Accordion>

      <Accordion title="Interview Q&A" icon={'\uD83D\uDCAC'}>
        <HighlightBox type="info">
          <strong>Q: What's the advantage of Karpenter over Cluster Autoscaler?</strong><br /><br />
          "Cluster Autoscaler is limited to scaling pre-configured ASG node groups — if you need a different instance type, you need a different node group. Karpenter provisions nodes directly via EC2 Fleet API, so it can pick from hundreds of instance types based on what the pending pods actually need. It's faster (30-60s vs 2-3 min), handles spot interruptions better by having a large instance family pool, and consolidates underutilized nodes automatically to cut cost."
        </HighlightBox>
        <HighlightBox type="info">
          <strong>Q: A pod is stuck Pending. How would you debug it with Karpenter?</strong><br /><br />
          "First <code>kubectl describe pod</code> to see the scheduling failure reason. Then check Karpenter controller logs — it will show why it couldn't provision a node (e.g., no instance type matches requirements, EC2 capacity issue, NodePool limits hit, IRSA permissions on Karpenter). Check the NodePool's <code>status.conditions</code> for disruption or limit events."
        </HighlightBox>
      </Accordion>
    </div>
  );
}
