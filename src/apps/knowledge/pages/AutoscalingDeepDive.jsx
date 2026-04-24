import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import HighlightBox from '../components/HighlightBox';
import CompareTable from '../components/CompareTable';
import CodeBlock from '../components/CodeBlock';
import { TrendingUp, Gauge, Zap, Server, AlertTriangle, Activity } from 'lucide-react';

export default function AutoscalingDeepDive() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">HPA &middot; VPA &middot; KEDA &middot; Karpenter</div>
        <h1>Autoscaling Deep-Dive</h1>
        <p>HPA internals and the desired-replicas formula, VPA+HPA oscillation, KEDA for event-driven scale, Karpenter vs Cluster Autoscaler under real load, scale-to-zero cold starts, and the common pitfalls where autoscaling becomes the cause of the outage instead of the cure.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Autoscaling Is A Feedback Loop',
          body: 'Every autoscaler observes a metric, computes a desired state, and moves toward it. All the failure modes come from the lag between observation and action: metrics are 30 seconds stale, scale-up takes minutes, requests pile up in the meantime. Understanding the time constants of each layer — metric collection, reconciliation interval, pod startup, node provisioning — is the difference between autoscaling that smooths traffic and autoscaling that amplifies it.'
        },
        {
          title: 'Reactive Scaling Has A Minimum Latency',
          body: 'From "CPU hits 80%" to "new pod accepting traffic" is typically 60-180 seconds: metrics scrape interval (15-60s) + HPA reconcile (15s) + pod scheduling (5s) + container pull (10-60s) + readiness probe passing (10-30s). If your traffic doubles in 30 seconds, reactive autoscaling cannot save you. You need headroom, predictive scaling, or event-driven scale that reads the real leading indicator (queue depth) not the lagging one (CPU).'
        }
      ]} />

      <Accordion title="HPA — Horizontal Pod Autoscaler Internals" icon={TrendingUp} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The HPA is a control loop running in the kube-controller-manager. Every 15 seconds (default) it queries the metrics server, computes desired replicas, and updates the Deployment&apos;s replica count. The algorithm is straightforward but the gotchas are in the tuning.
        </p>
        <CodeBlock language="yaml">
{`# Canonical HPA definition:
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: payments-api
  namespace: payments-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payments-api
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100        # can double replicas per step
        periodSeconds: 30
      - type: Pods
        value: 4           # or add 4 pods per step
        periodSeconds: 30
      selectPolicy: Max    # use the more aggressive
    scaleDown:
      stabilizationWindowSeconds: 300   # 5 min cooldown
      policies:
      - type: Percent
        value: 20          # never remove more than 20% at once
        periodSeconds: 60`}
        </CodeBlock>
        <CodeBlock language="bash">
{`# The HPA desired-replicas formula (the part the docs do not emphasize enough):
#
# desired = ceil(current × currentMetric / desiredMetric)
#
# Example: current=10 replicas, pods averaging 85% CPU, target 70%
# desired = ceil(10 × 85 / 70) = ceil(12.14) = 13
# HPA scales from 10 → 13 replicas.

# Example: current=10, pods at 35% CPU, target 70%
# desired = ceil(10 × 35 / 70) = ceil(5) = 5
# HPA scales from 10 → 5 (assuming scaleDown policies allow it).

# Tolerance band: by default HPA does nothing if ratio is within ±10% of target.
# This prevents thrashing from noise. Controller flag: --horizontal-pod-autoscaler-tolerance=0.1

# Important: the metric is AVERAGED across all replicas, not max.
# If one pod is pegged at 100% CPU and 9 are at 10%, the average is 19%
# → HPA sees no pressure → does not scale up.
# Real-world case: bad load balancing (session affinity to one pod)
# can hide the need to scale.

# Multi-metric HPAs: HPA evaluates each metric independently, takes the MAX.
# If CPU says "10 replicas", memory says "15", requests-per-second says "8"
# → HPA picks 15. This is correct but can cause scaling oscillation if one
# metric is noisy while another is stable.

# Inspect the HPA decision process:
kubectl describe hpa payments-api
# ...
# Current CPU utilization:       82% (820m) / 70%
# Current memory utilization:    65% (2048Mi) / 80%
# Deployment pods:               12 current / 15 desired
# Events:
#   Normal  SuccessfulRescale  30s  HPA  New size: 15; reason: cpu resource utilization above target`}
        </CodeBlock>
        <HighlightBox type="warn">HPA silently fails if the metrics server isn&apos;t working. Symptom: CPU goes to 95% and replicas do not budge. Check: <code>kubectl top pods</code> — if it errors, HPA is blind. Root cause is usually metrics-server pod crashed, or the ServiceAccount lacks permissions on a fresh cluster. Always alert on <code>unable to get metrics for resource cpu</code> events from the HPA.</HighlightBox>
      </Accordion>

      <Accordion title="VPA — Vertical Pod Autoscaler and the HPA+VPA Oscillation" icon={Gauge}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          VPA adjusts pod CPU/memory requests based on observed usage. Used correctly it replaces manual resource tuning. Used carelessly alongside HPA it creates feedback loops that destabilize the cluster.
        </p>
        <CompareTable
          headers={['VPA updateMode', 'Behavior', 'Use Case']}
          rows={[
            ['Off', 'Only emits recommendations; pods not modified', 'Initial sizing research; review before enabling'],
            ['Initial', 'Sets requests at pod creation, never modifies running pods', 'Long-running pods; avoids disruption'],
            ['Recreate', 'Evicts pods when recommendation drifts significantly', 'Tolerant workloads; pods can be restarted freely'],
            ['Auto (alias of Recreate currently)', 'Same as Recreate today; in-place resize coming in newer k8s', 'Same as Recreate'],
          ]}
        />
        <CodeBlock language="yaml">
{`apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: payments-api
  namespace: payments-prod
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payments-api
  updatePolicy:
    updateMode: "Recreate"
  resourcePolicy:
    containerPolicies:
    - containerName: payments-api
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 4
        memory: 4Gi
      controlledResources: ["cpu", "memory"]
---
# Inspect what VPA thinks:
# kubectl describe vpa payments-api
# Recommendation:
#   Target:      cpu: 350m, memory: 512Mi     <- VPA's pick, applied
#   Lower Bound: cpu: 120m, memory: 256Mi     <- too low for p99
#   Upper Bound: cpu: 800m, memory: 1Gi       <- overprovisioned above this
#   Uncapped:    cpu: 350m, memory: 512Mi     <- unclamped recommendation`}
        </CodeBlock>
        <HighlightBox type="warn"><b>Do not run VPA and HPA on the same metric.</b> Example: HPA scales on CPU target 70%. VPA sees pods averaging 70% CPU under HPA control and decides &quot;pods need more CPU,&quot; so it increases requests. Now pods have more CPU capacity, utilization drops below 70%, HPA scales down replicas. Fewer replicas = more load per pod, CPU climbs back, VPA raises requests again. Classic oscillation. Safe combinations: HPA on requests-per-second (leading indicator) + VPA on CPU (lagging indicator), or HPA on CPU + VPA only on memory. Or use VPA in &quot;Off&quot; mode just for recommendations.</HighlightBox>
      </Accordion>

      <Accordion title="KEDA — Event-Driven Autoscaling" icon={Zap}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          HPA on CPU is a lagging indicator. When your workload is &quot;process messages from a queue,&quot; the real leading indicator is queue depth, not CPU. KEDA lets you scale directly on external metrics — Kafka consumer lag, SQS queue size, Prometheus query result, Redis list length — and supports scale-to-zero.
        </p>
        <CodeBlock language="yaml">
{`# KEDA ScaledObject — scale a deployment based on Kafka consumer lag:
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: order-processor
  namespace: payments-prod
spec:
  scaleTargetRef:
    name: order-processor
  minReplicaCount: 0          # scale to zero when queue is empty
  maxReplicaCount: 50
  pollingInterval: 15         # seconds between metric checks
  cooldownPeriod: 60          # seconds to wait before scaling from 1 → 0
  triggers:
  - type: kafka
    metadata:
      bootstrapServers: kafka-bootstrap.messaging:9092
      consumerGroup: order-processor-group
      topic: orders
      lagThreshold: "100"     # scale up if lag > 100 msgs per replica
      offsetResetPolicy: latest
---
# KEDA ScaledObject — SQS queue depth:
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: image-resizer
spec:
  scaleTargetRef:
    name: image-resizer
  minReplicaCount: 0
  maxReplicaCount: 100
  triggers:
  - type: aws-sqs-queue
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/123456789012/resize-jobs
      queueLength: "30"     # target messages per pod
      awsRegion: us-east-1
    authenticationRef:
      name: keda-aws-auth   # IRSA-backed TriggerAuthentication
---
# KEDA under the hood:
# 1. KEDA operator watches ScaledObjects
# 2. Creates/manages a standard HPA with custom external metric
# 3. Implements the external metric API — HPA asks KEDA, KEDA queries Kafka/SQS
# 4. Returns a value; HPA runs its standard desired-replicas formula
# 5. For scale-to-zero: KEDA directly sets Deployment replicas=0 when idle
#    (bypasses HPA which has minReplicas=1 floor)`}
        </CodeBlock>
        <CompareTable
          headers={['Scaler Type', 'Use Case', 'Gotcha']}
          rows={[
            ['Kafka', 'Consumer group lag-based scale', 'Lag can spike on rebalance; smooth it or use percentile'],
            ['AWS SQS', 'Worker pool for async job queue', 'ApproximateNumberOfMessages metric is updated every minute by SQS'],
            ['Prometheus', 'Arbitrary PromQL result as scale trigger', 'Most flexible; target must be a rate or count, not a percentage'],
            ['Cron', 'Scheduled scale — business hours up, nights down', 'Use with other triggers; cron alone ignores actual load'],
            ['HTTP (KEDA http-add-on)', 'Pure scale-from-zero for HTTP with request buffering', 'Experimental; cold start is visible to first user'],
            ['CPU/memory', 'Same as HPA', 'Use stock HPA unless you need scale-to-zero via KEDA'],
          ]}
        />
      </Accordion>

      <Accordion title="Karpenter vs Cluster Autoscaler" icon={Server}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Pods scale horizontally, but when all nodes are full, you need more nodes. Cluster Autoscaler (CA) is the original; Karpenter is the newer, cloud-optimized alternative. The difference is not small — Karpenter changes how you think about node groups.
        </p>
        <CompareTable
          headers={['Dimension', 'Cluster Autoscaler', 'Karpenter']}
          rows={[
            ['Model', 'Scales predefined node groups (ASGs)', 'Provisions nodes directly via EC2 API — no ASG required'],
            ['Provisioning time', '~3-5 minutes (ASG launch + kubelet register)', '~30-60 seconds (direct EC2 RunInstances)'],
            ['Instance type selection', 'Single type per node group — you pick upfront', 'Karpenter chooses cheapest type that fits pending pods'],
            ['Bin-packing', 'Good for homogeneous groups', 'Can mix instance families, sizes, architectures automatically'],
            ['Spot handling', 'Requires mixed-instance ASGs with spot pool', 'Native spot support; auto-falls-back to on-demand on interruption'],
            ['Consolidation', 'No — pods stay on original nodes even if cluster is fragmented', 'Yes — periodically evicts and repacks to fewer nodes'],
            ['Drift detection', 'No — node group config drift requires manual node rotation', 'Yes — detects when running nodes differ from NodePool spec, rotates'],
            ['Cloud support', 'AWS, GCP, Azure, bare-metal (various providers)', 'AWS GA; Azure in beta; limited elsewhere'],
          ]}
        />
        <CodeBlock language="yaml">
{`# Karpenter NodePool — defines what nodes Karpenter is allowed to launch:
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: default
spec:
  template:
    spec:
      requirements:
      - key: karpenter.sh/capacity-type
        operator: In
        values: ["spot", "on-demand"]   # prefer spot, fall back to on-demand
      - key: kubernetes.io/arch
        operator: In
        values: ["amd64"]
      - key: karpenter.k8s.aws/instance-family
        operator: In
        values: ["c7g", "m7g", "r7g"]   # Graviton only
      - key: karpenter.k8s.aws/instance-size
        operator: NotIn
        values: ["nano", "micro", "small"]
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: default
  disruption:
    consolidationPolicy: WhenEmptyOrUnderutilized
    consolidateAfter: 30s
    expireAfter: 720h   # force replacement every 30 days for patching
  limits:
    cpu: "1000"
    memory: 4000Gi
---
apiVersion: karpenter.k8s.aws/v1
kind: EC2NodeClass
metadata:
  name: default
spec:
  amiFamily: AL2023
  subnetSelectorTerms:
  - tags:
      karpenter.sh/discovery: prod-cluster
  securityGroupSelectorTerms:
  - tags:
      karpenter.sh/discovery: prod-cluster
  role: KarpenterNodeRole-prod-cluster`}
        </CodeBlock>
        <HighlightBox>Karpenter consolidation is the unheralded superpower. In a typical CA cluster, ASG scale-down waits 10 minutes of idle and only removes whole groups of nodes. Karpenter continuously evaluates: &quot;could these pods fit on fewer nodes?&quot; and reschedules them. In practice, clusters running Karpenter with consolidation show 20-40% lower compute cost vs the same workload on CA, because fragmentation is actively cleaned up.</HighlightBox>
      </Accordion>

      <Accordion title="Scale-to-Zero and Cold Starts" icon={Activity}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Scaling to zero saves money for bursty workloads but introduces cold start latency — the first request after idle waits for a pod (and possibly a node) to come up. Mitigation depends on which layer is cold.
        </p>
        <CodeBlock language="bash">
{`# Cold start latency breakdown (worst case, node also cold):

# 1. Request arrives at Service with 0 endpoints
#    → kube-proxy returns connection refused
#    → need an ingress/proxy that can hold the request
#    (KEDA http-add-on, Knative activator, Istio with outlier detection)

# 2. KEDA sees metric > 0 (queue depth or HTTP request), scales Deployment to 1
#    Pod enters Pending → scheduler looks for a node
#    ~5s

# 3. No node has capacity → Karpenter provisions
#    EC2 RunInstances → instance boots → cloud-init runs → kubelet starts
#    → node registers with API server → node becomes Ready
#    ~30-60s

# 4. Pod scheduled → image pulled (if not cached)
#    Cold image (no node-local cache): 10-60s for a 500MB image
#    ~10-60s

# 5. Container starts → readiness probe passes
#    ~10-30s depending on app startup

# Total cold start: 60-150s worst case
# This is unacceptable for user-facing HTTP. Good for async queue workers.

# Mitigations:

# (a) Prepulled images — DaemonSet that pulls likely images to every node
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: image-warmer
spec:
  template:
    spec:
      initContainers:
      - name: pull-payments-api
        image: payments-api:v1.2.3
        command: ["true"]
      containers:
      - name: pause
        image: registry.k8s.io/pause:3.9

# (b) Minimum replicas = 1 (skip scale-to-zero)
# Not scale-to-zero, but scale-to-small. Cheapest on-demand instance
# keeps one pod warm. Usually cheaper than the lost-user cost of cold starts.

# (c) Warm pool of pre-provisioned nodes
# Karpenter has no native warm pool, but you can run a "placeholder" deployment
# with low-priority PriorityClass that keeps nodes around. Real pods preempt
# placeholders when they need the capacity.`}
        </CodeBlock>
      </Accordion>

      <Accordion title="Common Pitfalls — When Autoscaling Causes The Outage" icon={AlertTriangle}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Autoscaling adds a feedback loop to your system. Every feedback loop has failure modes. These are the ones that have bitten real teams.
        </p>
        <CompareTable
          headers={['Pitfall', 'Failure Mode', 'Mitigation']}
          rows={[
            ['HPA thrashing', 'Replicas oscillate up/down rapidly; pod churn', 'Increase scaleDown stabilizationWindowSeconds to 300+; tighten tolerance'],
            ['Scale-up lag during traffic spike', 'p99 latency spikes for 2-3 min until new pods online', 'Overprovision (higher minReplicas); predictive scaling; pre-warm before known events'],
            ['Aggressive scale-down mid-spike', 'Traffic dips briefly, HPA removes replicas, traffic returns, overwhelms remaining', 'Long scaleDown stabilization window; scale-down disallowed during business hours'],
            ['Hot partition / uneven load', 'One pod at 100% CPU, 9 at 10% — avg 19%, HPA does not scale', 'Check LB algorithm; consider HPA on custom metric (p99 latency or queue depth)'],
            ['VPA + HPA oscillation', 'Both chase same metric; resource requests and replica count both change', 'Split which metric each controls; prefer VPA on memory + HPA on CPU'],
            ['Autoscaler chasing a failing dependency', 'DB slow → app CPU high → HPA scales up → more DB connections → DB slower', 'Add circuit breakers; HPA on RPS not CPU; shed load rather than scale'],
            ['Node autoscaler cannot find capacity', 'Pods Pending forever; Insufficient capacity errors from cloud', 'Multi-AZ, multi-instance-type NodePools; monitor provisioning failures'],
          ]}
        />
        <HighlightBox type="warn">The most dangerous autoscaling failure is the death spiral: pods OOM → pod restarts → pod warm-up serves slow → more pods needed → HPA scales up → new pods all hit the cold cache / DB connection pool → more OOMs. Once started, it is hard to stop without scaling down manually. Have a &quot;pause autoscaling&quot; runbook: <code>{'kubectl patch hpa payments-api -p \'{"spec":{"minReplicas":X,"maxReplicas":X}}\''}</code> to pin replicas at the current level while you triage. Then fix the root cause, then re-enable autoscaling.</HighlightBox>
      </Accordion>
    </div>
  );
}
