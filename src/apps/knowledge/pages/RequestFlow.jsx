import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import HighlightBox from '../components/HighlightBox';
import CodeBlock from '../components/CodeBlock';
import CompareTable from '../components/CompareTable';
import { Globe, Network, Server, Layers, Activity, ArrowRightLeft } from 'lucide-react';

export default function RequestFlow() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">System Internals</div>
        <h1>Request Flow</h1>
        <p>The complete journey of a request from DNS resolution through CDN, load balancer, ingress, and into a pod — and what each layer contributes and can break.</p>
      </div>

      <HighlightBox type="tip">In a system design interview, every answer maps to this skeleton. Knowing what each layer is responsible for — and what breaks when it is missing or misconfigured — is what distinguishes a strong answer from a surface-level one.</HighlightBox>

      <ReasoningMap cards={[
        {
          title: 'The Request Path',
          body: 'DNS resolution → CDN edge → Load balancer (ALB) → Ingress controller → Kubernetes Service → Pod → Downstream calls. The response travels back through the same layers. Each hop is both a routing point and a potential failure boundary.'
        },
        {
          title: 'Each Layer is an Observability Point',
          body: 'A well-designed system has visibility at every hop: ALB access logs, ingress controller metrics, pod traces, downstream span timing. When production is slow at 3am, the ability to isolate which layer introduced the latency determines your MTTR.'
        }
      ]} />

      <Accordion title="DNS Resolution" icon={Globe} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          DNS is the first layer every request passes through. Failures here manifest as complete service unavailability (NXDOMAIN) or intermittent timeouts, not HTTP errors — which makes them harder to diagnose without the right tooling.
        </p>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Resolution chain:</span> Browser cache → OS cache (/etc/hosts) → recursive resolver (your ISP or 8.8.8.8) → root nameservers → TLD nameserver → authoritative nameserver (Route53) → answer returned with TTL. Each hop adds latency. A cold resolution from scratch against an uncached chain takes 50-200ms.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">TTL and incident response:</span> Low TTL (60-300 seconds) means DNS changes propagate quickly, enabling fast failover. High TTL (1 hour+) means DNS is cached at the resolver level — during an incident, Route53 health-check-based failover cannot redirect traffic that has been cached. Design critical endpoints with TTL under 60 seconds.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Route53 routing policies:</span> Latency-based routing sends users to the region with lowest latency. Failover routing sends to primary unless the health check fails, then switches to secondary. Weighted routing splits across multiple endpoints by percentage. These enable multi-region architectures at the DNS layer.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Split-horizon DNS:</span> Private Route53 hosted zone overrides the public zone inside the VPC. Internal services calling <code>api.mycompany.com</code> get the private ALB IP (no internet roundtrip). External clients get the public IP. Same domain, different answer based on query origin.</div>
          </li>
        </ul>
        <CodeBlock language="bash">
{`# Debug DNS resolution
dig +trace api.mycompany.com          # trace full resolution chain
dig api.mycompany.com +noall +answer  # just the answer
dig @8.8.8.8 api.mycompany.com        # query specific resolver
dig api.mycompany.com | grep "Query time"  # resolution latency

# Check what your pod sees
kubectl exec -n payments-prod my-pod -- nslookup api.mycompany.com
kubectl exec -n payments-prod my-pod -- cat /etc/resolv.conf`}
        </CodeBlock>
      </Accordion>

      <Accordion title="CDN Layer — CloudFront" icon={Globe}>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">For API calls:</span> CloudFront passes most API requests through to the origin (API responses are not cacheable). But it still provides: TLS termination at the edge (reduces handshake latency for geographically distant users), DDoS protection via AWS Shield, and WAF rules for blocking malicious traffic before it reaches your infrastructure.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">For static assets:</span> JS, CSS, images, and fonts are served directly from the nearest edge location — the origin is never hit for cached content. This is the primary latency win: a user in Tokyo hitting a US-east-1 origin gets 200ms latency; hitting a Tokyo edge gets 10ms latency for cached assets.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Cache-Control is your tool:</span> Your application controls whether CloudFront caches responses via response headers. For API endpoints: <code>Cache-Control: no-store, no-cache</code>. For versioned static assets with content-hashed filenames: <code>Cache-Control: public, max-age=31536000, immutable</code>. For HTML index files: <code>Cache-Control: no-cache</code> (revalidate on every request).</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Cache invalidation:</span> Creating a CloudFront invalidation for <code>/*</code> is $0 for the first 1,000 paths per month but adds 5-15 seconds to deploys. Better pattern: content-hashed asset filenames — the URL changes when content changes, so the old URL stays cached (irrelevant) and the new URL is always a cache miss.</div>
          </li>
        </ul>
        <CodeBlock language="bash">
{`# Check cache behavior
curl -I https://api.mycompany.com/static/main.abc123.js \
  2>/dev/null | grep -i "x-cache\|cache-control\|age\|cf-cache-status"
# X-Cache: Hit from cloudfront
# Age: 7234              ← seconds since cached at edge
# Cache-Control: public, max-age=86400

# Invalidate CloudFront distribution cache
aws cloudfront create-invalidation \
  --distribution-id E1A2B3C4D5 \
  --paths "/index.html" "/api/*"   # invalidate HTML and API paths, not hashed assets`}
        </CodeBlock>
      </Accordion>

      <Accordion title="Load Balancer — AWS ALB" icon={Network}>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">What the ALB does:</span> Terminates TLS (holds the certificate). Inspects HTTP host header and path. Routes to the correct target group based on listener rules. In an EKS setup with the AWS Load Balancer Controller, the target group points to ingress controller pods (NodePort), not directly to application pods.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">ALB vs NLB:</span> ALB is Layer 7 (HTTP/HTTPS) — routes by path, host, headers, query strings. Supports WebSocket and HTTP/2. NLB is Layer 4 (TCP/UDP) — ultra-low latency, static IPs, used for non-HTTP protocols or when you need IP preservation (client IP reaches the backend unchanged). Most web applications use ALB.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Health checks:</span> ALB polls every registered target every 30 seconds (configurable). Unhealthy targets are removed from rotation. This is the first safety net against bad deploys — if new pods fail the health check, traffic stays on old pods. False positives (overly strict health checks) cause unnecessary 502s.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">ALB access logs:</span> Every request logged to S3: source IP, latency, status code, target, request line. This is your primary post-incident forensics tool. Enable access logs — the storage cost is trivial, and the debugging value is not.</div>
          </li>
        </ul>
        <CompareTable
          headers={['ALB Feature', 'What It Enables']}
          rows={[
            ['Path-based routing', 'Single ALB handles /api/* → backend, /static/* → S3, / → frontend'],
            ['Host-based routing', 'Single ALB for api.mycompany.com and dashboard.mycompany.com'],
            ['Sticky sessions', 'Same client always routes to same target (useful for WebSocket, session state)'],
            ['Connection draining', 'In-flight requests complete before target is removed from rotation during deploys'],
            ['WAF integration', 'Rate limiting, geographic blocking, SQL injection detection at the ALB layer'],
          ]}
        />
      </Accordion>

      <Accordion title="Ingress Controller — Traffic Cop Inside Kubernetes" icon={Layers}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The ingress controller is a pod (or set of pods) inside the cluster that implements the Kubernetes Ingress API. It watches for Ingress resources and configures its routing logic accordingly. The ALB sends traffic to the ingress controller, which then distributes to the correct backend Service.
        </p>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">NGINX Ingress Controller:</span> The most common choice. Runs NGINX under the hood. Supports rate limiting, auth middleware, header manipulation, WebSocket, and dozens of custom annotations. Highly configurable but complex to tune for performance.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">AWS Load Balancer Controller (ALB mode):</span> Instead of routing traffic through ingress controller pods, this approach provisions a real ALB per Ingress resource (or per IngressClass). Traffic goes directly from ALB to pod IPs (IP mode) via target groups. Lower latency but more ALBs (more cost).</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Ingress as the observability anchor:</span> NGINX exposes per-upstream metrics (request rate, error rate, latency) that map directly to your SLO dashboards. The ingress controller is where you see the first signal of a backend issue — latency increases before error rate spikes.</div>
          </li>
        </ul>
        <CodeBlock language="yaml">
{`apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: payments-api
  namespace: payments-prod
  annotations:
    # NGINX-specific
    nginx.ingress.kubernetes.io/use-regex: "true"
    nginx.ingress.kubernetes.io/limit-rps: "100"     # rate limit per IP
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "5"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "30"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "30"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - payments.mycompany.com
      secretName: payments-tls   # cert-manager managed certificate
  rules:
    - host: payments.mycompany.com
      http:
        paths:
          - path: /api/v1
            pathType: Prefix
            backend:
              service:
                name: payments-api
                port:
                  number: 8080`}
        </CodeBlock>
      </Accordion>

      <Accordion title="Kubernetes Service and Pod" icon={Server}>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">How ClusterIP Service works:</span> A Service is a virtual IP (ClusterIP) with a stable DNS name. kube-proxy programs iptables rules on every node so that traffic to the ClusterIP:Port gets DNAT'd to one of the healthy pod IPs (load balancing by random selection at the iptables layer). No actual proxy process — pure kernel networking.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Endpoints and readiness:</span> A pod is added to the Service Endpoints list only when its readiness probe passes. When a pod is terminating, it is removed from Endpoints immediately. This is what enables zero-downtime rolling updates — new pods join before old ones leave.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Headless Services:</span> When you set <code>clusterIP: None</code>, the Service has no ClusterIP. DNS returns all pod IPs directly. Clients do their own load balancing. Used by StatefulSets so each pod gets a stable DNS name (pod-0.my-service.namespace.svc.cluster.local).</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Downstream calls from the pod:</span> Internal calls to other services use Service DNS names and skip all the external layers (no ALB, no ingress). AWS service calls (Secrets Manager, S3, SQS) go via VPC endpoints (if configured) or through NAT Gateway. The pod's IRSA credentials handle AWS authentication.</div>
          </li>
        </ul>
      </Accordion>

      <Accordion title="Response Path and Distributed Tracing" icon={Activity}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The response travels back: Pod → Service → Ingress → ALB → CDN → Client. The more operationally important question is what each layer adds to observability on the way back.
        </p>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Distributed tracing:</span> A trace ID is injected at the ALB or ingress layer (via request ID headers) and propagated through every service call using standard headers (W3C Trace-Context, B3, X-Request-ID). Your observability backend (Jaeger, Tempo, Datadog APM) stitches these spans into a full request tree, showing which service and which database query consumed the latency.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">The 3am diagnostic workflow:</span> Latency spike alert fires. (1) ALB access logs show elevated latency to the target. (2) NGINX metrics show which upstream has high p99. (3) Pod metrics show CPU throttling or high GC pause time. (4) Distributed trace shows the DB query taking 800ms. Each layer narrows the search.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Connection timeouts vs read timeouts:</span> Configure timeout at every hop. ALB connection timeout, NGINX proxy_read_timeout, application-level HTTP client timeout, and DB connection timeout. If any layer's timeout is too short relative to the actual processing time, you get spurious 504 Gateway Timeouts while the backend is still working correctly.</div>
          </li>
        </ul>
        <CodeBlock language="bash">
{`# Measure latency breakdown with curl
curl -w "
DNS:     %{time_namelookup}s
TCP:     %{time_connect}s
TLS:     %{time_appconnect}s
Wait:    %{time_pretransfer}s
TTFB:    %{time_starttransfer}s
Total:   %{time_total}s
" -o /dev/null -s https://api.mycompany.com/health

# Expected: DNS < 50ms, TCP + TLS < 100ms, TTFB < 200ms for fast APIs`}
        </CodeBlock>
        <HighlightBox type="tip">The first byte time (TTFB) in the curl output is the sum of DNS + TCP + TLS + server processing time. If TTFB is high but DNS and TCP are fast, the server is slow. If TCP is high, there is a network path issue. This single command lets you isolate the bottleneck layer before spending time looking in the wrong place.</HighlightBox>
      </Accordion>
    </div>
  );
}
