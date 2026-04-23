import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import HighlightBox from '../components/HighlightBox';
import CompareTable from '../components/CompareTable';
import CodeBlock from '../components/CodeBlock';
import { Cpu, Lock, Network, FileText, Terminal, Activity } from 'lucide-react';

export default function Linux() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">Operating System Internals</div>
        <h1>Linux and OS Fundamentals</h1>
        <p>cgroups, namespaces, iptables, signals, and file descriptors — the kernel primitives that containers and Kubernetes are built on. Debugging at this level is what separates operators who configure YAML from engineers who understand why it works.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Containers Are Not Magic — They Are Linux Primitives',
          body: 'A container is a process. Specifically, it is a process running in a set of Linux namespaces (providing isolation — the process sees only its own PIDs, network, and filesystem) with cgroup limits applied (providing resource enforcement — the kernel tracks and throttles CPU and memory usage). Docker, containerd, and Kubernetes are all just orchestrators that set up these kernel features and manage their lifecycle. When a pod is throttled or OOMKilled, the answer is in the kernel, not in Kubernetes YAML.'
        },
        {
          title: 'The Abstraction Stack',
          body: 'Your Kubernetes YAML (resources.limits.cpu: "500m") flows down through kubelet, which configures the cgroup for the container via containerd. The kernel enforces the CFS quota. When you see throttling in Prometheus metrics, the number comes from the cgroup accounting. Understanding each layer means you know where to look when behavior does not match expectations.'
        }
      ]} />

      <Accordion title="cgroups — Resource Limits Under Containers" icon={Cpu} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Control groups (cgroups) are a kernel feature that limits, accounts for, and isolates resource usage of a collection of processes. Every container runs inside a cgroup hierarchy. When you set Kubernetes resource requests and limits, kubelet translates them into cgroup configuration.
        </p>
        <CompareTable
          headers={['Kubernetes Field', 'cgroup v1 Mechanism', 'cgroup v2 Mechanism', 'What It Does']}
          rows={[
            ['resources.requests.cpu', 'cpu.shares (proportional weight)', 'cpu.weight', 'Scheduling priority when CPU is contended — not a hard limit'],
            ['resources.limits.cpu', 'cpu.cfs_quota_us / cpu.cfs_period_us', 'cpu.max', 'Hard ceiling: X ms of CPU per 100ms period — throttles when exceeded'],
            ['resources.requests.memory', 'No direct cgroup setting — affects scheduler placement', 'memory.min (protected memory)', 'Scheduling guarantee — node will not accept pod without this space'],
            ['resources.limits.memory', 'memory.limit_in_bytes', 'memory.max', 'OOMKill threshold — process killed when exceeded (exit code 137)'],
          ]}
        />
        <CodeBlock language="bash">
{`# Where cgroup settings live on an EKS node (cgroup v2)
# Find the cgroup path for a running container:
CONTAINER_ID=$(kubectl get pod payments-api-xxxx -n payments-prod \
  -o jsonpath='{.status.containerStatuses[0].containerID}' | sed 's/containerd:\/\///')

# cgroup v2 path:
ls /sys/fs/cgroup/kubepods.slice/
# Find specific pod:
find /sys/fs/cgroup/kubepods.slice -name "cpu.max" 2>/dev/null | head -5

# Read CPU limit for a container (500m = 50000/100000)
cat /sys/fs/cgroup/kubepods.slice/kubepods-pod<uid>.slice/<container>/cpu.max
# Output: 50000 100000
# Meaning: 50ms of CPU time per 100ms period = 500m CPU

# Read throttling statistics:
cat /sys/fs/cgroup/kubepods.slice/.../cpu.stat
# usage_usec 45123456      # total CPU time used
# user_usec 30000000
# system_usec 15123456
# nr_periods 145000         # total scheduling periods
# nr_throttled 23000        # periods where limit was hit
# throttled_usec 2300000    # total time spent throttled`}
        </CodeBlock>
        <HighlightBox type="warn">The CPU throttling trap: a pod with limits.cpu: "500m" can be severely throttled even when average CPU utilization is 30%. CPU limits create a per-period hard ceiling via CFS quota. If the application is bursty — idle for 80ms then needs 70ms of CPU in a burst — it hits the 50ms quota mid-burst and stalls for the remaining 30ms of that period. Average utilization looks fine (bursts average out); P99 latency spikes. The Prometheus metric to check: <code>rate(container_cpu_cfs_throttled_seconds_total[5m]) / rate(container_cpu_cfs_periods_total[5m])</code> — anything above 5-10% is significant. Many teams remove CPU limits entirely and rely on requests for scheduling and node-level monitoring for safety.</HighlightBox>
        <CodeBlock language="bash">
{`# Memory is different — it causes immediate kill, not throttling
# Memory limit exceeded → kernel OOM killer → SIGKILL → exit code 137

# Check OOMKill events on a node:
dmesg | grep -i "oom\|killed process"
# Output: "Out of memory: Kill process 12345 (node) score 500 or sacrifice child"

# Kubernetes tracks OOMKills:
kubectl describe pod payments-api-xxxx -n payments-prod
# Events:
#   Warning  OOMKilling  container payments-api was OOMKilled

# Prometheus: alert on OOMKill events
kube_pod_container_status_last_terminated_reason{reason="OOMKilled"} > 0

# Memory QoS classes (determines eviction order under pressure):
# Guaranteed: request == limit → never evicted (protected cgroup)
# Burstable: request < limit  → evicted if node under pressure
# BestEffort: no request or limit → evicted first`}
        </CodeBlock>
      </Accordion>

      <Accordion title="Linux Namespaces — How Containers Get Isolation" icon={Lock}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Namespaces isolate what a process can see. Each container gets its own view of PIDs, network interfaces, filesystem mounts, and hostnames — even though all containers share the same Linux kernel. The kernel is the shared resource; namespaces partition the view of it.
        </p>
        <CompareTable
          headers={['Namespace', 'Isolates', 'Kubernetes Usage', 'Attack if Missing']}
          rows={[
            ['PID', 'Process IDs — each namespace starts at PID 1', 'Container main process is PID 1; cannot see host processes', 'Container could send signals to host processes'],
            ['NET', 'Network interfaces, IP routing, ports', 'Each pod gets its own network namespace and IP', 'Port conflicts, container could sniff host traffic'],
            ['MNT', 'Filesystem mount points', 'Container sees only its own root filesystem and mounted volumes', 'Container could access any host filesystem path'],
            ['UTS', 'Hostname and domain name', 'Each pod gets its pod name as hostname', 'Containers would all share host hostname'],
            ['IPC', 'Shared memory and semaphores', 'Containers in same pod share IPC namespace (can use shared memory)', 'Cross-container shared memory interference'],
            ['USER', 'User and group ID mappings', 'UID 0 in container maps to unprivileged UID on host (user namespaces)', 'Root in container = root on host — full container escape'],
          ]}
        />
        <CodeBlock language="bash">
{`# View namespaces for a process — each symlink points to a namespace inode
ls -la /proc/$(pgrep node)/ns/
# lrwxrwxrwx ipc -> 'ipc:[4026532456]'
# lrwxrwxrwx net -> 'net:[4026532459]'    ← unique network namespace
# lrwxrwxrwx pid -> 'pid:[4026532457]'
# All containers in same pod share the same net namespace inode number

# Two containers in same pod will show same net namespace ID
kubectl get pods payments-api-xxxx -n payments-prod -o jsonpath='{.spec.containers[*].name}'
# Confirm shared network: exec into each container and check "ip a" — same IPs

# nsenter: enter a container's namespaces from the host (powerful debugging)
# Find container PID on node:
CPID=$(crictl inspect $(crictl ps | grep payments-api | awk '{print $1}') | jq '.info.pid')

# Enter its network namespace to debug networking from the host:
nsenter --target $CPID --net ip addr
nsenter --target $CPID --net ss -tlnp  # show listening sockets inside container

# Enter full namespace set (like being inside the container without exec):
nsenter --target $CPID --mount --uts --ipc --net --pid`}
        </CodeBlock>
        <HighlightBox>The pause container (also called the infra container) is the first container started in every Kubernetes pod. Its only job is to create and hold the network, IPC, and UTS namespaces for the pod's lifetime. Application containers join these existing namespaces via the --network=container: flag in containerd. This is why all containers in a pod share the same IP address and can communicate on localhost — they share the same NET namespace that pause created and holds open.</HighlightBox>
        <CodeBlock language="bash">
{`# Verify pause container exists for every pod:
crictl ps | grep pause
# k8s_POD_payments-api-xxxx_payments-prod_...   pause   Running

# Privileged containers — disable ALL namespace isolation (dangerous)
# securityContext.privileged: true gives the container:
# - Host PID namespace access
# - Host network namespace access
# - All Linux capabilities
# - Full /dev access
# This is equivalent to root on the host — use only for node-level tooling
# (DaemonSets that need to configure kernel parameters, etc.)`}
        </CodeBlock>
      </Accordion>

      <Accordion title="iptables and kube-proxy — How Services Route Traffic" icon={Network}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Kubernetes Services are a virtual concept. A ClusterIP is not a real network interface — no process listens on it. kube-proxy implements Services by programming iptables (or IPVS) rules on every node, so that traffic addressed to the ClusterIP is rewritten (DNAT) to a real pod IP by the kernel before it leaves the source node.
        </p>
        <CodeBlock language="bash">
{`# How kube-proxy implements a ClusterIP Service (iptables mode):

# 1. Service created with ClusterIP 10.96.45.100:80
# 2. kube-proxy adds to KUBE-SERVICES chain in the nat table:
iptables -t nat -L KUBE-SERVICES -n --line-numbers
# KUBE-SVC-ABCDEF  tcp  10.96.45.100 port 80  → jump to service chain

# 3. The service chain probabilistically selects a backend:
iptables -t nat -L KUBE-SVC-ABCDEF -n
# KUBE-SEP-111  statistic mode random probability 0.33333  → pod 1
# KUBE-SEP-222  statistic mode random probability 0.50000  → pod 2 (of remaining)
# KUBE-SEP-333  (always, remainder)                        → pod 3

# 4. Each KUBE-SEP chain does DNAT to real pod IP:
iptables -t nat -L KUBE-SEP-111 -n
# DNAT to 10.0.1.15:8080

# The kernel rewrites the destination IP before forwarding
# Conntrack remembers the mapping for the return path
# kube-proxy does not handle any actual traffic — it only programs rules

# Verify Service has healthy endpoints (prereq for iptables rules):
kubectl get endpoints payments-api -n payments-prod
# NAME           ENDPOINTS                        AGE
# payments-api   10.0.1.15:8080,10.0.1.16:8080   5d

# Empty endpoints = no healthy pods = Service cannot route traffic
# This is the first thing to check when a Service is unreachable`}
        </CodeBlock>
        <CompareTable
          headers={['kube-proxy Mode', 'Mechanism', 'Scale Limit', 'Latency', 'When to Use']}
          rows={[
            ['iptables (default)', 'Linear rule chain in kernel netfilter', '~5,000 services before performance degrades', 'Low — kernel-level', 'Default — most clusters'],
            ['IPVS', 'Kernel IPVS (hash table lookup)', 'Thousands of services — O(1) lookup', 'Lower than iptables at scale', 'Large clusters with many services'],
            ['eBPF (Cilium)', 'Replaces kube-proxy entirely with eBPF programs', 'Very high — hash-based, no netfilter overhead', 'Lowest — no kernel netfilter traversal', 'Cilium CNI installations, highest performance'],
          ]}
        />
        <HighlightBox type="warn">When a Service is not reachable, the debugging sequence: (1) <code>kubectl get endpoints</code> — if empty, no pod passes readiness probe, fix the pod. (2) <code>kubectl describe pod</code> — check if readiness probe is failing. (3) On the node, <code>iptables -t nat -L KUBE-SERVICES -n | grep service-name</code> — rules should exist. (4) If using Cilium, iptables rules will not exist — use <code>cilium service list</code> and <code>cilium endpoint list</code> instead. (5) Check NetworkPolicy — a policy in the target namespace may be blocking the traffic even though routing works.</HighlightBox>
      </Accordion>

      <Accordion title="Signals and Graceful Shutdown" icon={Activity}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          How a process terminates determines whether in-flight requests are dropped. Kubernetes sends specific signals in a specific order during pod termination. Applications that do not handle signals correctly drop connections, corrupt state, or leave dangling DB connections.
        </p>
        <CodeBlock language="bash">
{`# Kubernetes pod termination sequence:

# 1. Pod enters Terminating state
#    - Removed from Service Endpoints immediately (no new traffic routes to it)
#    - But existing connections may still be in-flight (race condition window)

# 2. preStop hook runs (if configured)
#    - Runs BEFORE SIGTERM is sent
#    - Use to add a delay: sleep 5 to allow iptables propagation to other nodes
#    lifecycle:
#      preStop:
#        exec:
#          command: ["sleep", "5"]

# 3. SIGTERM sent to PID 1 in the container
#    - Application should start graceful shutdown:
#      - Stop accepting new requests
#      - Wait for in-flight requests to complete
#      - Close database connections
#      - Flush metrics/logs

# 4. terminationGracePeriodSeconds timer starts (default: 30 seconds)
#    - If application exits within this period: clean exit
#    - If not: SIGKILL is sent (immediate kill, no cleanup)

# Common mistake: CMD ["sh", "-c", "node server.js"]
# sh is PID 1. sh does NOT forward SIGTERM to child processes.
# node server.js receives no signal and is killed with SIGKILL after grace period.

# Fix: use exec form — node process becomes PID 1
# CMD ["node", "server.js"]
# Or use dumb-init/tini as PID 1 to forward signals properly:
# ENTRYPOINT ["dumb-init", "--"]
# CMD ["node", "server.js"]`}
        </CodeBlock>
        <CompareTable
          headers={['Signal', 'Default Action', 'Common Kubernetes Use', 'Application Should Do']}
          rows={[
            ['SIGTERM (15)', 'Terminate gracefully', 'Sent by kubelet at start of graceful shutdown', 'Begin graceful shutdown: drain connections, flush state'],
            ['SIGKILL (9)', 'Immediate kill — uncatchable', 'Sent after terminationGracePeriodSeconds expires', 'Nothing — process is killed immediately by kernel'],
            ['SIGHUP (1)', 'Terminate (default)', 'Often used as "reload config" signal by convention', 'Reload configuration without restarting (nginx: nginx -s reload)'],
            ['SIGINT (2)', 'Terminate', 'Ctrl+C in terminal', 'Same as SIGTERM — graceful shutdown'],
            ['SIGCHLD (17)', 'Ignore (default)', 'Sent to parent when child process exits', 'PID 1 must reap zombie children (use tini/dumb-init)'],
          ]}
        />
        <HighlightBox type="tip">The 5-second preStop sleep pattern is a workaround for a race condition: when a pod starts terminating, Kubernetes removes it from the Endpoints object. But iptables rules on remote nodes are not updated instantaneously — kube-proxy on those nodes may still route requests to the terminating pod for several seconds. A preStop sleep of 5 seconds ensures those stale routes have time to be removed before SIGTERM is sent and the application starts rejecting connections. Without this sleep, you get occasional connection refused errors during rolling deployments.</HighlightBox>
      </Accordion>

      <Accordion title="File Descriptors — Connection Leaks and Limits" icon={FileText}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          A file descriptor is a small integer that represents an open resource — a file, socket, pipe, or device. Every TCP connection, every open log file, every database connection consumes one file descriptor. Each process has a limit. When the limit is reached, new connections and file opens fail with "too many open files."
        </p>
        <CodeBlock language="bash">
{`# Diagnose "too many open files" error

# Step 1: Find the process and check its limits
kubectl exec -it payments-api-xxxx -n payments-prod -- \
  cat /proc/1/limits | grep "open files"
# Max open files    1024    1048576    files
# Soft limit = 1024 → very low for a production service (web server needs 1 fd per connection)

# Step 2: Count current open fds
kubectl exec -it payments-api-xxxx -n payments-prod -- \
  sh -c 'ls /proc/1/fd | wc -l'
# 1021 → approaching the 1024 limit

# Step 3: What type of fds are being held?
kubectl exec -it payments-api-xxxx -n payments-prod -- \
  ls -la /proc/1/fd | head -20
# lrwxrwxrwx -> socket:[12345]   ← TCP connection
# lrwxrwxrwx -> /app/logs/app.log ← open log file
# Many sockets → connection leak

# Step 4: Check system-wide fd usage
cat /proc/sys/fs/file-nr
# 45000  0  1048576
# Used   Free  Max

# Fix short-term: increase the soft limit in the pod spec
# securityContext at container level does not set ulimits directly
# Use an initContainer or configure via node-level kubelet settings
# Or increase via /proc/self/limits in the app startup script

# Fix long-term: find and fix the leak
# Common causes:
# - DB connections not returned to pool (defer db.Close() missing in Go)
# - HTTP clients without response.body.Close() calls
# - File handles in loops without explicit close
# - Event listeners accumulating in Node.js (EventEmitter memory leak)`}
        </CodeBlock>
        <HighlightBox>Connection pool leaks are the most common cause of file descriptor exhaustion in Kubernetes services. The pattern: application opens database connections but does not return them to the pool (missing defer, missing finally block, exception thrown before close). The pool fills up. New requests block waiting for a connection. Eventually file descriptors are exhausted for the process. The service appears healthy in readiness probes (a simple HTTP check) but cannot serve database-backed requests. Restart "fixes" it temporarily by recycling the process and its open fds. Monitor fd count as a metric: expose it in your application or use the node_filefd_allocated metric from node_exporter.</HighlightBox>
      </Accordion>

      <Accordion title="/proc Filesystem — Runtime Inspection" icon={Terminal}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The /proc filesystem is a virtual filesystem in Linux that exposes kernel data structures as files. It is the primary interface for inspecting running processes, kernel configuration, and system state without requiring special tooling. Every piece of information that ps, top, and netstat report comes from /proc.
        </p>
        <CodeBlock language="bash">
{`# /proc/<pid>/ — per-process information
/proc/1/cmdline     # command line of the process (null-separated args)
/proc/1/environ     # environment variables (null-separated)
/proc/1/fd/         # directory of symlinks to open file descriptors
/proc/1/fdinfo/     # per-fd information including file position
/proc/1/limits      # resource limits (ulimits)
/proc/1/maps        # memory map — virtual address space layout
/proc/1/mem         # raw process memory (requires ptrace permission)
/proc/1/net/tcp     # TCP connections held by this process
/proc/1/net/tcp6    # IPv6 TCP connections
/proc/1/ns/         # namespace symlinks
/proc/1/smaps       # detailed memory usage per mapping (includes RSS, PSS, swap)
/proc/1/stat        # process status (used by ps, top)
/proc/1/status      # human-readable process status including memory

# Useful debugging commands using /proc (available even in minimal containers):
kubectl exec -it payments-api-xxxx -n payments-prod -- \
  cat /proc/1/net/tcp  # show all TCP connections in hex format

# Convert hex port to decimal for readability:
# Local addr: 0100007F:1F90 → 127.0.0.1:8080 (loopback, port 8080)

# Memory usage (RSS = resident set size = physical memory in use)
kubectl exec -it payments-api-xxxx -n payments-prod -- \
  cat /proc/1/status | grep -E "VmRSS|VmSize|VmPeak"
# VmPeak:   512000 kB   ← peak virtual memory
# VmSize:   420000 kB   ← current virtual memory
# VmRSS:    180000 kB   ← physical memory actually in use

# /proc/sys/ — kernel tunable parameters
cat /proc/sys/net/core/somaxconn    # max listen() backlog
cat /proc/sys/vm/overcommit_memory  # memory overcommit setting
cat /proc/sys/kernel/pid_max        # max PIDs available`}
        </CodeBlock>
        <HighlightBox type="tip">The /proc filesystem is available inside containers (subject to namespace isolation), making it the most reliable debugging tool when you do not have curl, netstat, or other utilities in a minimal image. When debugging a distroless container that has no shell, you cannot kubectl exec into it — but you can use kubectl debug with an ephemeral container that attaches to the same PID namespace and then inspect /proc/1/* from the debug container to see the main application's state.</HighlightBox>
      </Accordion>
    </div>
  );
}
