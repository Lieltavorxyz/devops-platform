import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import HighlightBox from '../components/HighlightBox';
import CompareTable from '../components/CompareTable';
import CodeBlock from '../components/CodeBlock';
import { Bug, AlertOctagon, Ban, Flame, ServerCrash, Network } from 'lucide-react';

export default function K8sFailureModes() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">Debugging &middot; Diagnostics</div>
        <h1>K8s Failure Modes &amp; Debugging</h1>
        <p>Pods stuck Pending, OOMKilled containers, CrashLoopBackOff diagnosis, etcd pressure, NotReady nodes, and network-policy debugging — the systematic approaches that replace guessing with evidence when Kubernetes misbehaves in production.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Kubernetes Is A Stack Of Layers — Debug In Order',
          body: 'A broken pod could be the application, the container runtime, the kubelet, the scheduler, the API server, the CNI, or the underlying node. Guessing which layer is wrong wastes hours. The correct discipline is: start at the symptom (kubectl get pods), narrow the layer (kubectl describe, kubectl logs, kubectl events), confirm with ground truth (crictl on the node, tcpdump, journalctl -u kubelet), and only then theorize about causes.'
        },
        {
          title: 'describe And events Are Under-used',
          body: 'Half of all Kubernetes debugging sessions are solved by kubectl describe pod showing "FailedScheduling: 0/10 nodes available, 5 have taints" or "Liveness probe failed: connection refused". The answer is usually in the events. Always read them first before diving into logs or exec-ing into pods. Also: events are garbage-collected after 1 hour — screenshot or kubectl get events now if you might need them later.'
        }
      ]} />

      <Accordion title="Pod Stuck in Pending — Systematic Diagnosis" icon={Ban} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Pending means the pod has not been scheduled to any node. The scheduler writes an event explaining why. Learn the common patterns and their fixes.
        </p>
        <CodeBlock language="bash">
{`# First move, always:
kubectl describe pod payments-api-xxx | tail -30

# Look at the Events section. Common messages and their meaning:

# (1) 0/10 nodes are available: 10 Insufficient cpu.
#     Meaning: no node has enough free CPU to fit this pod's request
#     Fix: reduce pod cpu request, or add a node (cluster autoscaler should)
#     Diagnostic: kubectl describe nodes | grep -A 5 "Allocated resources"

# (2) 0/10 nodes are available: 3 node(s) had untolerated taint.
#     Meaning: 3 nodes have a taint this pod doesn't tolerate
#     Fix: add toleration, or deploy to a non-tainted node group
#     Diagnostic: kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints

# (3) 0/10 nodes are available: 10 pod has unbound immediate PersistentVolumeClaims.
#     Meaning: the pod requires a PVC that has not been provisioned
#     Fix: check StorageClass, PVC status
#     Diagnostic: kubectl get pvc && kubectl describe pvc <name>

# (4) 0/10 nodes are available: 5 Insufficient memory.
#     Meaning: same as CPU case
#     Fix: same pattern

# (5) 0/10 nodes are available: 10 node(s) didn't match Pod's node affinity.
#     Meaning: nodeSelector or nodeAffinity rules exclude all nodes
#     Fix: review affinity, ensure nodes are labeled to match
#     Diagnostic: kubectl get nodes --show-labels | grep <label>

# (6) 0/10 nodes are available: 10 exceed quota.
#     Meaning: namespace ResourceQuota would be exceeded by this pod
#     Fix: reduce pod request, or increase quota
#     Diagnostic: kubectl describe resourcequota -n <ns>

# (7) FailedScheduling: no nodes available (cluster empty)
#     Meaning: literally zero nodes, or all are NotReady
#     Diagnostic: kubectl get nodes`}
        </CodeBlock>
        <CompareTable
          headers={['Event Reason', 'Root Cause', 'Typical Fix']}
          rows={[
            ['Insufficient cpu/memory', 'Cluster lacks capacity for the pod&apos;s requests', 'Add capacity (Karpenter / CA), reduce requests, or remove lower-priority pods'],
            ['untolerated taint', 'Pod missing tolerations for tainted nodes (GPU, spot, control plane)', 'Add matching toleration in pod spec'],
            ['unbound immediate PersistentVolumeClaims', 'PVC has not been provisioned by any StorageClass', 'Verify StorageClass exists and CSI driver is healthy'],
            ['node affinity', 'nodeSelector / affinity does not match any node labels', 'Fix labels or affinity expression'],
            ['exceed quota', 'Namespace ResourceQuota exhausted', 'Raise quota or free existing resources'],
            ['FailedCreate (no container runtime)', 'Pod assigned but kubelet cannot pull/start', 'Check kubelet logs; image pull errors; containerd health'],
          ]}
        />
        <HighlightBox>Pending is cheap — it costs nothing until the pod runs. A pod can sit Pending for hours while you diagnose. The real urgency is when pods are Pending AND traffic is ramping (HPA spawning replicas that can&apos;t schedule). In that scenario: is Karpenter / CA working? Check <code>kubectl get events -A --sort-by=.lastTimestamp | grep -i scale</code> for autoscaler actions, and check the autoscaler pod logs for provisioning failures (Insufficient capacity, quota exhausted, wrong subnet).</HighlightBox>
      </Accordion>

      <Accordion title="OOMKilled — Memory Limits and the JVM Trap" icon={Flame}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          OOMKilled means the Linux kernel&apos;s OOM killer terminated a container because its cgroup exceeded its memory limit. The pod status shows it clearly, but the root cause often requires looking at the application&apos;s memory profile — especially for JVM and Go apps.
        </p>
        <CodeBlock language="bash">
{`# Detecting OOMKill:
kubectl describe pod payments-api-xxx
# ...
# Last State:     Terminated
#   Reason:       OOMKilled
#   Exit Code:    137           <- 128 + SIGKILL(9)
#   Started:      ...
#   Finished:     ...

# On the node (if you can reach it):
dmesg -T | grep -i "out of memory"
# [Thu Apr 23 14:22:41 2026] Memory cgroup out of memory: Killed process 12345
#   (java) total-vm:4823576kB, anon-rss:1523240kB, file-rss:0kB

# Events will also show:
kubectl get events --field-selector reason=OOMKilling

# The diagnosis tree:

# Case 1: limits too tight.
# Pod: memory limit 512Mi, container actually needs 700Mi under load.
# Fix: raise limit. If you lower the limit "to save money," measure first.

# Case 2: memory leak.
# Pod grows unboundedly over time, eventually hits limit.
# Diagnostic: plot container_memory_working_set_bytes over days
# Fix: in the application. Heap dumps, profiling, pprof.

# Case 3: JVM heap settings ignore cgroup limits.
# JVM 8u191+ and 11+ respect cgroups by default (-XX:+UseContainerSupport).
# Older JVMs: default heap = 25% of HOST memory (not container)
# → on a 64GB host, JVM tries to allocate 16GB heap inside a 2GB pod
# → OOMKill immediately at startup.
# Fix: set -Xmx explicitly, or use newer JVM with -XX:MaxRAMPercentage=75

# Case 4: Go apps and GOGC.
# Go's garbage collector runs when heap doubles. If GOMEMLIMIT is not set,
# Go can fill the container limit before GC triggers → OOMKill.
# Fix: set GOMEMLIMIT (Go 1.19+) to ~90% of cgroup limit
# Deployment env:
#   - name: GOMEMLIMIT
#     value: "900MiB"   # if container limit is 1Gi

# Case 5: Node memory pressure caused kubelet to evict.
# Similar to OOMKill but reason is "Evicted" not "OOMKilled."
# Events: The node was low on resource: memory.
# Fix: set pod memory requests accurately; lower-priority pods evicted first`}
        </CodeBlock>
        <CompareTable
          headers={['Requests vs Limits', 'Behavior']}
          rows={[
            ['requests only, no limits', 'Pod can use up to node capacity; burstable QoS; evicted under pressure before Guaranteed pods'],
            ['requests = limits', 'Guaranteed QoS; last to be evicted; no burst above limit'],
            ['no requests, no limits', 'BestEffort QoS; first to be evicted; do not use in prod'],
            ['requests &lt; limits', 'Burstable; can exceed request if node has spare, hard-capped at limit'],
          ]}
        />
        <HighlightBox type="warn">Memory limits are a hard stop, not a guideline. The kernel does not let a cgroup allocate one byte beyond its limit — the allocating process receives a kill signal. This is a CRITICAL difference from CPU limits, which just throttle. Many teams set memory limit = request &quot;for safety&quot; and end up with OOMKills during legitimate traffic spikes. The safer pattern: set request accurately (p99 usage), set limit at 1.5-2x request to absorb spikes, and alert when pods hit 80% of limit — not wait for OOMKill.</HighlightBox>
      </Accordion>

      <Accordion title="CrashLoopBackOff — Three Different Problems With One Name" icon={AlertOctagon}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          CrashLoopBackOff means kubelet has restarted this container N times and is now waiting longer between restarts. The underlying cause is one of three things — distinguishing them is the whole diagnostic job.
        </p>
        <CompareTable
          headers={['CrashLoop Cause', 'Symptom', 'Diagnostic']}
          rows={[
            ['Application panic on startup', 'Container starts, logs an error, exits non-zero', 'kubectl logs --previous <pod>; stack trace in app logs'],
            ['Liveness probe misconfig', 'App starts fine, probe fails, kubelet kills the container', 'kubectl describe shows "Liveness probe failed"; probe URL/port wrong'],
            ['OOMKill on startup', 'App needs more memory than limit during initialization', 'Exit code 137; describe shows OOMKilled reason'],
            ['Readiness-only problem (not CrashLoop)', 'Pod never becomes Ready but does not crash', 'kubectl describe shows failing readiness probe; pod status Running 0/1'],
          ]}
        />
        <CodeBlock language="bash">
{`# Step 1: Get the exit code
kubectl describe pod payments-api-xxx | grep -A 5 "Last State"
# Last State:  Terminated
#   Reason:    Error         <- application-level failure
#   Exit Code: 1             <- generic error, look at logs
# or:
#   Reason:    OOMKilled
#   Exit Code: 137           <- memory limit exceeded
# or:
#   Reason:    Error
#   Exit Code: 139           <- 128 + SIGSEGV, segfault
# or:
#   Reason:    Error
#   Exit Code: 143           <- 128 + SIGTERM, killed (often by liveness probe)

# Step 2: See the previous container's logs (current is still crashing)
kubectl logs payments-api-xxx --previous
# The stack trace / panic message is here. READ IT.

# Step 3: If logs don't show a clear app error, suspect probes
kubectl describe pod payments-api-xxx | grep -A 3 -i probe
# Events:
#   Warning  Unhealthy  10s (x3)  kubelet  Liveness probe failed: HTTP probe
#     failed with statuscode: 500

# Common liveness probe mistakes:

# (a) Probe path wrong
# livenessProbe.httpGet.path: /health   <- app serves /healthz (not /health)

# (b) initialDelaySeconds too short
# App takes 30s to start (JVM warm-up, DB connection pool)
# livenessProbe.initialDelaySeconds: 5   <- probe kills it at t=5s, every time

# (c) Probe too aggressive
# livenessProbe.timeoutSeconds: 1   <- DB query takes 2s under load, probe times out

# (d) Probe checks a dependency that can fail transiently
# /health queries Postgres. Postgres hiccups for 5s. Every pod's liveness
# fails at the same time → all pods restart → cascading failure.
# Rule of thumb: liveness probes should check "is this process stuck"
# — not "can this process do its job right now." That's what readiness is for.

# Step 4: If really stuck, run a debug container alongside
kubectl debug payments-api-xxx -it --image=busybox --copy-to=debug-pod
# Or shell into the failing image without the app starting:
kubectl run debug --rm -it --image=payments-api:v1.2.3 --command -- sh`}
        </CodeBlock>
        <HighlightBox>The hardest CrashLoop is the one that only happens in prod. Usually it is environment-specific: missing env var, wrong IAM role (IRSA not applied), wrong config map, DNS resolving to a different IP. Reproduction steps: (1) check env vars <code>kubectl exec ... -- env</code>, (2) check mounted secrets <code>kubectl exec ... -- ls /var/run/secrets</code>, (3) check DNS <code>kubectl exec ... -- nslookup dependency</code>, (4) compare a working pod in another env side by side.</HighlightBox>
      </Accordion>

      <Accordion title="etcd Pressure — When The Cluster Brain Is Sluggish" icon={ServerCrash}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          etcd is the consistent key-value store behind every Kubernetes API server. It is astonishingly fast under normal conditions and catastrophic under pressure. When etcd is slow, the entire cluster feels slow — kubectl commands hang, controllers lag, pods take minutes to schedule.
        </p>
        <CodeBlock language="bash">
{`# Symptoms of etcd pressure:

# (a) API server requests timing out:
kubectl get pods --request-timeout=5s
# Error: request timed out
# Or: i/o timeout

# (b) kubectl commands randomly slow (1s one moment, 30s the next)

# (c) Controller-manager, scheduler, etc. have huge work queues
#     → operators take forever to reconcile

# (d) etcd logs:
kubectl logs -n kube-system etcd-master-0 | grep -i "apply took\|slow"
# etcdserver: read-only range request "key:\"/registry/pods/\"" took 8.234s to execute
# etcdserver: apply request took too long

# (e) etcd metrics:
#   etcd_disk_wal_fsync_duration_seconds_bucket — should be p99 < 10ms
#     If this is climbing, disk I/O is the bottleneck
#   etcd_network_peer_round_trip_time_seconds — peer-to-peer latency
#     Should be < 50ms between etcd members
#   etcd_mvcc_db_total_size_in_bytes — approaching 8GB (default quota) is DANGER

# Common etcd pressure causes:

# 1. Disk is slow (EBS gp2 throttled, or local SSD full)
#    etcd WAL fsync latency > 10ms → API latency climbs
#    Fix: faster disk (gp3 with high IOPS, local NVMe); never run etcd on gp2

# 2. Too many Events (etcd stores events by default)
#    A kubelet event storm (e.g., a flapping DaemonSet) writes thousands of events
#    Each is a key in etcd → db grows → compaction can't keep up
#    Fix: tune event TTL; isolate events to a separate etcd (--etcd-servers-overrides)

# 3. Watch cache thrashing
#    A controller with a bad filter re-lists all pods on every reconcile
#    → huge LIST requests hammer etcd
#    Fix: find the controller (look at etcd request source via API server audit log)

# 4. db quota exceeded (8GB default)
#    etcd goes read-only. Whole cluster is effectively frozen for writes.
#    Fix: defrag + compact:
etcdctl defrag --endpoints=https://etcd-0:2379 --cert=... --key=... --cacert=...
etcdctl compact <current-revision> --endpoints=...
#    Raise quota if legitimate growth: --quota-backend-bytes (up to 100GB).

# 5. Network partition between etcd members
#    3-node etcd: if one is partitioned, quorum=2 still functional.
#    If two partition from the third, quorum lost, cluster read-only.
#    Fix: restore connectivity; etcd auto-recovers when quorum returns.

# Defrag should be part of regular maintenance. Schedule a CronJob or use
# etcd-manager to run it weekly, per-member (never concurrently).`}
        </CodeBlock>
        <HighlightBox type="warn">EKS and similar managed services hide etcd from you — you cannot ssh into the control plane. If you suspect etcd issues on managed k8s, the signals are API server request latency (kube_apiserver_request_duration_seconds metric), high 503s from the API server, and long reconciliation loops in controllers. Open a support case; there is not much else you can do. This is the main reason some organizations prefer self-managed control planes for very large clusters — they can directly operate etcd when it misbehaves.</HighlightBox>
      </Accordion>

      <Accordion title="Node NotReady — The Failing-Node Diagnosis" icon={ServerCrash}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          When a node is NotReady, its pods are slated for eviction after a timeout (typically 5 minutes). Before pods are moved, you have a window to understand what broke and decide whether to fix or drain.
        </p>
        <CodeBlock language="bash">
{`# Quick triage:
kubectl get nodes
# NAME          STATUS     AGE   VERSION
# node-1        Ready      30d   v1.29.1
# node-2        NotReady   30d   v1.29.1   <- problem

kubectl describe node node-2 | grep -A 20 Conditions
# Conditions:
#   Type             Status  LastHeartbeatTime  Reason                     Message
#   MemoryPressure   False   ...                KubeletHasSufficientMemory
#   DiskPressure     True    ...                KubeletHasDiskPressure     <- problem
#   PIDPressure      False   ...                KubeletHasSufficientPID
#   Ready            False   ...                KubeletNotReady            containerd: connection refused

# The Reason + Message tell you what to check next.

# Common NotReady causes:

# (1) kubelet is not running or not responding
# On the node:
systemctl status kubelet
journalctl -u kubelet -n 200 --no-pager
# Typical: "Failed to contact API server" → check networking, token validity
# Or: "no space left on device" → log rotation stuck, /var/log full

# (2) Container runtime (containerd) is down
systemctl status containerd
journalctl -u containerd -n 100 --no-pager
# kubelet requires containerd to be up. If containerd crashed, kubelet can
# register as Ready briefly, then transition to NotReady when it tries
# to manage pods.

# (3) Disk pressure
df -h | grep -v tmpfs
# If /var is >85% full, kubelet triggers garbage collection of images
# and can evict pods. Common culprits: old container images, huge log files

# (4) CNI plugin failed
# Pod status: ContainerCreating indefinitely
# kubelet logs: "cni plugin not initialized" or "failed to set up sandbox"
# Fix: check CNI DaemonSet pods, network-plugin binary in /opt/cni/bin

# (5) Node network issue
ping <api-server-ip>
# kubelet heartbeats fail → node goes NotReady after nodeMonitorGracePeriod (40s default)

# What to do about pods on a NotReady node:

# If fixable in minutes: wait. Pods won't evict until pod-eviction-timeout (5 min default)
# If not fixable: cordon and drain to redistribute pods
kubectl cordon node-2                       # stop scheduling new pods here
kubectl drain node-2 --ignore-daemonsets --delete-emptydir-data
# Drain respects PodDisruptionBudgets; blocks if PDB would be violated.

# For a completely dead node (instance terminated in cloud):
# Delete the Node object so controller-manager quickly redistributes
kubectl delete node node-2
# Eviction is immediate — pods scheduled to node-2 are recreated elsewhere.
# Cloud controllers (CCM) normally do this automatically when they detect
# the underlying instance is gone, but if CCM is broken, manual deletion is
# the escape hatch.`}
        </CodeBlock>
        <CompareTable
          headers={['Symptom', 'Root Cause', 'First Action']}
          rows={[
            ['kubelet can&apos;t contact API server', 'Network, certs, or token', 'Check node security group, kubelet config, token validity'],
            ['DiskPressure True', '/var or image dir full', 'Clean images: crictl rmi --prune; rotate logs'],
            ['MemoryPressure True', 'Node RAM saturated', 'Identify heaviest pod; scale it out; add node capacity'],
            ['PIDPressure True', 'Too many processes (zombie processes, fork bombs)', 'Identify offending container; limit PIDs via LimitRanges'],
            ['Ready False, no specific reason', 'kubelet or containerd crashed', 'systemctl restart kubelet; journalctl for clue'],
            ['Node vanished entirely', 'Instance terminated by cloud / spot interruption', 'Verify instance state; rely on CCM to delete node'],
          ]}
        />
      </Accordion>

      <Accordion title="Network Policy Debugging — Pods Can&apos;t Reach Each Other" icon={Network}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          &quot;Pod A can&apos;t reach Pod B&quot; is one of the most common k8s networking tickets. The systematic approach ignores abstractions and tests the actual packet path.
        </p>
        <CodeBlock language="bash">
{`# Step 1: rule out DNS
kubectl exec -it payments-api-xxx -- nslookup auth-service.auth-prod.svc.cluster.local
# If this fails: CoreDNS is down, or NetworkPolicy is blocking DNS (see next step)

# Step 2: test TCP directly
kubectl exec -it payments-api-xxx -- sh -c "timeout 5 nc -zv auth-service.auth-prod 8080"
# Successful: "Connection to auth-service 8080 port [tcp/*] succeeded!"
# Failed:     "auth-service (10.96.5.10:8080) open failed: Connection timed out"

# Step 3: if timeout, suspect NetworkPolicy
# List policies that might affect the source pod:
kubectl get networkpolicy -n payments-prod
# And the destination:
kubectl get networkpolicy -n auth-prod

# Check if a policy applies to this specific pod:
kubectl get networkpolicy -n auth-prod -o json | \\
  jq '.items[] | select(.spec.podSelector.matchLabels.app == "auth-service")'

# Step 4: test without any policy (elevated privileges required)
# Temporarily delete the suspect policy in a test namespace
# Or: Cilium has policy simulation:
cilium policy trace --src-pod payments-prod/payments-api-xxx \\
                    --dst-pod auth-prod/auth-service-yyy --dport 8080

# Output tells you exactly which rule matched and the verdict:
# Final verdict: ALLOWED
# or
# Final verdict: DENIED (no matching ingress rule at target)

# Step 5: watch traffic at the wire
# On the source pod's node:
POD_PID=$(crictl inspect $(crictl ps -q --name payments-api) | jq -r '.info.pid')
nsenter -t $POD_PID -n tcpdump -i any -nn "port 8080"
# See if SYN goes out, and whether RST or no-response comes back
# - No traffic at all: app isn't sending (check app logs)
# - SYN sent, no response: dropped in transit (NetworkPolicy / firewall)
# - SYN sent, RST returned: destination rejected (no listener, or policy reset)

# Step 6: common gotchas
# - NetworkPolicy is additive: pod matched by ANY ingress rule of a policy is allowed
# - But multiple policies: pod must be allowed by ALL policies that SELECT it
#   (intuitively: "at least one must permit, and NONE must deny" is wrong —
#    NetworkPolicy has no deny; absence of allow = deny)
# - egress policies on source pod AND ingress policies on dest pod both matter
# - DNS must be allowed in egress or nothing resolves
# - hostNetwork pods (e.g., monitoring agents) are not subject to NetworkPolicy`}
        </CodeBlock>
        <HighlightBox>The meta-lesson on NetworkPolicy debugging: NetworkPolicy is enforced by your CNI, and CNIs differ wildly in what they show you when a policy blocks traffic. Vanilla Flannel: nothing, you see a timeout. Calico: iptables counters (hard to read). Cilium + Hubble: exact flow with policy verdict. If you manage a production cluster, investing in Cilium + Hubble (or a similar flow-observability layer) pays for itself the first time a policy debugging session goes from 2 hours to 2 minutes.</HighlightBox>
      </Accordion>

      <Accordion title="General Debugging Toolkit" icon={Bug}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          A short catalog of commands and patterns that every k8s engineer should have internalized. These are the tools you reach for before tickets.
        </p>
        <CodeBlock language="bash">
{`# Triaging a suddenly-broken cluster:
kubectl get nodes                     # any NotReady?
kubectl get pods -A | grep -v Running # anything abnormal?
kubectl get events -A --sort-by=.lastTimestamp | tail -50  # recent weirdness
kubectl top nodes                     # resource pressure?
kubectl top pods -A --sort-by=cpu | head -20

# Inspecting a single pod end to end:
kubectl describe pod <pod> -n <ns>
kubectl logs <pod> -n <ns> -c <container> --tail=200
kubectl logs <pod> -n <ns> -c <container> --previous   # post-crash forensics
kubectl exec -it <pod> -n <ns> -- sh
kubectl debug <pod> -n <ns> -it --image=nicolaka/netshoot  # tcpdump/traceroute/dig

# Inspecting a node:
kubectl describe node <node>
# SSH to node (if possible):
# journalctl -u kubelet -n 500 --no-pager
# journalctl -u containerd -n 200 --no-pager
# crictl ps && crictl pods
# df -h; free -h; top

# API server visibility:
kubectl get --raw /metrics | grep apiserver_request_duration   # latency
kubectl get --raw /healthz                                     # overall health
# Audit log is the source of truth for "who did what" — usually in /var/log/audit
# but on EKS it's CloudWatch Logs (enable in cluster logging settings).

# CRD and custom resource debugging:
kubectl api-resources                # what CRDs exist
kubectl get <crd> -o yaml            # the spec
kubectl describe <crd-instance>      # events from the operator
# If an operator is stuck, its pod logs are where the answer is:
kubectl logs -n <operator-ns> <operator-pod> --tail=100

# The universal "something broke at 14:00 UTC" command:
kubectl get events -A --sort-by=.lastTimestamp | \\
  awk '$1 >= "14:00:00" && $1 <= "14:30:00" {print}'

# Useful aliases for productivity:
alias k='kubectl'
alias kgp='kubectl get pods'
alias kgpa='kubectl get pods -A'
alias kge='kubectl get events --sort-by=.lastTimestamp | tail -30'
alias kns='kubectl config set-context --current --namespace'`}
        </CodeBlock>
      </Accordion>
    </div>
  );
}
