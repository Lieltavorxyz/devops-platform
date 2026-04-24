import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import HighlightBox from '../components/HighlightBox';
import CompareTable from '../components/CompareTable';
import CodeBlock from '../components/CodeBlock';
import { Wifi, GitBranch, Shuffle, Cpu, Shield, AlertTriangle } from 'lucide-react';

export default function AdvancedNetworking() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">BGP &middot; Anycast &middot; eBPF &middot; CNI</div>
        <h1>Advanced Networking</h1>
        <p>BGP as the trust graph that makes the internet work, anycast and ECMP under the hood, why eBPF-powered Cilium is replacing iptables in every serious k8s cluster, and the network policy mistakes that silently break pod-to-pod traffic.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'The Internet Is A Graph Of Trust',
          body: 'When you send a packet, your ISP looks at the destination IP and consults its BGP routing table to decide which neighbor AS to hand it to. That neighbor does the same. The packet hops AS to AS, each hop governed by policy (not just shortest path). There is no central authority — the whole thing works because networks peer with each other and exchange route advertisements. Understanding BGP is understanding why the internet routes the way it does, and why misconfigurations take entire countries offline.'
        },
        {
          title: 'Kubernetes Networking Is Just Linux Networking',
          body: 'A pod IP, a Service ClusterIP, a NetworkPolicy — all of it is implemented with Linux kernel primitives: network namespaces, veth pairs, iptables (or eBPF maps), routing tables. The CNI plugin is the glue that configures these. When something breaks, you debug by dropping into the host or pod namespace and using tcpdump, ip route, and iptables -L. The YAML abstractions are leaky; the kernel is always the ground truth.'
        }
      ]} />

      <Accordion title="BGP — The Protocol That Powers The Internet" icon={GitBranch} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          BGP (Border Gateway Protocol) is how autonomous systems announce what IP prefixes they can reach, and how the internet decides the path a packet should take. Every ISP, every cloud provider, every anycast CDN is a BGP speaker.
        </p>
        <CodeBlock language="bash">
{`# Autonomous System (AS) = a network under a single administrative control.
# Each AS has a globally unique AS number (ASN), assigned by regional registries.
# AWS: AS16509. Google: AS15169. Cloudflare: AS13335. Netflix: AS2906.

# BGP announcements: "AS X can reach prefix P via these AS path hops"
# Example: 8.8.8.0/24 AS_PATH: 13335 15169
#   "To reach 8.8.8.0/24, Cloudflare (AS13335) tells its peers:
#    send it to me, I'll forward through Google (AS15169)"

# Path selection (simplified BGP decision process):
# 1. Highest LOCAL_PREF (local policy, overrides everything)
# 2. Shortest AS_PATH (fewer AS hops = prefer)
# 3. Lowest MED (if same next-AS)
# 4. eBGP > iBGP
# 5. Lowest IGP cost to next-hop
# 6. Tie-breakers (lowest router ID, etc.)

# Inspect BGP state on a Linux router running FRR/BIRD:
vtysh -c "show bgp ipv4 unicast 8.8.8.8"
# BGP routing table entry for 8.8.8.0/24
# Paths: (3 available, best #2)
#   AS_PATH 174 15169, received from 38.122.32.1
#   AS_PATH 3356 15169, received from 4.69.201.98  <- best (shortest path)

# Why BGP goes wrong:
# - Route hijacks: a misconfigured AS announces prefixes it doesn't own
#   (2008 Pakistan-YouTube incident; 2022 Twitter incident)
# - Route leaks: a customer AS re-announces its provider's routes to another
#   provider, becoming an accidental transit for huge traffic volumes
# - Mitigations: RPKI (Resource Public Key Infrastructure) cryptographically
#   validates route origins; ROAs (Route Origin Authorizations) prove
#   "AS X is authorized to announce prefix P"

# Kubernetes relevance: Calico and MetalLB use BGP to advertise pod/service
# IPs to the network. When a pod comes up, Calico's BIRD instance announces
# the pod's /32 route to upstream ToR switches via BGP. This is how Calico
# enables pod IPs that are routable on the underlying network (no overlay).`}
        </CodeBlock>
        <HighlightBox>BGP is a policy protocol, not a shortest-path protocol. Peering agreements, not geography, determine the route. A packet from NYC to Tokyo might go NYC → LA → Tokyo (via one peer) or NYC → London → Singapore → Tokyo (via a different peer with cheaper transit pricing). This is why CDN PoP design is as much about peering as about fiber. Cloudflare publishes PeeringDB info — when they say &quot;300+ PoPs&quot; they mean 300 BGP peering locations, each directly announcing anycast prefixes.</HighlightBox>
      </Accordion>

      <Accordion title="Anycast and ECMP — Same IP, Many Paths" icon={Shuffle}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Anycast is the BGP trick where multiple physical locations announce the same IP prefix. The internet&apos;s routing naturally delivers each client&apos;s traffic to the nearest announcer. ECMP is the kernel-level trick for load-balancing across equal-cost next-hops. Together they underpin every modern CDN and most k8s Services.
        </p>
        <CompareTable
          headers={['Technique', 'Layer', 'Where Decision Happens', 'Use Case']}
          rows={[
            ['Anycast', 'Layer 3 (BGP)', 'Internet routers, across AS boundaries', 'CDN edge selection, DNS root servers, DDoS absorption'],
            ['ECMP', 'Layer 3 (kernel / switch)', 'Router on each hop', 'Load balancing across multiple next-hops of equal cost'],
            ['DNS round-robin', 'Layer 7 (application)', 'Recursive resolver returns one of several A records', 'Simple load balancing; broken client behavior (no health check)'],
            ['L4 load balancer (NLB)', 'Layer 4 (TCP/UDP)', 'Dedicated LB device / service', 'TCP connection steering; IP preservation'],
            ['L7 load balancer (ALB, Envoy)', 'Layer 7 (HTTP)', 'App-layer proxy', 'Content-based routing, retries, TLS termination'],
          ]}
        />
        <CodeBlock language="bash">
{`# ECMP in the Linux kernel — how multiple equal-cost routes coexist:

ip route show
# default nhid 100 proto bgp metric 20
# nexthop via 10.0.1.1 dev eth0 weight 1
# nexthop via 10.0.2.1 dev eth1 weight 1
# nexthop via 10.0.3.1 dev eth2 weight 1
# Three next-hops, equal weight. Kernel picks one per flow.

# Flow-based ECMP (default, and what you want):
# Hash of (src IP, dst IP, src port, dst port, protocol) → picks a next-hop
# Same 5-tuple → same next-hop → packets stay in order (no reorder problems)

# Per-packet ECMP:
# Round-robins each packet across next-hops. Causes reordering. Avoid.

# kube-proxy in iptables mode uses ECMP-like iptables DNAT rules:
# For a Service with 3 backend pods:
# -A KUBE-SERVICES -d 10.96.0.100/32 -j KUBE-SVC-XXX
# -A KUBE-SVC-XXX -m statistic --mode random --probability 0.3333 -j KUBE-SEP-A
# -A KUBE-SVC-XXX -m statistic --mode random --probability 0.5 -j KUBE-SEP-B
# -A KUBE-SVC-XXX -j KUBE-SEP-C
# Each rule has a probability of matching → probabilistic load balancing
# At high pod counts, this chain grows linear: O(n) per packet
# With thousands of Services and thousands of endpoints → iptables chain
#   evaluation becomes CPU-bottleneck. This is the #1 reason to move to eBPF.

# Enable IPVS mode for kube-proxy (faster than iptables for large clusters):
# Edit kube-proxy configmap, set mode: "ipvs"
# IPVS uses a hash table for O(1) lookup instead of iptables' O(n) chain.`}
        </CodeBlock>
      </Accordion>

      <Accordion title="eBPF in Kubernetes — Why Cilium Replaces iptables" icon={Cpu}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          eBPF lets you attach verified programs to kernel hooks (tc ingress/egress, XDP, socket ops). Cilium uses eBPF to replace kube-proxy iptables rules with O(1) map lookups, enforce network policies at wire speed, and give you L7 visibility without a sidecar.
        </p>
        <CompareTable
          headers={['Aspect', 'iptables (kube-proxy default)', 'eBPF (Cilium)']}
          rows={[
            ['Service lookup complexity', 'O(n) — walk chains, stop at first match', 'O(1) — hash map lookup'],
            ['Scale ceiling', 'Chains become slow past ~5k services × endpoints', 'Scales to tens of thousands of services'],
            ['Rule update time', 'Full chain rewrite on every endpoint change', 'Map entry update — atomic, fast'],
            ['Observability', 'Limited — must trace iptables counters', 'Hubble: per-flow visibility, L7 protocol parsing, service map'],
            ['Network policy enforcement', 'Calico in iptables mode walks more chains', 'Policy compiled to eBPF program; enforced at veth ingress'],
            ['CPU cost at 10k pods', 'Significant — kube-proxy CPU grows with cluster', 'Negligible — kernel-resident programs'],
            ['Operational risk', 'Known, ubiquitous, stable', 'Newer; kernel version requirements; still maturing'],
          ]}
        />
        <CodeBlock language="bash">
{`# Cilium install with eBPF kube-proxy replacement:
cilium install \\
  --set kubeProxyReplacement=true \\
  --set k8sServiceHost=<api-server> \\
  --set k8sServicePort=443 \\
  --set hubble.relay.enabled=true \\
  --set hubble.ui.enabled=true

# Verify kube-proxy is gone:
kubectl get pods -n kube-system | grep -E 'kube-proxy|cilium'
# cilium-xxxxx                     1/1 Running
# cilium-operator-xxxxx            1/1 Running
# (no kube-proxy pods)

# Check which eBPF programs are loaded:
cilium status | grep -A 5 "KubeProxyReplacement"
# KubeProxyReplacement:   True   [eth0 10.0.1.10 (Direct Routing)]
# Host firewall:          Disabled
# CNI Chaining:           none

# Inspect the Service map in the kernel:
cilium service list
# ID   Frontend              Service Type   Backend
# 1    10.96.0.1:443         ClusterIP      1 => 10.0.0.5:6443
# 42   10.96.1.100:80        ClusterIP      1 => 10.244.1.5:8080
#                                           2 => 10.244.2.10:8080

# Hubble — flow observability without sidecars:
hubble observe --from-pod payments-prod/payments-api-xxx --since 5m
# Apr 23 14:32:15 payments-api-xxx → auth-service: FORWARDED (TCP 443)
# Apr 23 14:32:15 payments-api-xxx → auth-service: L7 GET /verify 200 23ms
# Apr 23 14:32:16 payments-api-xxx → postgres-primary: DROPPED (Policy denied)

# That "DROPPED (Policy denied)" row would have taken 20 minutes to diagnose
# with iptables. With eBPF + Hubble, it's visible immediately.`}
        </CodeBlock>
        <HighlightBox>Cilium&apos;s killer feature is not speed — it&apos;s observability. Hubble shows you every pod-to-pod flow with L7 protocol context. When a developer says &quot;my service can&apos;t reach auth-service&quot;, you run <code>hubble observe</code> and see exactly which packets were sent, dropped, or policy-rejected. This alone justifies Cilium in a larger cluster even if you do not care about the eBPF performance story.</HighlightBox>
      </Accordion>

      <Accordion title="CNI Comparison — Flannel, Calico, Cilium" icon={Wifi}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The Container Network Interface (CNI) plugin owns pod networking. Your choice determines performance, policy capabilities, encapsulation mode, and operational surface.
        </p>
        <CompareTable
          headers={['CNI', 'Data Path', 'Policy Engine', 'Observability', 'Typical Use']}
          rows={[
            ['Flannel', 'VXLAN overlay (default) or host-gw', 'None (add Calico for policies)', 'Minimal', 'Small clusters, simplicity over features'],
            ['Calico', 'Native routing + BGP, optional IPIP/VXLAN', 'NetworkPolicy + GlobalNetworkPolicy', 'Felix metrics, limited flow visibility', 'Production clusters wanting simple + robust'],
            ['Cilium', 'eBPF (native routing or VXLAN/Geneve overlay)', 'NetworkPolicy + CiliumNetworkPolicy (L7 aware)', 'Hubble — full flow-level L7 observability', 'Large clusters, zero-trust, multi-cluster'],
            ['AWS VPC CNI', 'Pod gets ENI-attached VPC IP (no overlay)', 'None natively (use Calico for policies)', 'CloudWatch metrics; VPC flow logs', 'EKS default; native VPC integration'],
            ['Weave Net', 'VXLAN overlay, mesh gossip', 'NetworkPolicy', 'Weave Scope', 'Legacy — largely superseded'],
          ]}
        />
        <CodeBlock language="yaml">
{`# Calico BGP peering — advertise pod CIDRs to the underlying network:
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: tor-switch-1
spec:
  peerIP: 10.0.0.254
  asNumber: 65500
---
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  asNumber: 65501
  serviceLoadBalancerIPs:
  - cidr: 10.1.0.0/24   # advertise Service LoadBalancer IPs via BGP
# With this config, Calico's BIRD instance on each node peers with the
# upstream ToR switch and advertises pod /32 routes. Pods are directly
# routable from anywhere in the underlying network — no overlay overhead.

---
# CiliumNetworkPolicy — L7-aware policy (impossible with vanilla NetworkPolicy):
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: payments-api-allow-auth
  namespace: payments-prod
spec:
  endpointSelector:
    matchLabels:
      app: payments-api
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: auth-service
    toPorts:
    - ports:
      - port: "8080"
        protocol: TCP
      rules:
        http:
        - method: "GET"
          path: "/verify"
        - method: "POST"
          path: "/verify"
# This restricts auth-service to ONLY call GET/POST /verify on payments-api.
# If auth-service gets compromised and tries to hit /admin, Cilium drops it
# at the eBPF level — the request never reaches the pod.`}
        </CodeBlock>
      </Accordion>

      <Accordion title="Network Policies — Default-Deny and Egress Rules" icon={Shield}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Network policies are pod-level firewalls. The default in Kubernetes is &quot;all traffic allowed&quot;; you opt into deny by creating policies. Getting this right is foundational zero-trust networking, and almost every production cluster has subtle gaps.
        </p>
        <CodeBlock language="yaml">
{`# Pattern 1: default-deny for a namespace (recommended baseline)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: payments-prod
spec:
  podSelector: {}         # empty selector = all pods in namespace
  policyTypes:
  - Ingress
  - Egress
  # No ingress / egress rules defined = deny everything
---
# Then ALLOW explicitly what's needed:
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-auth
  namespace: payments-prod
spec:
  podSelector:
    matchLabels:
      app: payments-api
  policyTypes: [Ingress]
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: auth-prod
      podSelector:
        matchLabels:
          app: auth-service
    ports:
    - port: 8080
---
# Egress is where teams get it wrong — must allow DNS explicitly:
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-and-auth
  namespace: payments-prod
spec:
  podSelector:
    matchLabels:
      app: payments-api
  policyTypes: [Egress]
  egress:
  # DNS to CoreDNS — required or nothing resolves
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
      podSelector:
        matchLabels:
          k8s-app: kube-dns
    ports:
    - port: 53
      protocol: UDP
    - port: 53
      protocol: TCP
  # To auth-service
  - to:
    - namespaceSelector:
        matchLabels:
          name: auth-prod
      podSelector:
        matchLabels:
          app: auth-service
    ports:
    - port: 8080
  # To external APIs (Stripe)
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0
        except:
        - 169.254.169.254/32   # block metadata endpoint (IMDSv2 via IRSA anyway)
    ports:
    - port: 443`}
        </CodeBlock>
        <CompareTable
          headers={['Mistake', 'Symptom', 'Fix']}
          rows={[
            ['Forgot to allow DNS egress after default-deny', 'Pods can&apos;t resolve any name; connection errors 5s after startup', 'Explicit egress rule to kube-system CoreDNS on port 53 UDP+TCP'],
            ['Used namespaceSelector without podSelector', 'Allows ALL pods in target namespace, not just the one you meant', 'Always combine namespaceSelector + podSelector for precision'],
            ['Forgot that NetworkPolicy is additive (OR, not AND)', 'Multiple policies = pod can receive traffic matching ANY of them', 'Review combined effect; Cilium has `cilium policy trace` for this'],
            ['Did not allow egress to the node metadata IP', 'IMDS-dependent tooling breaks (AWS SDK, instance identity)', 'Allow 169.254.169.254/32 — or prefer IRSA which uses STS directly'],
            ['Did not allow egress to API server (10.96.0.1)', 'Controllers, operators, Helm hooks fail from inside pods', 'Allow egress to kube-apiserver Service IP / port 443'],
          ]}
        />
        <HighlightBox type="warn">Standard Kubernetes NetworkPolicy is L3/L4 only — IP and port. It cannot restrict &quot;GET /verify but not POST /admin.&quot; For HTTP-level restrictions you need Cilium&apos;s L7 policies or a service mesh. Also: NetworkPolicy only works if your CNI supports it. Flannel alone does not; AWS VPC CNI does not (pair with Calico). Always verify with a test: deploy a pod, apply a deny-all policy, try to curl from it — if curl succeeds, your CNI is not enforcing policy.</HighlightBox>
      </Accordion>

      <Accordion title="Common Network Debugging Patterns" icon={AlertTriangle}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The best k8s networking engineers think in terms of the packet&apos;s journey. Every debugging session is &quot;where did the packet actually go, and why.&quot;
        </p>
        <CodeBlock language="bash">
{`# The pod networking mental model — trace the packet:

# Pod A sends to Pod B (Service ClusterIP 10.96.5.10):
# 1. Pod A's veth → pair's other end in host netns
# 2. Host routes to Service IP: DNAT via iptables/eBPF to chosen backend pod
# 3. Packet routed toward target node (across VXLAN overlay, or directly if BGP)
# 4. Target node: veth → pod B

# Debugging checklist when "pods can't talk":

# (a) Does DNS resolve?
kubectl run debug --image=busybox:1.35 --rm -it --restart=Never -- \\
  nslookup auth-service.auth-prod.svc.cluster.local
# If this fails, check CoreDNS pods and your default-deny egress

# (b) Is there a NetworkPolicy blocking it?
kubectl get networkpolicy -A
# Cilium: cilium policy trace --src-pod ns/pod --dst-pod ns/pod --verbose
# This shows which policies matched and the resulting verdict.

# (c) Check routing from the pod namespace:
kubectl exec -it payments-api-xxx -- ip route
kubectl exec -it payments-api-xxx -- ss -tn
kubectl exec -it payments-api-xxx -- traceroute auth-service.auth-prod

# (d) Drop to the host to watch traffic on the pod's veth:
# Get the pod's veth interface from the host
POD=payments-api-xxx
NODE=$(kubectl get pod $POD -o jsonpath='{.spec.nodeName}')
PID=$(kubectl get pod $POD -o jsonpath='{.status.containerStatuses[0].containerID}' \\
  | sed 's|.*//||' | xargs crictl inspect | jq -r '.info.pid')

# On the node:
nsenter -t $PID -n tcpdump -i eth0 -nn -c 50
# See the packets the pod is actually sending

# (e) Check iptables chains (non-eBPF CNI):
iptables-save | grep payments-api
# Look for rules that might be dropping or mangling traffic

# (f) For Cilium + Hubble:
hubble observe --to-pod auth-prod/auth-service --verdict DROPPED --last 100
# See every dropped flow to auth-service in the last 100 events`}
        </CodeBlock>
        <HighlightBox>The hardest networking bugs are the intermittent ones — works 90% of the time, fails 10%. Usual causes: (1) one pod replica has broken networking (kubelet/CNI issue on one node), (2) connection tracking table full (conntrack_max reached; drops new flows until an entry ages out), (3) MTU mismatch causing fragmentation-and-drop for larger packets, (4) CoreDNS one-replica-down causing intermittent timeouts if pod always hits the bad one. Always test from multiple pods, multiple times, and watch both sides of the flow.</HighlightBox>
      </Accordion>
    </div>
  );
}
