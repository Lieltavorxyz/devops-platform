import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import HighlightBox from '../components/HighlightBox';
import CompareTable from '../components/CompareTable';
import CodeBlock from '../components/CodeBlock';
import { GitMerge, Lock, Network, Split, Cpu, AlertTriangle } from 'lucide-react';

export default function ServiceMesh() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">Istio &middot; Envoy &middot; mTLS</div>
        <h1>Service Mesh — Istio Deep Dive</h1>
        <p>What a service mesh actually solves, how Istio&apos;s control plane and Envoy data plane fit together, mTLS with SPIFFE identities, traffic shifting with VirtualService, and the sidecar vs ambient trade-off that every team evaluating Istio in 2026 has to make.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'The Problem Mesh Solves',
          body: 'Every service needs mTLS, retries, timeouts, circuit breaking, observability, and traffic shifting. Without a mesh, each of these is implemented per-service, per-language — inconsistent, buggy, and hard to operate centrally. A service mesh extracts this logic into a sidecar or node-level proxy, so the app stays focused on business logic while the mesh handles the network.'
        },
        {
          title: 'It Is A Lot Of Machinery',
          body: 'Mesh adds latency (typically 1-3ms per hop), CPU and memory overhead per pod (~50-100MB per sidecar), and operational complexity (new CRDs, control plane to run, certificate lifecycle to manage). For a 10-service team, the overhead usually outweighs the benefits. For a 200-service team with compliance requirements, it pays for itself in month one. Know which side of the curve you are on.'
        }
      ]} />

      <Accordion title="What A Service Mesh Actually Gives You" icon={GitMerge} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The value proposition is moving cross-cutting network concerns out of application code and into infrastructure. Without a mesh, each of these is solved per-language, per-team, usually inconsistently.
        </p>
        <CompareTable
          headers={['Capability', 'Without Mesh', 'With Mesh']}
          rows={[
            ['mTLS between services', 'Each app integrates a TLS library, manages certs, rotates them', 'Sidecar handles transparent mTLS; certs rotated centrally'],
            ['Retries and timeouts', 'App code: Go http.Client timeout, Java RestTemplate, language-specific', 'Declarative YAML (VirtualService); enforced at sidecar'],
            ['Circuit breaking', 'Hystrix, resilience4j, or custom logic per service', 'DestinationRule outlier detection; uniform per service'],
            ['Traffic splitting (canary)', 'Ingress controller weight, or feature flags in-app', 'VirtualService weighted routing; sub-second shifts'],
            ['Observability (RED metrics)', 'App emits Prometheus metrics; inconsistent cardinality', 'Sidecar auto-emits consistent metrics for every request'],
            ['Distributed tracing', 'App instruments with OpenTelemetry SDK', 'Sidecar propagates trace headers; app needs minimal changes'],
            ['Authorization policies', 'JWT parsing in each app, custom middleware', 'AuthorizationPolicy CRD enforced at sidecar before request reaches app'],
          ]}
        />
        <HighlightBox>The real business case for a mesh is usually zero-trust networking — getting mTLS on all east-west traffic without asking 20 service teams to each implement it. If your security team is asking &quot;how do you authenticate service-to-service?&quot; and the honest answer is &quot;we trust the VPC&quot;, a mesh is how you get to a credible answer.</HighlightBox>
      </Accordion>

      <Accordion title="Istio Architecture — Control Plane + Data Plane" icon={Cpu}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Istio is conceptually two pieces: the control plane (istiod) which manages configuration and certificates, and the data plane (Envoy proxies) which handles every packet. Understanding which component does what is essential for debugging.
        </p>
        <CodeBlock language="bash">
{`# Installed Istio components in a typical cluster:

kubectl get pods -n istio-system
# NAME                                   READY   STATUS
# istiod-7b4f8c8cb6-xxx                  1/1     Running    <- control plane
# istio-ingressgateway-6d4f8c8cb6-xxx    1/1     Running    <- north-south gateway
# istio-egressgateway-7b4f8c8cb6-xxx     1/1     Running    <- optional, egress control

# Control plane (istiod) responsibilities:
# - xDS API server: streams config to Envoys (LDS, RDS, CDS, EDS)
# - Certificate Authority (Citadel): signs workload certificates
# - Sidecar injection webhook: mutates pod specs on creation
# - Configuration validation: rejects bad VirtualService/DestinationRule

# Data plane (Envoy sidecar in every pod):
kubectl get pod payments-api-xxx -o yaml | grep -A 5 "containers:"
# containers:
#   - name: payments-api         <- your application
#   - name: istio-proxy          <- Envoy sidecar (injected automatically)
#   initContainers:
#   - name: istio-init           <- sets up iptables rules to route pod traffic through Envoy

# Every packet flow:
# App → loopback → iptables redirect → Envoy (port 15001 outbound) → actual destination
# Destination → iptables redirect → Envoy (port 15006 inbound) → App

# This is why mesh adds latency — two extra hops through user-space proxy per request.
# Typical overhead: 1-3ms per hop on modern CPUs.

# Check the sidecar's actual config (dumped from istiod):
istioctl proxy-config listeners payments-api-xxx.payments-prod
istioctl proxy-config clusters payments-api-xxx.payments-prod
istioctl proxy-config routes payments-api-xxx.payments-prod`}
        </CodeBlock>
        <CompareTable
          headers={['Component', 'What It Is', 'When It Matters']}
          rows={[
            ['istiod', 'Single Go binary — xDS server + CA + webhook', 'Debugging config push issues; cert lifecycle'],
            ['Envoy sidecar', 'C++ HTTP/TCP proxy injected per pod', 'Every request; observability; mTLS termination'],
            ['istio-ingressgateway', 'Envoy deployment exposed via Service LB', 'North-south traffic (internet → mesh)'],
            ['istio-proxy init container', 'Configures iptables to redirect pod traffic to Envoy', 'Pod startup; cannot be disabled'],
            ['VirtualService (CRD)', 'Route rules: host → destination with matches, weights', 'Canary deployments; retries; timeouts'],
            ['DestinationRule (CRD)', 'Policy on destination: subsets, load balancing, circuit breaker', 'Outlier detection; TLS mode; connection pool tuning'],
          ]}
        />
      </Accordion>

      <Accordion title="mTLS — SPIFFE Identity and Certificate Rotation" icon={Lock}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Istio gives every workload a cryptographic identity following the SPIFFE standard. Certificates are short-lived (24 hours by default) and rotated automatically by istiod. This is the core &quot;zero trust&quot; primitive.
        </p>
        <CodeBlock language="bash">
{`# SPIFFE identity format for an Istio workload:
# spiffe://<trust-domain>/ns/<namespace>/sa/<service-account>

# Example for a pod in payments-prod namespace with ServiceAccount "payments-api":
# spiffe://cluster.local/ns/payments-prod/sa/payments-api

# This identity is embedded in the x509 SAN extension of the workload's cert.
# Both sides (client + server) present certs; both verify the other's SPIFFE ID
# against AuthorizationPolicy rules.

# Inspect the actual cert a sidecar is using:
istioctl proxy-config secret payments-api-xxx.payments-prod -o json \\
  | jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' \\
  | base64 -d \\
  | openssl x509 -text -noout

# You'll see something like:
#   Subject: (empty — identity is in SAN)
#   X509v3 Subject Alternative Name:
#     URI:spiffe://cluster.local/ns/payments-prod/sa/payments-api
#   Validity: 24 hours
#   Signed by: spiffe://cluster.local (Istio CA cert)

# Enforce strict mTLS for a namespace:
kubectl apply -f - <<'EOF'
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: payments-prod
spec:
  mtls:
    mode: STRICT   # rejects plaintext; only Envoy-to-Envoy mTLS allowed
EOF

# Authorization policy — only allow auth-service to call payments-api:
kubectl apply -f - <<'EOF'
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: payments-api
  namespace: payments-prod
spec:
  selector:
    matchLabels:
      app: payments-api
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/auth-prod/sa/auth-service"
    to:
    - operation:
        methods: ["GET", "POST"]
EOF

# Result: any request to payments-api that does NOT originate from the
# auth-service ServiceAccount is rejected at the sidecar with HTTP 403
# — before the app even sees it.`}
        </CodeBlock>
        <HighlightBox type="warn">Certificate rotation is automatic but not instant. Default cert lifetime is 24 hours, refresh starts at 50% of lifetime. If istiod is unhealthy for 12+ hours, pods will start getting rejected as their certs expire. Symptom: suddenly all cross-pod calls start returning 503 upstream_reset_before_response_started. Mitigation: monitor istiod health, alert on certificate-related Envoy errors, and know that istiod unavailability is a critical incident even if apps seem fine initially.</HighlightBox>
      </Accordion>

      <Accordion title="Traffic Management — VirtualService and DestinationRule" icon={Split}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The canonical mesh canary deployment: shift 5% of traffic to v2, watch metrics, ramp up if clean. With Istio this is pure YAML — no code changes, no ingress reconfigure.
        </p>
        <CodeBlock language="yaml">
{`# DestinationRule — defines the "subsets" (versions) of a service:
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payments-api
  namespace: payments-prod
spec:
  host: payments-api.payments-prod.svc.cluster.local
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http2MaxRequests: 1000
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s   # eject a host if it returns 5 5xx in 30s
    loadBalancer:
      simple: LEAST_REQUEST   # or ROUND_ROBIN, RANDOM, PASSTHROUGH
---
# VirtualService — defines routing (who goes where, with what weight):
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payments-api
  namespace: payments-prod
spec:
  hosts:
  - payments-api.payments-prod.svc.cluster.local
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: payments-api
        subset: v2    # internal testers hit v2 directly
  - route:
    - destination:
        host: payments-api
        subset: v1
      weight: 95      # 95% to v1
    - destination:
        host: payments-api
        subset: v2
      weight: 5       # 5% to v2
    timeout: 3s
    retries:
      attempts: 3
      perTryTimeout: 1s
      retryOn: 5xx,reset,connect-failure
---
# To shift traffic: update the weights in the VirtualService
# istioctl apply, or patch:
# kubectl patch virtualservice payments-api --type=merge -p '
#   {"spec":{"http":[{"route":[
#     {"destination":{"host":"payments-api","subset":"v1"},"weight":50},
#     {"destination":{"host":"payments-api","subset":"v2"},"weight":50}
#   ]}]}}'
# Traffic shift propagates via xDS in seconds.`}
        </CodeBlock>
        <CompareTable
          headers={['Traffic Pattern', 'Implementation', 'Use Case']}
          rows={[
            ['Weighted canary', 'VirtualService weights', 'Percentage-based rollout'],
            ['Header-based canary', 'VirtualService match on header', 'Internal testers, specific tenants'],
            ['Fault injection', 'VirtualService fault delay / abort', 'Chaos testing resiliency'],
            ['Circuit breaker', 'DestinationRule outlierDetection', 'Protect downstream from bad instance'],
            ['Locality routing', 'DestinationRule localityLbSetting', 'Prefer same-zone pods to reduce cost / latency'],
            ['mTLS to external service', 'ServiceEntry + DestinationRule', 'Egress to external API with client cert'],
          ]}
        />
      </Accordion>

      <Accordion title="Sidecar vs Ambient Mode — The 2024+ Trade-off" icon={Network}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Istio originally had one data plane model: a sidecar Envoy per pod. In 2022 Istio introduced &quot;ambient mode&quot; — a sidecar-less architecture using node-level proxies (ztunnel for L4, waypoint proxies for L7). As of 2024 this is stable and reshapes the overhead calculus.
        </p>
        <CompareTable
          headers={['Dimension', 'Sidecar Mode (classic)', 'Ambient Mode (newer)']}
          rows={[
            ['Topology', 'One Envoy per pod', 'One ztunnel per node (L4) + optional waypoint proxy (L7)'],
            ['Memory per pod', '~50-100MB for Envoy sidecar', '~0 — shared ztunnel'],
            ['Latency overhead', '1-3ms per hop (two user-space proxies)', 'L4 only: near-zero (eBPF+ztunnel); L7: still sidecar-ish'],
            ['Pod startup', '+5-10s for sidecar init + bootstrap', 'Fast — no per-pod proxy'],
            ['Graceful shutdown', 'Complex — app finishes, then sidecar drains', 'Simpler — app shutdown independent of ztunnel'],
            ['Feature parity', 'Full Istio feature set', 'L4 features done; L7 authz/retries require waypoint'],
            ['Operational maturity', 'Battle-tested since 2017', 'GA in 2024; fewer production deployments'],
          ]}
        />
        <CodeBlock language="yaml">
{`# Ambient mode — opt in at the namespace level:
apiVersion: v1
kind: Namespace
metadata:
  name: payments-prod
  labels:
    istio.io/dataplane-mode: ambient   # no sidecars injected
---
# Waypoint proxy for L7 features (authz, retries, traffic split):
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: waypoint
  namespace: payments-prod
spec:
  gatewayClassName: istio-waypoint
  listeners:
  - name: mesh
    port: 15008
    protocol: HBONE
---
# In ambient mode:
# - L4 traffic: app → ztunnel (node-local) → ztunnel (remote node) → destination app
#   mTLS + basic authz at ztunnel, minimal overhead
# - L7 traffic: app → ztunnel → waypoint proxy (only if L7 features needed)
#   → ztunnel → destination
#   L7 hop is deployable per-service only where HTTP features are required
#
# Sizing the decision:
# - 500-node cluster, 50 pods per node, sidecar mode: 25,000 Envoys (125GB RAM just for mesh)
# - Same cluster, ambient: 500 ztunnels + 20 waypoint proxies (~10GB total)
# - For large clusters, ambient cost savings are substantial.`}
        </CodeBlock>
        <HighlightBox>If you are evaluating Istio in 2026, seriously consider ambient mode as the default unless you need Istio features not yet supported there. The operational model is simpler (pod lifecycles are clean), the resource overhead is dramatically lower, and the security model is still mTLS-everywhere. The main reason to stay on sidecars is feature parity — certain advanced authz or retry patterns still require the waypoint proxy, which adds a hop back.</HighlightBox>
      </Accordion>

      <Accordion title="When NOT to Use a Service Mesh" icon={AlertTriangle}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          A service mesh is infrastructure you now have to operate. The honest answer to &quot;should we adopt Istio?&quot; is often &quot;not yet.&quot;
        </p>
        <CompareTable
          headers={['Situation', 'Use a Mesh?', 'Better Alternative']}
          rows={[
            ['5 services, 2 engineers', 'No — overhead dwarfs benefit', 'Network policies + app-level HTTP clients'],
            ['Compliance requires mTLS everywhere', 'Yes — hardest to solve otherwise', 'Linkerd if you want simpler; Istio for feature breadth'],
            ['Need canary deployments for 1 service', 'No — too much machinery', 'Argo Rollouts + ingress weight'],
            ['Need consistent observability across 100+ services', 'Yes — per-service instrumentation does not scale', 'Istio or Linkerd for uniform RED metrics'],
            ['All services are Go, team owns HTTP client', 'Maybe not — can add mTLS via shared library', 'Shared library + SPIRE for identity'],
            ['Multi-cluster / multi-cloud', 'Yes — mesh is the cleanest answer', 'Istio multi-cluster, Consul Connect'],
          ]}
        />
        <HighlightBox type="warn">Common failure modes for mesh adoption: (1) team treats it as &quot;one-time install&quot; and underestimates the ongoing cert/config/upgrade cost; (2) sidecar overhead causes subtle latency regressions that get blamed on apps; (3) over-complicated VirtualService rules create unmaintainable routing (nobody knows where traffic actually goes); (4) upgrades break due to CRD version skew. If you adopt a mesh, budget a dedicated person or team for it. It is not set-and-forget.</HighlightBox>
      </Accordion>
    </div>
  );
}
