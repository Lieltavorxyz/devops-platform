import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import HighlightBox from '../components/HighlightBox';
import CompareTable from '../components/CompareTable';
import CodeBlock from '../components/CodeBlock';
import { TrendingDown, Cpu, BarChart2, Settings, AlertTriangle, DollarSign } from 'lucide-react';

export default function Cost() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">Cost & Efficiency</div>
        <h1>Cost Optimization</h1>
        <p>Where cloud spend actually goes on EKS, the mechanics of spot instances and right-sizing, KEDA scale-to-zero, Savings Plans math, and how to build cost visibility before tuning anything.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Where the Money Goes',
          body: 'In a typical EKS workload: EC2 nodes are 50-70% of the bill, data transfer is 10-20% (especially cross-AZ or egress to internet), RDS/ElastiCache 10-15%, and everything else (ECR, S3, CloudWatch) fills the rest. The highest-leverage interventions target EC2 first: spot instances, right-sizing, and node consolidation. Data transfer is the second lever — cross-AZ traffic is $0.01/GB and adds up fast in microservice architectures with chatty service communication.'
        },
        {
          title: 'The Optimization Order',
          body: 'Visibility first — you cannot optimize what you cannot see. Tag everything (cluster, namespace, team, environment) and enforce it via SCP. Then: (1) Spot for stateless EC2 workloads — 60-80% savings on the biggest line item. (2) Right-size requests/limits — wasted requests mean more nodes than needed. (3) Autoscale aggressively — Karpenter + KEDA to scale down to zero when idle. (4) Savings Plans for the stable baseline — commit to what you know you will always run.'
        }
      ]} />

      <Accordion title="Spot Instances — How They Work and When to Use Them" icon={TrendingDown} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Spot instances use spare EC2 capacity at 60-80% discount. AWS can reclaim them with a 2-minute termination notice when they need the capacity back. Historically, many instance types see interruption rates under 5% — but it varies by instance family, region, and AZ. The strategy is not to avoid interruption; it is to design for it.
        </p>
        <CompareTable
          headers={['Workload Type', 'Spot Safe?', 'Reason']}
          rows={[
            ['Stateless API servers (payments-api, auth-service)', 'Yes', 'Multiple replicas, fast restart, no local state'],
            ['Batch/background workers', 'Yes — best fit', 'Job-level retries handle interruptions naturally'],
            ['CI runners (ephemeral)', 'Yes', 'Each run is a fresh pod, interruption just retries the job'],
            ['Dev/staging environments', 'Yes', 'Interruption acceptable, huge cost savings overnight'],
            ['Databases (RDS, self-managed)', 'No', 'Data loss or split-brain on sudden termination'],
            ['Stateful services with local disk', 'No', 'EBS volumes cannot migrate instantly on spot interruption'],
            ['Single-replica critical services', 'No', '2-minute notice may not be enough for graceful shutdown'],
          ]}
        />
        <CodeBlock language="yaml">
{`# Karpenter NodePool: try spot first, fall back to on-demand
# Multiple instance families reduce interruption probability
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: spot-workers
spec:
  template:
    spec:
      requirements:
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["spot", "on-demand"]  # Karpenter prefers spot (cheaper)
        - key: node.kubernetes.io/instance-type
          operator: In
          # Diverse family selection: if m5 spot is unavailable, try m6i, m6a, m7i
          # More diversity = lower interruption rate
          values: ["m5.xlarge", "m5.2xlarge", "m6i.xlarge", "m6i.2xlarge",
                   "m6a.xlarge", "m6a.2xlarge", "m7i.xlarge", "m7i.2xlarge"]
        - key: topology.kubernetes.io/zone
          operator: In
          values: ["us-east-1a", "us-east-1b", "us-east-1c"]
  limits:
    cpu: "1000"
  disruption:
    consolidationPolicy: WhenUnderutilized
    consolidateAfter: 1m`}
        </CodeBlock>
        <CodeBlock language="yaml">
{`# Deployment: spread across AZs so spot interruption in one AZ
# does not take down all replicas simultaneously
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payments-api
spec:
  replicas: 6
  template:
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: payments-api
      # PodDisruptionBudget enforced during node drain
      # Karpenter respects PDBs during consolidation and spot interruption drain
      containers:
        - name: app
          # Fast startup = faster recovery from interruption
          # preStop hook gives existing requests time to complete
          lifecycle:
            preStop:
              exec:
                command: ["sleep", "5"]  # drain in-flight requests before SIGTERM`}
        </CodeBlock>
        <HighlightBox type="warn">Without Node Termination Handler (NTH), spot interruption sends SIGKILL directly — no graceful shutdown, no connection draining. NTH watches the EC2 instance metadata endpoint for the 2-minute warning, cordons the node immediately, and drains pods so they can terminate gracefully and reschedule before the hard kill. Install NTH as a DaemonSet on any cluster using spot. With Karpenter, NTH is partially replaced by Karpenter's native interruption handling (requires an SQS queue for EC2 interruption events).</HighlightBox>
        <CodeBlock language="bash">
{`# Karpenter native spot interruption handling
# Requires SQS queue subscribed to EC2 Spot Interruption Notices
# Terraform: create SQS queue and EventBridge rules

resource "aws_sqs_queue" "karpenter_interruption" {
  name                      = "karpenter-interruption"
  message_retention_seconds = 300
}

# EventBridge rule: EC2 Spot interruption → SQS
resource "aws_cloudwatch_event_rule" "spot_interruption" {
  name        = "karpenter-spot-interruption"
  event_pattern = jsonencode({
    source      = ["aws.ec2"]
    detail-type = ["EC2 Spot Instance Interruption Warning"]
  })
}

resource "aws_cloudwatch_event_target" "spot_to_sqs" {
  rule      = aws_cloudwatch_event_rule.spot_interruption.name
  target_id = "karpenter-sqs"
  arn       = aws_sqs_queue.karpenter_interruption.arn
}

# Karpenter controller picks up the SQS message and drains the node
# before AWS sends SIGKILL — giving the full 2-minute window`}
        </CodeBlock>
      </Accordion>

      <Accordion title="Right-Sizing — Why Wasted Requests Cost Money" icon={Cpu}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Resource requests are the unit of scheduling. The Kubernetes scheduler places pods on nodes based on requested resources, not actual usage. If pods request 2 CPU but only use 0.3 CPU, the scheduler treats the remaining 1.7 CPU as occupied. More wasted requests means more nodes to fit all pods, means more EC2 spend.
        </p>
        <CompareTable
          headers={['Symptom', 'Root Cause', 'Diagnostic Command', 'Fix']}
          rows={[
            ['Node CPU utilization 15%, but cluster needs more nodes', 'CPU requests oversized vs actual usage', 'kubectl top pods -A; compare to requests in describe pod', 'Reduce requests to ~P90 of actual usage'],
            ['High latency during load but no OOMKill', 'CPU limits too low, causing CFS throttling', 'container_cpu_cfs_throttled_seconds_total in Prometheus', 'Raise CPU limit or remove it entirely'],
            ['Pods evicted during memory pressure', 'Memory requests below actual usage, triggering eviction', 'kubectl describe node — look for MemoryPressure condition', 'Set memory request = limit for Guaranteed QoS'],
            ['Nodes run at 80% but utilization metrics show 20%', 'Requests high, actual usage low — Karpenter cannot consolidate', 'kubectl describe node — compare Requests vs Allocatable', 'Right-size requests so Karpenter can pack pods tighter'],
          ]}
        />
        <CodeBlock language="bash">
{`# Find pods with significantly oversized CPU requests
# Compares requests to actual 24h average usage via kubectl top
kubectl top pods -A --sort-by=cpu | head -30

# VPA in Recommendation mode — no changes, just reports
kubectl apply -f - <<EOF
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: payments-api-vpa
  namespace: payments-prod
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payments-api
  updatePolicy:
    updateMode: "Off"   # Recommendation only — does not change pods
EOF

# Check VPA recommendations after ~24h of data
kubectl describe vpa payments-api-vpa -n payments-prod
# Look for:
# Recommendation:
#   Container Recommendations:
#     Container Name: app
#     Lower Bound:    cpu: 50m, memory: 128Mi
#     Target:         cpu: 200m, memory: 256Mi    ← use this for requests
#     Upper Bound:    cpu: 800m, memory: 512Mi`}
        </CodeBlock>
        <HighlightBox type="tip">VPA target recommendation is the right starting point for requests. Do not use Upper Bound — that is the safety ceiling, not the operating point. Apply the Target value as your request and set limit to 2x the target for burst headroom. After 1 week, check if throttling appears (CPU) or OOMKills appear (memory) and adjust. Most services end up at 30-50% of their original over-provisioned requests.</HighlightBox>
        <CodeBlock language="bash">
{`# Prometheus: identify CPU-throttled containers
# High ratio = pods are hitting their CPU limit frequently
# This means limit is too low OR the service is actually CPU-constrained
sum(rate(container_cpu_cfs_throttled_seconds_total[5m])) by (namespace, pod, container)
  /
sum(rate(container_cpu_cfs_periods_total[5m])) by (namespace, pod, container)
> 0.25   # alert if >25% of scheduling periods are throttled

# Prometheus: find pods with low actual vs requested CPU ratio
# Ratio < 0.2 means requesting 5x more than used — prime right-sizing candidates
sum(rate(container_cpu_usage_seconds_total[24h])) by (namespace, pod)
  /
sum(kube_pod_container_resource_requests{resource="cpu"}) by (namespace, pod)
< 0.2`}
        </CodeBlock>
      </Accordion>

      <Accordion title="KEDA — Scale to Zero for Idle Workloads" icon={BarChart2}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          HPA has a hard minimum of 1 replica — it cannot scale workloads to zero. KEDA (Kubernetes Event-Driven Autoscaler) extends HPA with external metric triggers and supports minReplicaCount: 0. When combined with Karpenter's consolidation, idle workloads consume zero pods and zero nodes, costing nothing until load arrives.
        </p>
        <CodeBlock language="yaml">
{`# KEDA ScaledObject — scale worker based on SQS queue depth
# Scale to zero when queue is empty; scale up when messages arrive
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: order-worker-scaler
  namespace: payments-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-worker
  minReplicaCount: 0        # scale to zero when no messages
  maxReplicaCount: 50
  cooldownPeriod: 300       # wait 5 min of empty queue before scaling to zero
  pollingInterval: 15       # check SQS every 15 seconds
  triggers:
    - type: aws-sqs-queue
      authenticationRef:
        name: keda-aws-credentials   # IRSA-based auth for KEDA
      metadata:
        queueURL: https://sqs.us-east-1.amazonaws.com/123456789/order-queue
        awsRegion: us-east-1
        targetQueueLength: "10"   # 1 pod per 10 queued messages
        scaleOnInFlight: "true"   # count in-flight messages too`}
        </CodeBlock>
        <CodeBlock language="yaml">
{`# KEDA cron trigger — scale dev environment to zero overnight
# Saves ~16 hours of EC2 cost per day on non-prod environments
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: dev-cron-scaler
  namespace: payments-dev
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payments-api
  minReplicaCount: 0
  maxReplicaCount: 3
  triggers:
    - type: cron
      metadata:
        timezone: America/New_York
        start: "0 8 * * 1-5"    # scale up Monday-Friday 8 AM
        end: "0 20 * * 1-5"     # scale down Monday-Friday 8 PM
        desiredReplicas: "2"    # 2 replicas during business hours, 0 outside`}
        </CodeBlock>
        <HighlightBox>Scale-to-zero creates a cold start latency problem. First request after idle period must wait for: Karpenter to provision a new node (30-90 seconds), pod to schedule and start, container image to pull (if not cached on new node). For queue workers this is fine — the queue just backs up briefly. For APIs handling synchronous user traffic, keep minReplicaCount: 1 for prod but use 0 for dev/staging. Karpenter node caching (warm pools via EC2 launch templates) can reduce cold start to under 30 seconds.</HighlightBox>
        <CompareTable
          headers={['Trigger Type', 'Scale Based On', 'Common Use Case']}
          rows={[
            ['aws-sqs-queue', 'Queue depth + in-flight messages', 'Background workers, email senders, event processors'],
            ['prometheus', 'Any Prometheus metric', 'Custom business metrics, requests per second'],
            ['cron', 'Time schedule', 'Dev environments, batch jobs on a schedule'],
            ['aws-cloudwatch', 'CloudWatch metrics', 'Kinesis stream depth, DynamoDB throttles'],
            ['kafka', 'Consumer group lag', 'Kafka consumers that should scale with lag'],
          ]}
        />
      </Accordion>

      <Accordion title="Savings Plans and Reserved Instances — The Commitment Math" icon={DollarSign}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Spot handles variable/unpredictable workloads. Savings Plans handle the stable baseline — the capacity you know you will always run. Committing to a 1-year or 3-year plan gives 30-72% savings over on-demand pricing for that baseline.
        </p>
        <CompareTable
          headers={['Commitment Type', 'Savings', 'Flexibility', 'Best For']}
          rows={[
            ['Compute Savings Plan (1yr)', '~30%', 'Any instance family, region, OS', 'EKS workloads — instance type flexibility'],
            ['Compute Savings Plan (3yr)', '~50%', 'Same — any compute in any region', 'Long-lived stable services'],
            ['EC2 Instance Savings Plan (1yr)', '~40%', 'Fixed instance family + region', 'Predictable single-family workloads'],
            ['Reserved Instance (1yr, no upfront)', '~30%', 'Fixed instance type + AZ', 'Databases (RDS), fixed-size services'],
            ['Reserved Instance (3yr, all upfront)', '~72%', 'Fixed instance type + AZ', 'Maximum savings, lowest flexibility'],
          ]}
        />
        <CodeBlock language="bash">
{`# How to size a Savings Plan commitment:
# 1. Look at your on-demand spend over the last 30 days in Cost Explorer
# 2. Identify the stable floor — the minimum you spend even at low load
# 3. Commit to that floor; let spot handle everything above it

# Example:
# Average on-demand EC2 = $4,000/month
# After spot migration for batch/stateless: stable on-demand floor = $1,200/month
# Savings Plan commitment: $1,200/month × 12 = $14,400/year at 30% savings
# Annual savings: ~$4,320 just from the commitment discount
# Spot savings on the remaining $2,800/month: ~$1,680/month ($20,160/year)

# AWS Cost Explorer → Savings Plans → Get recommendations
# Set: lookback period 30 days, payment option No Upfront, term 1 year
# Review the hourly commitment recommendation

# Check current Savings Plans coverage (gaps = on-demand spend opportunity)
aws ce get-savings-plans-coverage \
  --time-period Start=2026-03-01,End=2026-04-01 \
  --granularity MONTHLY \
  --filter '{"Dimensions":{"Key":"SERVICE","Values":["Amazon Elastic Compute Cloud - Compute"]}}'`}
        </CodeBlock>
        <HighlightBox type="warn">Do not commit to Savings Plans before migrating to spot. The correct order: (1) Migrate stateless workloads to spot — this reduces on-demand baseline significantly. (2) Run a month with the new spot-heavy architecture. (3) Measure the stable on-demand floor. (4) Commit a Savings Plan to that floor. Committing before spot migration means you might commit to 3x more than your actual stable baseline, wasting the commitment discount on workloads that could run cheaper on spot.</HighlightBox>
      </Accordion>

      <Accordion title="Cost Visibility — Tagging and Attribution" icon={Settings}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Optimization without visibility is guesswork. The first step is cost attribution — mapping spend to the teams, services, and environments that drive it. AWS tags are the mechanism; enforcing them requires SCPs.
        </p>
        <CodeBlock language="hcl">
{`# Terraform: tag every resource at the provider level
# These tags flow to EC2, EKS nodes, RDS, ELBs, etc.
provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Environment = var.environment          # prod, staging, dev
      Team        = var.team_name            # payments, auth, platform
      Service     = var.service_name         # payments-api, auth-service
      ManagedBy   = "terraform"
      Repository  = var.repo_name
    }
  }
}

# SCP: deny resource creation without required tags
# Attach to the OU containing all workload accounts
resource "aws_organizations_policy" "require_tags" {
  name        = "require-cost-tags"
  type        = "SERVICE_CONTROL_POLICY"
  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Deny"
      Action = [
        "ec2:RunInstances",
        "rds:CreateDBInstance",
        "elasticloadbalancing:CreateLoadBalancer"
      ]
      Resource = "*"
      Condition = {
        "Null" = {
          "aws:RequestedRegion" = "false"  # not the condition we want
          # Real condition — deny if tag not present:
          "aws:RequestTag/Team"        = "true"
          "aws:RequestTag/Environment" = "true"
          "aws:RequestTag/Service"     = "true"
        }
      }
    }]
  })
}`}
        </CodeBlock>
        <CodeBlock language="bash">
{`# AWS Cost Explorer: break down spend by tag
# Run monthly to identify cost drivers per team/service

# CLI: get costs grouped by Team tag, last 30 days
aws ce get-cost-and-usage \
  --time-period Start=2026-03-01,End=2026-04-01 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=TAG,Key=Team

# Find untagged resources (cost cannot be attributed)
aws ce get-cost-and-usage \
  --time-period Start=2026-03-01,End=2026-04-01 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter '{"Tags":{"Key":"Team","MatchOptions":["ABSENT"]}}'

# OpenCost — Kubernetes namespace-level cost attribution
# Breaks down EC2 node cost by namespace/pod based on requests/usage
kubectl port-forward -n opencost svc/opencost 9090
# Access UI at localhost:9090 — shows cost per namespace, deployment, label`}
        </CodeBlock>
        <HighlightBox type="tip">OpenCost (or Kubecost) provides Kubernetes-aware cost attribution. AWS Cost Explorer shows cost by EC2 node but not by which pod/namespace on that node. OpenCost allocates node cost to pods proportionally based on resource requests, then rolls up to namespace and deployment. This answers "which team's workload is driving that EC2 spend" — impossible to answer with AWS tags alone when multiple teams share nodes.</HighlightBox>
        <CompareTable
          headers={['Tool', 'What It Shows', 'Granularity', 'Cost']}
          rows={[
            ['AWS Cost Explorer', 'AWS service costs by tag, account, region', 'Account/service/tag level', 'Free (limited API calls)'],
            ['AWS Compute Optimizer', 'EC2/ECS/Lambda right-sizing recommendations', 'Per resource', 'Free'],
            ['OpenCost', 'K8s cost by namespace, pod, label', 'Pod/namespace/team', 'Free (open source)'],
            ['Kubecost', 'K8s cost allocation + savings recommendations', 'Pod level + alerts', 'Free tier; paid for enterprise'],
            ['Datadog Cost Management', 'Cloud cost + observability in one view', 'Resource + trace correlation', 'Paid — part of Datadog subscription'],
          ]}
        />
      </Accordion>

      <Accordion title="Data Transfer Costs — The Hidden Bill" icon={AlertTriangle}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Data transfer is frequently the second-largest AWS cost item, and the one engineers are least aware of. EC2 egress to the internet, cross-region traffic, and cross-AZ traffic all incur charges. Cross-AZ traffic at $0.01/GB sounds small but adds up fast in microservice architectures where services communicate constantly.
        </p>
        <CompareTable
          headers={['Traffic Type', 'Cost', 'Reduction Strategy']}
          rows={[
            ['EC2 to internet (egress)', '$0.09/GB (first 10TB)', 'CloudFront CDN for static assets and cacheable APIs — reduces origin egress'],
            ['Cross-AZ traffic', '$0.01/GB each direction', 'Topology-aware routing, colocate chatty services, avoid unnecessary cross-AZ hops'],
            ['Cross-region traffic', '$0.02/GB (varies)', 'Replicate data to destination region, minimize cross-region API calls'],
            ['NAT Gateway egress', '$0.045/GB processed', 'VPC endpoints for S3/DynamoDB/ECR — bypass NAT, reduce cost to $0 for those services'],
            ['Ingress from internet', 'Free', 'No cost optimization needed'],
          ]}
        />
        <CodeBlock language="bash">
{`# Find your biggest data transfer costs
aws ce get-cost-and-usage \
  --time-period Start=2026-03-01,End=2026-04-01 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter '{"Dimensions":{"Key":"USAGE_TYPE_GROUP","Values":["EC2: Data Transfer - Internet"]}}' \
  --group-by Type=DIMENSION,Key=USAGE_TYPE

# VPC endpoints eliminate NAT Gateway cost for AWS service traffic
# S3, DynamoDB, ECR — all can use VPC gateway/interface endpoints
# ECR image pulls from EKS nodes go through NAT without VPC endpoint
# With VPC endpoint: ECR traffic stays in AWS backbone, no NAT Gateway charge

# Estimated savings: large cluster pulling images frequently
# 50 nodes × 10 image pulls/day × 500MB/pull = 250GB/day through NAT
# Cost: 250GB × $0.045 = $11.25/day = $337/month → $0 with VPC endpoint`}
        </CodeBlock>
        <HighlightBox>Topology-aware routing (Kubernetes 1.27+ stable) prefers routing pod traffic to endpoints in the same AZ. Without it, a Service with pods in 3 AZs routes traffic round-robin — 2/3 of requests go cross-AZ ($0.01/GB each direction). With topology-aware routing enabled via annotation, kube-proxy prefers local-AZ endpoints. For chatty internal services making thousands of calls per second, this can eliminate most cross-AZ data transfer costs. Enable with: <code>service.kubernetes.io/topology-mode: auto</code> on the Service.</HighlightBox>
      </Accordion>
    </div>
  );
}
