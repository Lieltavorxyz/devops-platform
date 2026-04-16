import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import NotesBox from '../components/NotesBox';
import HighlightBox from '../components/HighlightBox';
import CompareTable from '../components/CompareTable';
import CodeBlock from '../components/CodeBlock';

export default function Cost() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">{'\uD83D\uDCB0'} Cost & Efficiency</div>
        <h1>Cost Optimization</h1>
        <p>Running efficiently on AWS/EKS — spot instances, right-sizing, scale-to-zero, and the patterns that actually move the needle on cloud spend.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Where Cloud Spend Goes',
          body: "In most EKS setups: EC2 (nodes) is the biggest cost, followed by data transfer, then RDS/ElastiCache. Over-provisioned nodes and idle workloads are the easiest wins. Spot instances can cut EC2 costs by 60-80%."
        },
        {
          title: 'The Cost Levers',
          body: 'Right-size (correct requests/limits) → Autoscale (KEDA, HPA, Karpenter) → Spot instances → Schedule off-hours shutdown → Consolidate underutilized clusters → Reserved/Savings Plans for baseline.'
        }
      ]} />

      <Accordion title="Spot Instances — The Biggest Win" icon={'\uD83C\uDFAF'} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Spot instances use spare EC2 capacity at 60-80% discount. The catch: AWS can reclaim them with a 2-minute notice. The strategy: design workloads to tolerate interruption.
        </p>
        <HighlightBox type="tip"><strong>The right workloads for spot:</strong> Stateless web servers, batch jobs, CI runners, dev/staging environments. <strong>Wrong workloads:</strong> Databases, stateful services, anything that can't restart quickly.</HighlightBox>
        <CodeBlock>{`# Karpenter NodePool: prefer spot, fall back to on-demand
requirements:
  - key: karpenter.sh/capacity-type
    operator: In
    values: ["spot", "on-demand"]   # Karpenter tries spot first

# Pod tolerates spot nodes and has anti-affinity to spread zones
tolerations:
  - key: "karpenter.sh/capacity-type"
    operator: "Equal"
    value: "spot"
    effect: "NoSchedule"
topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: DoNotSchedule   # spread across AZs for resilience`}</CodeBlock>
        <HighlightBox type="warn"><strong>Spot interruption handling:</strong> AWS sends a 2-minute warning via IMDS. The Node Termination Handler (NTH) DaemonSet catches this, cordons the node, and drains pods gracefully. Without NTH, pods get killed with no warning. Always install NTH on clusters with spot.</HighlightBox>
      </Accordion>

      <Accordion title="Right-Sizing — Resource Requests & Limits" icon={'\uD83D\uDCCF'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Resource requests determine how much capacity is reserved on the node. Oversized requests = wasted capacity = more nodes = more cost. But too low = OOMKills and throttling.
        </p>
        <CompareTable
          headers={['Problem', 'Symptom', 'Fix']}
          rows={[
            ['CPU request too high', 'Node utilization low, many nodes, high cost', 'Check actual usage in Grafana, reduce requests to ~P90 usage'],
            ['CPU limit too low', 'Throttled pods, high latency but no OOMKill', 'Check <code>container_cpu_cfs_throttled_seconds_total</code> — if high, raise limit'],
            ['Memory request too low', 'Pods evicted during memory pressure', 'Raise request to match limit for memory (Guaranteed QoS)'],
            ['Memory limit too low', 'OOMKilled', 'Raise limit, or find the memory leak'],
          ]}
        />
        <HighlightBox type="tip"><strong>VPA (Vertical Pod Autoscaler):</strong> Run VPA in <code>Off</code> mode to get recommendations without automatic changes. It observes actual usage and suggests right-sized requests/limits. Use the recommendations to manually tune, then consider <code>Initial</code> mode for new pods.</HighlightBox>
        <NotesBox id="cost-rightsizing" placeholder="Did you work on cost optimization? Spot instances? Right-sizing exercises? Any specific cost savings you achieved?" />
      </Accordion>

      <Accordion title="Scale-to-Zero — KEDA for Idle Workloads" icon={'\uD83D\uDCC9'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          HPA can't scale to 0 (minimum 1 pod). KEDA can — it scales based on external metrics and can completely remove pods when idle. Combined with Karpenter, idle workloads cost $0 until traffic arrives.
        </p>
        <CodeBlock>{`# KEDA ScaledObject — scale API based on SQS queue depth
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: worker-scaler
spec:
  scaleTargetRef:
    name: my-worker
  minReplicaCount: 0             # scales to zero when idle
  maxReplicaCount: 50
  cooldownPeriod: 300            # wait 5 min before scaling down
  triggers:
    - type: aws-sqs-queue
      metadata:
        queueURL: https://sqs.us-east-1.amazonaws.com/123/my-queue
        awsRegion: us-east-1
        targetQueueLength: "10"  # 1 pod per 10 messages`}</CodeBlock>
        <HighlightBox type="tip"><strong>Scale-to-zero use cases:</strong> Batch workers (no queue = no pods), dev/staging overnight (cron trigger to zero at midnight), webhook processors (zero between webhook bursts). Combined with Karpenter consolidation, nodes also scale down when pods are gone.</HighlightBox>
      </Accordion>

      <Accordion title="Interview Q&A" icon={'\uD83D\uDCAC'}>
        <HighlightBox type="info"><strong>Q: How would you reduce our AWS bill by 40%?</strong><br /><br />
        "I'd start with visibility — use AWS Cost Explorer by service and tag to find what's actually expensive. Then attack the biggest line items: (1) Spot instances for stateless workloads — typically 60-80% savings on EC2. (2) Right-size pods using VPA recommendations — wasted CPU/memory requests mean more nodes than needed. (3) Karpenter node consolidation removes underutilized nodes automatically. (4) Scale-to-zero non-prod environments at night with KEDA cron triggers. (5) For baseline capacity, Reserved Instances or Compute Savings Plans give 30-40% off on-demand pricing."</HighlightBox>
        <HighlightBox type="info"><strong>Q: What happens to pods when a spot instance is reclaimed?</strong><br /><br />
        "AWS sends a 2-minute termination notice via the instance metadata service. The Node Termination Handler DaemonSet watches for this signal, cordons the node immediately (no new pods scheduled), and drains existing pods gracefully. K8s reschedules them on other nodes. With Karpenter and multiple instance families in the NodePool, there's usually available capacity to absorb them quickly. The key is designing pods to be stateless and restart quickly — no long startup sequences, no local state."</HighlightBox>
      </Accordion>
    </div>
  );
}
