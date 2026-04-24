// Senior DevOps interview questions — 25 total across 7 categories.
// Each question has model answer + keyPoints the interviewer listens for,
// an optional follow-up probing question, and links to relevant KB pages.

export const interviewCategories = [
  {
    id: 'kubernetes',
    label: 'Kubernetes',
    description: 'Scheduling, networking, control plane, day-2 ops',
    accent: 'blue',
  },
  {
    id: 'networking',
    label: 'Networking',
    description: 'VPC, ingress, service mesh, DNS, CNI',
    accent: 'teal',
  },
  {
    id: 'multi-region',
    label: 'Multi-Region',
    description: 'Failover, data replication, latency, blast radius',
    accent: 'purple',
  },
  {
    id: 'autoscaling',
    label: 'Autoscaling',
    description: 'HPA, VPA, Karpenter, right-sizing, cost control',
    accent: 'green',
  },
  {
    id: 'incident',
    label: 'Incident Response',
    description: 'Triage, comms, postmortems, blameless culture',
    accent: 'orange',
  },
  {
    id: 'gitops',
    label: 'GitOps',
    description: 'ArgoCD, sync policies, drift, secrets, promotion',
    accent: 'yellow',
  },
  {
    id: 'security',
    label: 'Security',
    description: 'IAM, secrets, supply chain, network policy, RBAC',
    accent: 'red',
  },
];

export const interviewQuestions = [
  // ───────────── Kubernetes (4) ─────────────
  {
    id: 'k8s-001',
    category: 'kubernetes',
    level: 'senior',
    question:
      'Walk me through what happens when you run `kubectl apply -f deployment.yaml` — from API call to running pod.',
    answer:
      'kubectl validates the manifest client-side, then POSTs to the API server, which authenticates (mTLS or OIDC token), authorizes via RBAC, and runs admission controllers (mutating first — e.g. a sidecar injector, then validating — e.g. OPA/Kyverno). The Deployment is persisted to etcd. The Deployment controller sees the new object and creates a ReplicaSet; the ReplicaSet controller creates Pod objects. The scheduler picks a node using predicates (resources, taints, affinity) and priorities, then writes `nodeName` on the pod. The kubelet on that node watches for pods assigned to it, pulls the image via containerd/CRI, calls the CNI to set up the pod network namespace, and starts the containers. kube-proxy or the CNI programs iptables/IPVS/eBPF so the Service endpoint reaches the new pod.',
    keyPoints: [
      'API server: authn, authz (RBAC), admission (mutating then validating)',
      'etcd is the source of truth',
      'Deployment controller creates ReplicaSet; ReplicaSet creates Pods',
      'Scheduler binds pod to node (predicates + priorities)',
      'kubelet + CRI + CNI actually run the containers',
      'kube-proxy / CNI updates data plane so Service routes to the new pod',
    ],
    followUp:
      'Where could you add a policy that blocks pods without resource limits?',
    kbLinks: [
      { path: '/knowledge/k8s-core', label: 'Kubernetes Core' },
      { path: '/knowledge/eks-internals', label: 'EKS Internals' },
    ],
  },
  {
    id: 'k8s-002',
    category: 'kubernetes',
    level: 'senior',
    question:
      'A pod is stuck in `Pending`. Give me the checklist you work through, in order.',
    answer:
      'First `kubectl describe pod` and read the Events. The usual causes: (1) insufficient cluster capacity — node CPU/memory requests can\'t fit the pod, triggers cluster autoscaler or Karpenter if present; (2) taints/tolerations mismatch; (3) node affinity / nodeSelector that nothing matches; (4) PVC unbound — no storage class or provisioner failing; (5) image pull secrets missing so the pod can\'t even be scheduled if it references a private registry pre-pull; (6) pod has too-strict topology spread constraints. Then check `kubectl get events --sort-by=.lastTimestamp` at the namespace level, the scheduler logs, and node conditions (MemoryPressure, DiskPressure). If autoscaler should have added nodes, check the ASG / Karpenter NodePool for quota, subnet capacity, or failing launch templates.',
    keyPoints: [
      'kubectl describe pod + Events first',
      'Capacity / resource requests vs node allocatable',
      'Taints & tolerations, nodeSelector, affinity',
      'PVC binding / CSI / storage class',
      'Autoscaler behaviour (CA or Karpenter) and quota',
      'Node conditions and scheduler logs',
    ],
    followUp:
      'Same pod runs fine in a different cluster. What changes your hypothesis?',
    kbLinks: [
      { path: '/knowledge/k8s-core', label: 'Kubernetes Core' },
      { path: '/knowledge/karpenter', label: 'Karpenter' },
    ],
  },
  {
    id: 'k8s-003',
    category: 'kubernetes',
    level: 'senior',
    question:
      'Design a rolling upgrade of a 200-node EKS cluster with zero downtime for stateful services.',
    answer:
      'Pre-work: make sure every workload has PodDisruptionBudgets with `minAvailable` or `maxUnavailable`, readiness probes that are honest about warmup, and graceful termination (preStop hook + terminationGracePeriod). For stateful services, confirm the StorageClass allows dynamic reattach across AZs or use topology-aware volume provisioning. Run the control plane upgrade first (EKS handles it), then node groups one AZ at a time: cordon + drain respecting PDBs, let the scheduler recreate pods on new nodes, wait for readiness. For stateful sets, use `OnDelete` or `RollingUpdate` with `partition` to go pod by pod and validate leader election/replication lag before proceeding. Have a rollback plan: keep the old node group warm until the new one has run prod traffic for at least one business cycle.',
    keyPoints: [
      'PDBs, readiness probes, graceful termination / preStop',
      'Control plane upgrade before data plane',
      'Node group rotation (blue/green or per-AZ)',
      'Stateful workloads: volumes, leader election, replication lag',
      'Validation gates + keep old nodes for rollback',
    ],
    followUp:
      'Halfway through, etcd latency spikes. What do you do?',
    kbLinks: [
      { path: '/knowledge/aws-eks', label: 'AWS EKS' },
      { path: '/knowledge/k8s-patterns', label: 'K8s Patterns' },
    ],
  },
  {
    id: 'k8s-004',
    category: 'kubernetes',
    level: 'mid',
    question:
      'Explain the difference between a Deployment, a StatefulSet, and a DaemonSet and when you pick each.',
    answer:
      'Deployment: stateless, pods are fungible, rolling update replaces pods in any order, backed by a ReplicaSet. Use for web/API tier. StatefulSet: pods have stable identity (ordinal name, stable network identity via headless Service, stable PVC per pod) and are started/stopped in order. Use for databases, brokers, consensus systems. DaemonSet: one pod per matching node. Use for node-level agents (log shippers, CNI, CSI, monitoring, kube-proxy replacements). Pick based on: does each instance need a persistent identity and storage? Does it need to run on every node? Otherwise Deployment is the default.',
    keyPoints: [
      'Deployment = stateless, fungible pods, ReplicaSet',
      'StatefulSet = stable identity, ordered, per-pod PVC',
      'DaemonSet = one per node, for node agents',
      'Decision driver is identity + storage + placement',
    ],
    followUp:
      'Could you run Kafka on a Deployment? Why not?',
    kbLinks: [{ path: '/knowledge/k8s-core', label: 'Kubernetes Core' }],
  },

  // ───────────── Networking (3) ─────────────
  {
    id: 'net-001',
    category: 'networking',
    level: 'senior',
    question:
      'A client in VPC-A cannot reach an internal ALB in VPC-B via a peering connection. Walk me through the debug.',
    answer:
      'Verify layer by layer. (1) Routing: route tables in both VPCs must have a route for the other VPC\'s CIDR pointing to the peering connection. (2) Security groups: the ALB SG must allow the client SG or CIDR on the target port; the client SG must allow egress. (3) NACLs: stateless, check both directions on both subnets. (4) ALB: is it `internal` scheme and are the target subnets reachable? Cross-zone load balancing on? (5) DNS: is the client resolving the private hostname? If Route 53 private hosted zone, it must be associated with the client\'s VPC. (6) Overlapping CIDRs break peering silently — confirm CIDRs don\'t overlap. Use Reachability Analyzer or VPC Flow Logs to confirm where the packet dies.',
    keyPoints: [
      'Route tables on both sides of the peering',
      'Security groups (stateful) + NACLs (stateless)',
      'ALB scheme = internal, subnets, cross-zone',
      'Private hosted zone association with client VPC',
      'No overlapping CIDRs on peering',
      'Reachability Analyzer / Flow Logs for evidence',
    ],
    followUp:
      'Transit Gateway vs VPC peering — when do you pick which?',
    kbLinks: [
      { path: '/knowledge/aws-networking', label: 'AWS Networking' },
      { path: '/knowledge/networking', label: 'Networking Fundamentals' },
    ],
  },
  {
    id: 'net-002',
    category: 'networking',
    level: 'senior',
    question:
      'Design the ingress path for a multi-tenant SaaS running on EKS. Each tenant needs a custom domain and TLS.',
    answer:
      'One ALB Ingress Controller (AWS LBC) fronted by Route 53. For custom domains, each tenant adds a CNAME to a platform-owned hostname; we use ACM for TLS. Two good patterns: (a) one ALB, many listeners/certs via SNI — the LBC supports multiple certs per listener up to 25, beyond that you shard across ALBs; (b) per-tenant Ingress with `alb.ingress.kubernetes.io/group.name` so several Ingresses share one ALB. For cert automation, use ACM with DNS validation if the platform owns the zone, or cert-manager + ACME DNS-01 with delegated subdomains for BYO-domains. Add WAF at the ALB for rate limiting and bot controls, and use target-type=ip so pods are direct targets (no extra node hop).',
    keyPoints: [
      'ALB + AWS Load Balancer Controller',
      'IngressGroup to share one ALB across many Ingresses',
      'ACM for platform domains, cert-manager for BYO domains',
      'SNI for multi-cert, shard ALBs beyond limits',
      'WAF at the edge, target-type=ip for direct pod targets',
    ],
    followUp:
      'Tenant gets DDoSed. Blast radius?',
    kbLinks: [
      { path: '/knowledge/aws-networking', label: 'AWS Networking' },
      { path: '/knowledge/request-flow', label: 'Request Flow' },
    ],
  },
  {
    id: 'net-003',
    category: 'networking',
    level: 'mid',
    question:
      'Explain how a pod in one node talks to a pod on another node in a typical CNI (e.g. VPC CNI).',
    answer:
      'With AWS VPC CNI, each pod gets a real VPC ENI-backed IP from the subnet, so pod-to-pod is just native VPC routing — no overlay. The CNI assigns an IP from a warm pool on the node, attaches a secondary ENI if needed, and programs iptables/route rules inside the node for pod-veth routing. Cross-node traffic leaves the source ENI, goes through the VPC fabric, and arrives at the destination pod\'s ENI. Security groups can be attached per-pod (SGP). Compared to overlay CNIs like Calico VXLAN or Cilium with tunneling, there\'s no encapsulation overhead but you consume real VPC IPs, so capacity planning matters (IP prefix mode gives /28 per ENI for density).',
    keyPoints: [
      'VPC CNI = real VPC IPs per pod, no overlay',
      'Warm pool of IPs per node, secondary ENIs for capacity',
      'Cross-node routed by VPC itself',
      'SecurityGroupsForPods for per-pod SGs',
      'IP prefix delegation for density',
    ],
    followUp:
      'What changes if you switched to Cilium in tunneling mode?',
    kbLinks: [{ path: '/knowledge/aws-networking', label: 'AWS Networking' }],
  },

  // ───────────── Multi-Region (3) ─────────────
  {
    id: 'mr-001',
    category: 'multi-region',
    level: 'senior',
    question:
      'Design an active-active multi-region deployment for a payments API. Walk me through data, traffic, and failure modes.',
    answer:
      'Traffic: Route 53 latency-based or geo routing to regional ALBs, health checks on `/healthz` with shallow and deep variants. Each region runs its own EKS cluster behind its own ALB. Data: the hard part. Options — (a) Aurora Global Database with writer in one region, readers everywhere, promote on failover (RPO seconds, RTO ~1 min, but not truly active-active for writes); (b) DynamoDB Global Tables for true active-active, accept last-writer-wins and design for idempotent writes; (c) event sourcing with Kafka MirrorMaker / MSK replication and regional materialized views. For payments specifically you need idempotency keys end-to-end so retries after a region flip don\'t double-charge. Secrets: regional KMS keys, replicate secrets via Secrets Manager multi-region. Failure modes: region isolation (shed traffic via Route 53 health check), split-brain (prefer one writer for ledger entries), cross-region latency spikes (circuit breakers, bulkheads).',
    keyPoints: [
      'Route 53 latency/geo + ALB per region',
      'Data tier drives the design: Aurora Global vs DynamoDB Global vs event-sourced',
      'Idempotency keys are non-negotiable for payments',
      'Regional KMS + multi-region secrets',
      'Failover plan: health checks, circuit breakers, split-brain handling',
      'Test the failover — gameday drill',
    ],
    followUp:
      'What\'s your RTO/RPO target and how do you actually measure it?',
    kbLinks: [
      { path: '/knowledge/system-design', label: 'System Design' },
      { path: '/knowledge/aws-networking', label: 'AWS Networking' },
    ],
  },
  {
    id: 'mr-002',
    category: 'multi-region',
    level: 'senior',
    question:
      'You\'re migrating from single-region to multi-region. What order do you do the work in and why?',
    answer:
      'Data first. Stand up read replicas in the second region and validate replication lag under real load before anything else — the app tier is portable, data isn\'t. Then build the second region\'s cluster, network, and observability in parallel with prod, idle. Deploy the app to region-B taking traffic only from internal testers. Shift 1% of real traffic via Route 53 weighted routing, watch error rates and latency. Ramp to 10%, then 50/50. Only after steady-state at 50/50 do you promote any region to "primary write" or flip to active-active if the data model supports it. Keep runbooks for failback and test a controlled region-out drill before declaring done.',
    keyPoints: [
      'Data tier is the gating item — replication first',
      'Stand up region-B in parallel, idle',
      'Incremental traffic shift (1% → 10% → 50%)',
      'Observability parity before cutover',
      'Failback plan + gameday',
    ],
    followUp:
      'When would you refuse multi-region and push back on the requirement?',
    kbLinks: [{ path: '/knowledge/system-design', label: 'System Design' }],
  },
  {
    id: 'mr-003',
    category: 'multi-region',
    level: 'mid',
    question:
      'What\'s the difference between multi-AZ and multi-region, and when is multi-AZ enough?',
    answer:
      'Multi-AZ = multiple data centers within one region, typically <2ms apart, connected by dedicated fiber. Protects you from a single AZ outage (power, network, cooling). Multi-region = geographically separate regions, tens to hundreds of ms apart, independent control planes. Protects you from a regional outage, regional service failure, or geographic disaster. Multi-AZ is enough when your SLO tolerates a full-region outage (rare, usually hours) and you don\'t have data-residency needs pulling you into multiple regions. Multi-region is necessary when you need <99.99% region-independent availability, compliance (data sovereignty), or latency close to users globally. Multi-region adds real cost and complexity — don\'t default to it.',
    keyPoints: [
      'Multi-AZ protects against AZ-level failure, low latency',
      'Multi-region protects against region failure, high latency',
      'SLO and data residency drive the choice',
      'Multi-region adds cost + complexity — justify it',
    ],
    followUp:
      'What AWS services are regional vs global? Why does that matter?',
    kbLinks: [{ path: '/knowledge/aws-networking', label: 'AWS Networking' }],
  },

  // ───────────── Autoscaling (3) ─────────────
  {
    id: 'as-001',
    category: 'autoscaling',
    level: 'senior',
    question:
      'Compare Cluster Autoscaler and Karpenter. Why did the industry largely move to Karpenter?',
    answer:
      'Cluster Autoscaler works at the ASG / node-group level: you pre-define instance types per ASG, and it scales the ASG up/down when there are unschedulable pods or idle nodes. Slow (minutes), bin-packing is limited to what\'s in the ASG, and you end up managing many ASGs for different workload shapes. Karpenter is a scheduler-integrated provisioner: it looks at pending pods directly, picks the cheapest instance type(s) from a wide pool that fits the pods\' requirements (including spot diversification), and launches nodes in seconds. It also consolidates underutilized nodes by rescheduling pods onto fewer/smaller instances. Net: faster scale-up, better bin-packing, lower cost, much less config. The trade-off is Karpenter owns more of the scheduling decision, so you need NodePool constraints (instance families, AZs, OS) and disruption budgets to keep it well-behaved.',
    keyPoints: [
      'CA scales ASGs, Karpenter provisions nodes directly',
      'Karpenter: faster, better bin-pack, wider instance pool, consolidation',
      'CA: predictable, per-ASG config overhead',
      'Karpenter needs NodePool + disruption controls',
      'Cost + speed are the main wins',
    ],
    followUp:
      'How does Karpenter handle spot interruptions without breaking SLOs?',
    kbLinks: [{ path: '/knowledge/karpenter', label: 'Karpenter' }],
  },
  {
    id: 'as-002',
    category: 'autoscaling',
    level: 'senior',
    question:
      'HPA scales your API on CPU but during traffic spikes you still see errors. What\'s going on and how do you fix it?',
    answer:
      'CPU is a lagging indicator. By the time CPU crosses the threshold the queue is already backing up. Fixes: (1) scale on a leading metric — request rate, queue depth, p95 latency — via the external-metrics API (KEDA is the common choice, using CloudWatch/Prometheus/SQS). (2) Tune HPA behavior: lower stabilization window for scale-up, higher for scale-down, and allow larger step sizes. (3) Pre-scale before known peaks with a scheduled scaler. (4) Don\'t ignore cold start — pods take seconds to become ready; add readiness gate + keep a warm baseline. (5) Check that the cluster has nodes to schedule onto — HPA scaling the replica count is useless if Karpenter / CA can\'t add capacity fast enough.',
    keyPoints: [
      'CPU is lagging — use request rate / queue depth / latency via KEDA',
      'HPA behavior tuning: stabilization, step size',
      'Scheduled pre-scale for known peaks',
      'Warm pool + readiness to absorb cold starts',
      'Pod autoscaling is useless without node capacity',
    ],
    followUp:
      'When would you use VPA alongside HPA? What breaks if you do it naively?',
    kbLinks: [
      { path: '/knowledge/k8s-core', label: 'Kubernetes Core' },
      { path: '/knowledge/karpenter', label: 'Karpenter' },
    ],
  },
  {
    id: 'as-003',
    category: 'autoscaling',
    level: 'mid',
    question:
      'Explain requests vs limits. What happens if you set limit but no request, or vice versa?',
    answer:
      'Requests = what the scheduler reserves for the pod; decides placement and is the basis for HPA and cluster autoscaler decisions. Limits = the upper bound the kernel will enforce (CPU throttled, memory OOM-killed when exceeded). If you set a limit but no request, Kubernetes sets request = limit (Guaranteed QoS) — fine but wasteful. If you set a request but no limit, the pod can burst freely above request (Burstable QoS) — good for latency-sensitive work but risks noisy-neighbor CPU and uncapped memory that can OOM the node. Best practice: set realistic CPU requests, usually no CPU limit (to avoid throttling), and set memory request = memory limit so the pod either fits or gets rescheduled. Use VPA recommendations as a starting point.',
    keyPoints: [
      'Request = scheduling + autoscaling baseline',
      'Limit = kernel-enforced ceiling (CPU throttle, memory OOM)',
      'QoS classes: Guaranteed / Burstable / BestEffort',
      'Common pattern: CPU request only, memory request==limit',
      'VPA for data-driven sizing',
    ],
    followUp:
      'Why do people say "don\'t set CPU limits"? Always true?',
    kbLinks: [{ path: '/knowledge/k8s-core', label: 'Kubernetes Core' }],
  },

  // ───────────── Incident Response (3) ─────────────
  {
    id: 'ir-001',
    category: 'incident',
    level: 'senior',
    question:
      'Production is down. Walk me through your first 15 minutes as the on-call.',
    answer:
      'Minute 0-2: acknowledge the page so the team knows someone has it. Open the incident channel (Slack/Zoom), declare severity based on user impact not guesswork. Minute 2-5: triage — what changed? Check the deploy timeline first, then dashboards (error rate, latency, saturation, traffic — the RED and USE signals). Minute 5-10: stop the bleeding — roll back the latest deploy, disable the feature flag, shed traffic, scale up, whatever restores service fastest. Don\'t debug root cause yet. Minute 10-15: communicate — status page update, stakeholder summary ("we see X, we\'re doing Y, next update in 15m"). Pull in whoever owns the subsystem. Keep a running timeline in the channel; it\'s the postmortem later.',
    keyPoints: [
      'Ack the page fast, declare severity',
      'First question: what changed? Deploy timeline',
      'Stop the bleeding before debugging',
      'Rollback / flag flip / traffic shed are all valid tools',
      'Communicate early, often, with a next-update ETA',
      'Timeline in the channel doubles as postmortem input',
    ],
    followUp:
      'Rollback didn\'t fix it. What\'s your next move?',
    kbLinks: [
      { path: '/knowledge/incident', label: 'Incident Response' },
      { path: '/knowledge/sre', label: 'SRE' },
    ],
  },
  {
    id: 'ir-002',
    category: 'incident',
    level: 'senior',
    question:
      'Tell me about a time you ran a postmortem that actually changed how your team worked.',
    answer:
      '[Candidate-specific.] The interviewer is listening for: blameless framing (systems and processes, not people), a timeline anchored in evidence (metrics, logs, chat screenshots), root cause via "5 whys" or similar — not just the trigger, clear distinction between contributing factors and root cause, and concrete follow-up actions with owners and due dates. Bonus: tracking the follow-ups to completion, and measuring whether the change actually reduced recurrence. Good answer includes one thing the team kept doing wrong before the incident that the postmortem surfaced as systemic.',
    keyPoints: [
      'Blameless — systems, not people',
      'Evidence-anchored timeline',
      'Root cause vs contributing factors',
      'Action items with owners + due dates',
      'Follow-through and measurement of change',
    ],
    followUp:
      'Ever had a postmortem that didn\'t lead to any action? What happened?',
    kbLinks: [{ path: '/knowledge/incident', label: 'Incident Response' }],
  },
  {
    id: 'ir-003',
    category: 'incident',
    level: 'mid',
    question:
      'Define SLO, SLI, and error budget. How do you use them in practice?',
    answer:
      'SLI = a measured metric (e.g. % of requests that return 2xx/3xx in <300ms). SLO = a target on that SLI (e.g. 99.9% over 28 days). Error budget = 100% - SLO = the allowed failure (e.g. 0.1% = ~40 min/month). In practice: if you\'re inside the budget, feature velocity is prioritized. If you\'re burning budget, you freeze risky deploys and invest in reliability. Error budget policy is an agreement between product and platform teams — it turns "is this reliable enough?" from a feeling into a number. The SLI must measure user-visible behavior (not just CPU), and the SLO must be achievable and meaningful — over-aggressive SLOs become noise.',
    keyPoints: [
      'SLI = measurement, SLO = target, budget = allowed failure',
      'User-visible SLIs, not infra-metric SLIs',
      'Budget drives the deploy-freeze / invest-in-reliability decision',
      'It\'s a product-engineering contract',
      'Over-aggressive SLOs are worse than none',
    ],
    followUp:
      'Your SLO is 99.9% but latency p99 is creeping up. Is that an SLO miss?',
    kbLinks: [
      { path: '/knowledge/sre', label: 'SRE' },
      { path: '/knowledge/observability', label: 'Observability' },
    ],
  },

  // ───────────── GitOps (3) ─────────────
  {
    id: 'go-001',
    category: 'gitops',
    level: 'senior',
    question:
      'You inherit an ArgoCD setup with constant drift. How do you diagnose and fix it?',
    answer:
      'First, separate benign drift (controllers mutating fields ArgoCD doesn\'t know to ignore — HPA replicas, defaults) from real drift (someone kubectl-applying changes out of band). Tools: `argocd app diff`, `argocd app get`, and the UI. For benign drift: add `ignoreDifferences` (JSON pointers or jq) per app or globally, or use `ServerSideApply=true` so Argo and the controller co-own fields cleanly. For out-of-band changes: enable `selfHeal=true` on automated sync policy so Argo reverts them; enforce RBAC that prevents direct cluster write access outside the Argo service account. Longer term, make Git the only write path: read-only kubectl for humans, break-glass only. Also check sync waves / hooks — misordered resources can look like drift when really it\'s a race.',
    keyPoints: [
      'Distinguish benign drift from real drift',
      'ignoreDifferences + ServerSideApply for benign',
      'selfHeal + RBAC for real drift',
      'Git as the only write path; break-glass only',
      'Sync waves / hooks can masquerade as drift',
    ],
    followUp:
      'How do you do progressive rollout with ArgoCD? Rollbacks?',
    kbLinks: [
      { path: '/knowledge/argocd', label: 'ArgoCD' },
      { path: '/knowledge/argo-rollouts', label: 'Argo Rollouts' },
    ],
  },
  {
    id: 'go-002',
    category: 'gitops',
    level: 'senior',
    question:
      'Design a GitOps promotion flow from dev → staging → prod across multiple clusters.',
    answer:
      'Repo layout: one "apps" repo per team (Helm/Kustomize overlays), one "platform" repo with ArgoCD ApplicationSets generating apps per-cluster from a matrix (env × cluster × app). Promotion = a PR that bumps an image tag or chart version in the next environment\'s values file. Dev auto-syncs on every commit. Staging auto-syncs but requires the image to pass CI + e2e. Prod is manual sync or requires a PR-merge + approval. For multi-cluster: ApplicationSet with cluster generator pulls from the ArgoCD cluster registry; each cluster has its own overlay. Use Argo Rollouts in prod for canary/blue-green. Keep secrets out of Git — sealed-secrets, SOPS, or External Secrets Operator pulling from a secrets manager.',
    keyPoints: [
      'Separate app repo and platform/config repo',
      'ApplicationSet for multi-cluster/env fan-out',
      'Promotion = PR that bumps version in next env',
      'Manual gate + rollouts for prod',
      'Secrets via SOPS / sealed-secrets / ESO — never in Git',
    ],
    followUp:
      'How do you roll back a bad promotion without losing audit trail?',
    kbLinks: [
      { path: '/knowledge/argocd', label: 'ArgoCD' },
      { path: '/knowledge/ci-cd', label: 'CI/CD' },
    ],
  },
  {
    id: 'go-003',
    category: 'gitops',
    level: 'mid',
    question:
      'Explain GitOps in one minute to a backend engineer who\'s never used it.',
    answer:
      'Git is the source of truth for "what should be running." A controller in the cluster (ArgoCD or Flux) continuously compares the live state to Git and reconciles any difference. You don\'t `kubectl apply` — you open a PR. Benefits: every change is reviewed, audited, and reversible (git revert = rollback); onboarding a new environment = point the controller at a folder; drift is detected automatically. The shift in mindset: "deploying" is no longer a command you run, it\'s a commit that merges.',
    keyPoints: [
      'Git = source of truth for desired state',
      'Controller reconciles live → desired continuously',
      'PR-based change = review + audit + easy rollback',
      'No more kubectl apply from laptops',
      'Drift detection is automatic',
    ],
    followUp:
      'When is GitOps the wrong answer?',
    kbLinks: [{ path: '/knowledge/argocd', label: 'ArgoCD' }],
  },

  // ───────────── Security (3) ─────────────
  {
    id: 'sec-001',
    category: 'security',
    level: 'senior',
    question:
      'A pod in your EKS cluster needs to read from an S3 bucket. Walk me from "no access" to "least-privilege production setup."',
    answer:
      'The right answer is IRSA (IAM Roles for Service Accounts) — or EKS Pod Identity on newer clusters. Steps: (1) create an IAM role with a trust policy that trusts the cluster\'s OIDC provider AND scopes the trust to a specific namespace/ServiceAccount via the `sub` claim. (2) attach a tightly-scoped IAM policy — only the specific bucket ARN, only the actions needed (`s3:GetObject` not `s3:*`), with resource-level conditions (key prefix, aws:SourceVpc) where possible. (3) annotate the ServiceAccount with the role ARN. (4) reference that ServiceAccount from the pod spec. The pod automatically gets temporary credentials via STS — no long-lived keys, rotated hourly, audited in CloudTrail. Never use instance profiles for app credentials (the whole node gets them). Never put keys in env vars or Secrets.',
    keyPoints: [
      'IRSA (OIDC) or EKS Pod Identity — never node instance profile',
      'Trust policy scoped to specific SA via OIDC sub claim',
      'IAM policy: specific bucket ARN, specific actions, conditions',
      'Annotate SA with role ARN, reference SA from pod',
      'STS-issued short-lived creds, audited in CloudTrail',
    ],
    followUp:
      'How is EKS Pod Identity different from IRSA?',
    kbLinks: [
      { path: '/knowledge/aws-iam', label: 'AWS IAM' },
      { path: '/knowledge/secrets', label: 'Secrets' },
    ],
  },
  {
    id: 'sec-002',
    category: 'security',
    level: 'senior',
    question:
      'How do you prevent a compromised pod from exfiltrating data or attacking other pods?',
    answer:
      'Defense in depth. (1) Pod security: runAsNonRoot, readOnlyRootFilesystem, drop ALL capabilities, no host namespaces, seccompProfile=RuntimeDefault. Enforce via Pod Security admission or Kyverno/OPA. (2) Network: default-deny NetworkPolicy per namespace, then explicit allow lists for required traffic. In-cluster east-west + egress policies. For stronger L7 policy, Cilium network policies or a service mesh with mTLS. (3) Image supply chain: signed images (cosign + sigstore), admission policy that only allows signed images from approved registries, SBOM scanning. (4) Runtime: Falco or similar to detect shell-in-container, kernel syscalls outside baseline. (5) IAM: scoped IRSA role per workload so compromise doesn\'t grant the whole account. (6) Secrets: short-lived, never in env vars where they leak into crash dumps.',
    keyPoints: [
      'Pod security context: non-root, no caps, RO rootfs',
      'Default-deny NetworkPolicy + explicit allow',
      'Signed images + admission policy (cosign)',
      'Runtime detection (Falco)',
      'Per-workload IRSA, short-lived secrets',
      'Defense in depth — no single control',
    ],
    followUp:
      'You find `curl | sh` in a Dockerfile during a PR review. What do you say?',
    kbLinks: [
      { path: '/knowledge/secrets', label: 'Secrets' },
      { path: '/knowledge/k8s-patterns', label: 'K8s Patterns' },
    ],
  },
  {
    id: 'sec-003',
    category: 'security',
    level: 'mid',
    question:
      'Compare Kubernetes Secrets, AWS Secrets Manager, and HashiCorp Vault. When do you pick each?',
    answer:
      'Kubernetes Secrets: base64 — not encrypted by default (unless you enable encryption-at-rest with KMS), anyone with get/list RBAC on the namespace sees them. Fine for low-sensitivity values or as a delivery mechanism. AWS Secrets Manager: managed, encrypted, audited via CloudTrail, supports automatic rotation for RDS/RedShift, IAM-controlled. Best for AWS-native apps. Vault: provider-agnostic, advanced features (dynamic secrets that are generated on-demand and expire, PKI engine, transit encryption-as-a-service, fine-grained policy). Best for multi-cloud, stricter compliance, or when you need dynamic DB creds. In practice on EKS: External Secrets Operator pulls from Secrets Manager/Vault and projects as K8s Secrets, so pods use the K8s API but the source of truth is the manager.',
    keyPoints: [
      'K8s Secret = base64, needs encryption-at-rest + RBAC',
      'Secrets Manager = AWS-native, rotation, CloudTrail',
      'Vault = multi-cloud, dynamic secrets, fine-grained',
      'External Secrets Operator bridges external → K8s',
      'Pick based on cloud footprint + rotation needs',
    ],
    followUp:
      'What\'s a dynamic secret and why is it better than a rotated static one?',
    kbLinks: [
      { path: '/knowledge/secrets', label: 'Secrets' },
      { path: '/knowledge/aws-iam', label: 'AWS IAM' },
    ],
  },

  // ───────────── Remaining 3 to reach 25 ─────────────
  {
    id: 'k8s-005',
    category: 'kubernetes',
    level: 'senior',
    question:
      'A Service\'s endpoints list is empty even though the pods are Running. What could be wrong?',
    answer:
      'Endpoints are populated by the endpoints controller based on the Service\'s selector matching pod labels AND the pods passing readiness. Likely causes: (1) selector/label mismatch — `kubectl get pods -l <selector>` returns nothing; (2) pods are Running but not Ready — readiness probe failing; (3) using EndpointSlices and the controller isn\'t publishing — rare but possible; (4) named target port on Service doesn\'t match any container port name; (5) dual-stack mismatch — Service is IPv4 only but pods only have IPv6. Verify with `kubectl get endpoints <svc>` and `kubectl describe svc`. If endpoints are populated but traffic still fails, move down to kube-proxy / CNI / NetworkPolicy.',
    keyPoints: [
      'Endpoints = selector match × readiness',
      'Check label selector alignment',
      'Readiness probe state',
      'Named port mismatch',
      'IP family / dual-stack',
      'kubectl get endpoints / describe svc',
    ],
    followUp:
      'Endpoints populate but traffic times out. Now where do you look?',
    kbLinks: [{ path: '/knowledge/k8s-core', label: 'Kubernetes Core' }],
  },
  {
    id: 'as-004',
    category: 'autoscaling',
    level: 'senior',
    question:
      'Your monthly EKS bill is 40% over forecast. Walk me through how you\'d bring it down without a feature freeze.',
    answer:
      'Instrument first — Kubecost or OpenCost breaking cost down per namespace/workload, Cost and Usage Report for node/EBS/LB spend. Typical wins: (1) right-size workloads — most requests are over-provisioned 2-3x; apply VPA in recommendation mode, then tune. (2) Spot — for stateless and batch, 60-90% discount. Karpenter with diversified instance pools absorbs interruptions. (3) Consolidation — Karpenter\'s consolidation packs underutilized nodes, huge win if you\'re on CA. (4) Graviton where the workload is ARM-compatible — 20% cheaper. (5) Reserved Instances / Savings Plans for the always-on baseline. (6) Kill zombie resources: idle LBs, unattached EBS, orphaned snapshots, old AMIs, dev clusters running 24/7. (7) Ingress/NAT/egress — cross-AZ traffic is a hidden cost; VPC endpoints for S3/DDB kill NAT charges. Prioritize by $ impact, not by ease.',
    keyPoints: [
      'Measure before cutting: Kubecost/OpenCost + CUR',
      'Right-size (VPA), Spot, Graviton, consolidation',
      'SP/RI for baseline',
      'Zombie cleanup: LBs, EBS, snapshots',
      'Cross-AZ / NAT egress is a silent cost sink',
      'Prioritize by $ not ease',
    ],
    followUp:
      'Which of these would you do first if you had only one week?',
    kbLinks: [
      { path: '/knowledge/cost', label: 'Cost Optimization' },
      { path: '/knowledge/karpenter', label: 'Karpenter' },
    ],
  },
  {
    id: 'sec-004',
    category: 'security',
    level: 'senior',
    question:
      'Describe how you\'d secure the CI/CD pipeline that deploys to prod.',
    answer:
      'Threat model: compromised CI runner, malicious PR, stolen long-lived credentials, supply-chain attack via dependency. Controls: (1) ephemeral, isolated runners per job — no shared state, no persistent creds. (2) OIDC federation from GitHub Actions / GitLab to AWS/cloud — no long-lived access keys; role-per-repo with scoped trust. (3) Branch protection + required reviews + signed commits for the repo that drives prod. (4) Build provenance: SLSA level 3 target — signed build attestations, verifiable in admission. (5) Dependency pinning + SBOM + vulnerability scanning (trivy/grype) gate on critical CVEs. (6) Secrets in the pipeline: short-lived, pulled from a secrets manager at job start, scrubbed from logs. (7) Separate "build" from "deploy" — build artifacts once, deploy via GitOps (Argo pulls, pipeline doesn\'t push). (8) Audit trail — every prod change tied to a signed commit + approved PR.',
    keyPoints: [
      'Ephemeral runners, no shared state',
      'OIDC federation, no long-lived keys',
      'Branch protection + signed commits + reviews',
      'Signed build artifacts (cosign, SLSA)',
      'SBOM + CVE scan gating',
      'Pull-based deploy (GitOps) separates build from deploy',
      'Audit every prod change to a commit',
    ],
    followUp:
      'A runner is compromised. What\'s the blast radius in your design?',
    kbLinks: [
      { path: '/knowledge/ci-cd', label: 'CI/CD' },
      { path: '/knowledge/secrets', label: 'Secrets' },
    ],
  },
];
