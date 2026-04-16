import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import NotesBox from '../components/NotesBox';
import HighlightBox from '../components/HighlightBox';
import CompareTable from '../components/CompareTable';
import CodeBlock from '../components/CodeBlock';

export default function Linux() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">{'\uD83D\uDC27'} Operating System Internals</div>
        <h1>Linux & OS Fundamentals</h1>
        <p>Cgroups, namespaces, iptables, and file descriptors — the kernel primitives that containers and Kubernetes are built on. Understanding these makes you dangerous at debugging, not just deploying.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Why This Matters for DevOps',
          body: 'Containers are not magic. A container is a process with cgroups (resource limits) and namespaces (isolation). When a pod is "throttled" or "OOMKilled," the answer is in the kernel, not in Kubernetes YAML. Senior engineers debug at this level.'
        },
        {
          title: 'The Abstraction Layers',
          body: 'Your YAML sets resources.limits.cpu: "500m" \u2192 kubelet translates to cgroup config \u2192 Linux kernel enforces CFS CPU quota. Understanding each layer means you know where to look when things break.'
        },
        {
          title: 'Interview Signal',
          body: 'Knowing "under the hood" separates mid-level from senior. "The pod is throttled" is mid-level. "The CFS quota is being hit because CPU limits create a hard ceiling via cgroup v2\'s cpu.max, even though average utilization looks low" is senior.'
        },
        {
          title: 'Key Primitives',
          body: 'cgroups = resource limits (CPU, memory, I/O). Namespaces = isolation (PID, network, mount, UTS). iptables = packet routing (how Services route to Pods). File descriptors = how processes talk to files, sockets, pipes.'
        }
      ]} />

      <Accordion title="cgroups — How Containers Get Resource Limits" icon={'\uD83D\uDCE6'} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Control groups (cgroups) are a Linux kernel feature that limits, accounts for, and isolates resource usage (CPU, memory, disk I/O) of a collection of processes. Every container runs inside a cgroup.
        </p>

        <HighlightBox type="info">
          <strong>How Kubernetes uses cgroups:</strong><br /><br />
          When you set <code>resources.requests.cpu: "250m"</code> and <code>resources.limits.cpu: "500m"</code> in your pod spec:<br />
          - <strong>Requests</strong> {'\u2192'} <code>cpu.shares</code> (cgroup v1) or <code>cpu.weight</code> (cgroup v2) — proportional sharing when CPU is contended<br />
          - <strong>Limits</strong> {'\u2192'} <code>cpu.cfs_quota_us</code> / <code>cpu.cfs_period_us</code> (v1) or <code>cpu.max</code> (v2) — hard ceiling, <em>even if CPU is idle</em>
        </HighlightBox>

        <CodeBlock>{`# Where cgroup settings live on a node
# cgroup v1:
/sys/fs/cgroup/cpu/kubepods/pod&lt;pod-uid&gt;/&lt;container-id&gt;/cpu.cfs_quota_us
/sys/fs/cgroup/cpu/kubepods/pod&lt;pod-uid&gt;/&lt;container-id&gt;/cpu.cfs_period_us
/sys/fs/cgroup/memory/kubepods/pod&lt;pod-uid&gt;/&lt;container-id&gt;/memory.limit_in_bytes

# cgroup v2:
/sys/fs/cgroup/kubepods.slice/kubepods-pod&lt;uid&gt;.slice/&lt;container-id&gt;/cpu.max
/sys/fs/cgroup/kubepods.slice/kubepods-pod&lt;uid&gt;.slice/&lt;container-id&gt;/memory.max

# Example: 500m CPU limit means:
# cpu.cfs_quota_us = 50000 (50ms out of every 100ms period)
# The container gets 50% of ONE CPU core, period.

# Check CPU throttling for a container:
cat /sys/fs/cgroup/cpu/kubepods/pod&lt;uid&gt;/&lt;id&gt;/cpu.stat
# Look for nr_throttled and throttled_time`}</CodeBlock>

        <HighlightBox type="warn">
          <strong>The CPU throttling trap (common interview question):</strong> A pod has <code>limits.cpu: 500m</code> and you see average CPU usage at 30%. But the app is slow. Why?<br /><br />
          <strong>Answer:</strong> CPU limits use CFS (Completely Fair Scheduler) quota. The limit means "50ms of CPU time per 100ms period." If the app has a bursty workload — idle for 80ms then needs 70ms of CPU — it will be throttled even though <em>average</em> usage is low. The burst exceeds the per-period quota. This is why many teams remove CPU limits entirely and only use requests (for scheduling), relying on node-level monitoring instead.
        </HighlightBox>

        <p style={{fontSize:13, color:'var(--text)', margin:'12px 0'}}><strong>Memory is different — it's a hard kill:</strong></p>
        <ul className="item-list">
          <li><span className="bullet">{'\u2022'}</span> <span className="label">CPU limit exceeded:</span> Process is <em>throttled</em> (slowed down). It still runs, just slower.</li>
          <li><span className="bullet">{'\u2022'}</span> <span className="label">Memory limit exceeded:</span> Process is <em>OOMKilled</em> (killed immediately). The kernel's OOM killer terminates it. Exit code 137.</li>
          <li><span className="bullet">{'\u2022'}</span> <span className="label">Memory request exceeded:</span> Pod becomes a candidate for eviction if the node is under memory pressure. Higher priority pods survive.</li>
        </ul>

        <NotesBox id="linux-cgroups" placeholder="Have you debugged CPU throttling? Have you removed CPU limits? What resource settings does your team use?" />
      </Accordion>

      <Accordion title="Linux Namespaces — How Containers Get Isolation" icon={'\uD83D\uDD12'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Namespaces isolate what a process can <em>see</em>. Each container gets its own view of PIDs, network interfaces, mounts, and hostnames — even though they share the same kernel.
        </p>

        <CompareTable
          headers={['Namespace', 'What It Isolates', 'How K8s Uses It', 'What Happens Without It']}
          rows={[
            ['<strong>PID</strong>', 'Process IDs — container sees only its own processes', 'Each container gets PID 1 for its main process', 'Container could see and kill host processes'],
            ['<strong>NET</strong>', 'Network interfaces, IP addresses, routing tables', 'Each pod gets its own network namespace (shared by containers in pod)', 'Containers would share host network, port conflicts'],
            ['<strong>MNT</strong>', 'Filesystem mount points', 'Container sees only its own root filesystem + mounted volumes', 'Container could access host filesystem'],
            ['<strong>UTS</strong>', 'Hostname and domain name', 'Each pod gets its own hostname (pod name)', 'All containers would share the host\'s hostname'],
            ['<strong>IPC</strong>', 'Inter-process communication (shared memory, semaphores)', 'Containers in same pod share IPC namespace', 'Containers could interfere with each other\'s shared memory'],
            ['<strong>USER</strong>', 'User and group IDs', 'Rootless containers — UID 0 in container maps to unprivileged UID on host', 'Root in container = root on host (security risk)'],
          ]}
        />

        <HighlightBox type="info">
          <strong>Pod networking explained by namespaces:</strong> All containers in a pod share the same NET namespace. That's why they can reach each other on <code>localhost</code>. Each pod gets a unique IP because each pod gets a unique NET namespace. The pause container creates the namespace, and app containers join it.
        </HighlightBox>

        <CodeBlock>{`# View namespaces for a process
ls -la /proc/&lt;pid&gt;/ns/

# Example output:
lrwxrwxrwx 1 root root 0 ... cgroup -> 'cgroup:[4026531835]'
lrwxrwxrwx 1 root root 0 ... ipc -> 'ipc:[4026532456]'
lrwxrwxrwx 1 root root 0 ... mnt -> 'mnt:[4026532454]'
lrwxrwxrwx 1 root root 0 ... net -> 'net:[4026532459]'
lrwxrwxrwx 1 root root 0 ... pid -> 'pid:[4026532457]'
lrwxrwxrwx 1 root root 0 ... user -> 'user:[4026531837]'
lrwxrwxrwx 1 root root 0 ... uts -> 'uts:[4026532455]'

# Enter a container's namespace from the host (debug):
nsenter --target &lt;container-pid&gt; --mount --uts --ipc --net --pid`}</CodeBlock>

        <HighlightBox type="tip">
          <strong>Interview insight:</strong> When asked "how do containers provide isolation?", the answer is <em>not</em> "like VMs." Containers share the kernel. Isolation comes from namespaces (what you can see) and cgroups (what resources you can use). This is why container escapes are possible — it's process-level isolation, not hardware-level.
        </HighlightBox>

        <NotesBox id="linux-namespaces" placeholder="Have you used nsenter to debug? Have you worked with host networking or privileged containers?" />
      </Accordion>

      <Accordion title="iptables — How kube-proxy Routes Traffic" icon={'\uD83D\uDD25'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          iptables is the Linux kernel's packet filtering framework. kube-proxy uses it to implement Kubernetes Services — when traffic hits a ClusterIP, iptables rules DNAT it to a healthy pod IP.
        </p>

        <HighlightBox type="info">
          <strong>How a Kubernetes Service works under the hood (iptables mode):</strong><br /><br />
          1. You create a Service with <code>type: ClusterIP</code> {'\u2192'} gets a virtual IP (e.g., 10.96.0.100)<br />
          2. kube-proxy watches the API server for Service and Endpoints changes<br />
          3. kube-proxy writes iptables rules on every node:<br />
          &nbsp;&nbsp;&nbsp;&nbsp;- PREROUTING chain: if destination = 10.96.0.100:80, jump to service chain<br />
          &nbsp;&nbsp;&nbsp;&nbsp;- Service chain: randomly DNAT to one of the pod IPs (load balancing)<br />
          4. When a pod sends traffic to 10.96.0.100:80, iptables rewrites the destination to a real pod IP<br />
          5. The response comes back directly (conntrack remembers the NAT mapping)
        </HighlightBox>

        <CodeBlock>{`# View iptables rules for a service (on a node)
iptables -t nat -L KUBE-SERVICES -n | grep &lt;service-name&gt;

# Example output for a service with 3 pods:
Chain KUBE-SVC-XXXX (1 references)
  statistic mode random probability 0.33333 → KUBE-SEP-AAA  # pod 1
  statistic mode random probability 0.50000 → KUBE-SEP-BBB  # pod 2
  → KUBE-SEP-CCC  # pod 3 (remainder)

# Each KUBE-SEP chain does DNAT:
Chain KUBE-SEP-AAA
  DNAT to 10.0.1.15:8080  # actual pod IP`}</CodeBlock>

        <CompareTable
          headers={['kube-proxy Mode', 'How It Works', 'Performance', 'When to Use']}
          rows={[
            ['<strong>iptables</strong> (default)', 'Creates iptables rules for each Service/endpoint', 'Good for &lt; 5,000 services. Rule updates O(n).', 'Default choice, most clusters'],
            ['<strong>IPVS</strong>', 'Uses Linux IPVS (kernel load balancer) instead of iptables', 'Better for large clusters. Hash-based lookup O(1).', 'Clusters with thousands of services'],
            ['<strong>eBPF</strong> (Cilium)', 'Replaces kube-proxy entirely with eBPF programs', 'Best performance. No iptables overhead.', 'Modern clusters using Cilium CNI'],
          ]}
        />

        <HighlightBox type="warn">
          <strong>Debugging tip:</strong> If a Service is not reachable, check: (1) Does the Service have endpoints? <code>kubectl get endpoints &lt;svc&gt;</code>. (2) Are pods healthy and passing readiness probes? (3) On the node, are iptables rules present? If using Cilium/eBPF, iptables rules won't exist — use <code>cilium service list</code> instead.
        </HighlightBox>

        <NotesBox id="linux-iptables" placeholder="Have you debugged service routing issues? Do you use iptables or IPVS mode? Have you worked with Cilium?" />
      </Accordion>

      <Accordion title="File Descriptors & 'Too Many Open Files'" icon={'\uD83D\uDCC2'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          A file descriptor (fd) is an integer that represents an open file, socket, pipe, or device. Every network connection, log file, and database connection uses a file descriptor. When you run out, things break in weird ways.
        </p>

        <HighlightBox type="info">
          <strong>The "too many open files" error explained:</strong><br /><br />
          Every process has a limit on how many file descriptors it can open (<code>ulimit -n</code>, typically 1024 or 65536).<br />
          Each TCP connection = 1 fd. Each open file = 1 fd. Each pipe = 1 fd.<br /><br />
          A pod running a web server with 5,000 concurrent connections needs at least 5,000 fds. If the limit is 1024, you get <code>too many open files</code> and new connections fail.
        </HighlightBox>

        <CodeBlock>{`# Check current fd limits for a process
cat /proc/&lt;pid&gt;/limits | grep "open files"
# Max open files            1024                 1048576              files
#                           ^soft limit          ^hard limit

# Count open fds for a process
ls /proc/&lt;pid&gt;/fd | wc -l

# Check system-wide fd usage
cat /proc/sys/fs/file-nr
# 3456    0    1048576
# ^used   ^free  ^max

# In Kubernetes — set fd limits in the pod spec:
securityContext:
  sysctls:
  - name: net.core.somaxconn
    value: "65535"
# Or use an init container to set ulimits`}</CodeBlock>

        <HighlightBox type="warn">
          <strong>Common cause in K8s:</strong> Connection pool leaks. If your app opens DB connections but doesn't close them (e.g., missing <code>defer conn.Close()</code> in Go, or not returning connections to pool in Python), you slowly exhaust file descriptors. Symptoms: app works fine for hours, then suddenly starts failing all connections. Restart "fixes" it temporarily.
        </HighlightBox>

        <HighlightBox type="tip">
          <strong>Debugging checklist for "too many open files":</strong><br />
          1. <code>kubectl exec &lt;pod&gt; -- cat /proc/1/limits</code> — check the soft limit<br />
          2. <code>kubectl exec &lt;pod&gt; -- ls /proc/1/fd | wc -l</code> — count current fds<br />
          3. If fd count is near the limit, find what's leaking: <code>ls -la /proc/1/fd</code> shows what each fd points to (sockets, files, pipes)<br />
          4. Fix: increase limit via <code>securityContext</code> (short-term), fix the leak (long-term)
        </HighlightBox>

        <NotesBox id="linux-fd" placeholder="Have you hit 'too many open files'? What caused it? How did you fix it? What limits does your team set?" />
      </Accordion>

      <Accordion title="Interview Q&A — Linux & OS Fundamentals" icon={'\uD83C\uDFAF'}>
        <HighlightBox type="info">
          <strong>Q: A pod is throttled but CPU usage looks low. How do you debug?</strong><br /><br />
          "This is the classic CFS quota issue. CPU <em>limits</em> in Kubernetes translate to CFS (Completely Fair Scheduler) quota — the container gets X milliseconds of CPU per 100ms period. If the workload is bursty — say it's idle for 80ms then needs 70ms of CPU in a burst — it will hit the quota even though average usage over a second looks low. I'd check: (1) <code>kubectl top pod</code> for average usage, (2) <code>cat /sys/fs/cgroup/cpu/.../cpu.stat</code> for <code>nr_throttled</code> — if throttled count is high, that confirms it. (3) Solution: either remove CPU limits (use only requests for scheduling) or increase the limit to accommodate bursts. Many teams, including Google's own guidance, recommend not setting CPU limits at all."
        </HighlightBox>

        <HighlightBox type="info">
          <strong>Q: What's the difference between a container and a VM?</strong><br /><br />
          "A VM virtualizes hardware — it runs its own kernel on a hypervisor. A container shares the host kernel and uses Linux namespaces for isolation (PID, NET, MNT, UTS) and cgroups for resource limits. This means containers start in milliseconds (no kernel boot), use less memory (no duplicate OS), but have weaker isolation (shared kernel = container escapes are possible). For most workloads, containers are fine. For true multi-tenant isolation with untrusted code, you might need VMs or gVisor/Kata containers which add a kernel layer."
        </HighlightBox>

        <HighlightBox type="info">
          <strong>Q: How does kube-proxy route traffic to pods?</strong><br /><br />
          "In iptables mode (the default), kube-proxy watches the API server for Service and Endpoint changes, then writes iptables NAT rules on every node. When a pod sends traffic to a ClusterIP, the kernel matches the iptables rule and DNATs the packet to a real pod IP using random probability-based load balancing. For NodePort, it adds DNAT rules on the host's external interface too. At scale (thousands of services), iptables gets slow because rule updates are O(n), so you switch to IPVS mode (hash-based O(1) lookup) or Cilium eBPF which replaces kube-proxy entirely."
        </HighlightBox>

        <HighlightBox type="info">
          <strong>Q: A process keeps failing with 'too many open files.' How do you investigate?</strong><br /><br />
          "First, check the current limit: <code>cat /proc/&lt;pid&gt;/limits</code> — look at the 'Max open files' soft limit. Then count current fds: <code>ls /proc/&lt;pid&gt;/fd | wc -l</code>. If it's near the limit, I'd list what the fds point to: <code>ls -la /proc/&lt;pid&gt;/fd</code> — this shows if it's sockets (likely connection leak), regular files (log files not closed), or pipes. Most common cause in K8s: DB connection pool leak — app opens connections but doesn't return them. Short-term fix: increase the limit. Long-term: fix the leak, add connection pool monitoring, set max pool size."
        </HighlightBox>

        <NotesBox id="linux-interview" placeholder="Have you debugged at the OS level? Have you used nsenter, strace, /proc filesystem? What's the deepest you've gone?" />
      </Accordion>
    </div>
  );
}
