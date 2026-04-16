import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import NotesBox from '../components/NotesBox';
import HighlightBox from '../components/HighlightBox';

export default function RequestFlow() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">{'\uD83D\uDD01'} System Internals</div>
        <h1>Request Flow</h1>
        <p>What actually happens from the moment a user clicks "Login" to the moment they get a response — every hop, every layer's job.</p>
      </div>

      <HighlightBox type="tip">Why this matters for interviews: In a system design round, you'll be asked to design infra for a service. The answer always maps to this skeleton. Knowing each layer's responsibility — and what breaks if it's missing — is what makes your answer senior-level.</HighlightBox>

      <ReasoningMap cards={[
        {
          title: 'Flow Overview: User clicks Login',
          body: "DNS \u2192 CDN \u2192 Load Balancer (ALB) \u2192 Ingress Controller \u2192 K8s Service \u2192 Pod \u2192 Downstream calls \u2192 Response travels back the same path"
        }
      ]} />

      <Accordion title="DNS Resolution" icon="1\uFE0F\u20E3" defaultOpen={true}>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">What happens:</span> Browser asks a DNS resolver "what's the IP for app.company.com?" In AWS this is Route53. The answer is either a CDN edge IP or directly an ALB DNS name.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">TTL matters:</span> Low TTL = faster failover, more DNS queries (cost + latency). High TTL = cached longer, slower to update during incidents. For production endpoints, Route53 health checks + failover routing give you automatic rerouting without waiting for TTL.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Split-horizon DNS:</span> Internal services resolve to private IPs (within VPC), external clients resolve to public IPs. Same domain, different answers based on where you're querying from.</div>
          </li>
        </ul>
      </Accordion>

      <Accordion title="CDN (e.g. CloudFront)" icon="2\uFE0F\u20E3">
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">What it does for API calls:</span> Mostly passes through (API responses aren't cached). But still provides: TLS termination at the edge, DDoS protection (AWS Shield), geographic routing, and WAF rules.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">What it does for static assets:</span> JS, CSS, images are served directly from the CDN edge — the origin (your cluster) is never hit. This is the main latency win.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Cache-Control is critical:</span> Your app controls whether CDN caches responses via response headers. For login APIs: <code>Cache-Control: no-store</code>. For versioned JS bundles: <code>Cache-Control: max-age=31536000, immutable</code>.</div>
          </li>
        </ul>
        <NotesBox id="request-flow-cdn" placeholder="Did your system use CloudFront? What was in front of it (WAF, Shield)? How were cache policies configured?" />
      </Accordion>

      <Accordion title="Load Balancer (AWS ALB)" icon="3\uFE0F\u20E3">
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">What it does:</span> Terminates TLS, inspects HTTP host + path headers, and routes to the right target group based on listener rules. In an EKS setup, the target group points to your Ingress Controller pods (not directly to app pods).</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">ALB vs NLB:</span> ALB is Layer 7 (HTTP/HTTPS) — can route by path, host, headers. NLB is Layer 4 (TCP/UDP) — faster, used for non-HTTP or ultra-low latency. Most web services use ALB.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Health checks:</span> ALB constantly pings target health endpoints. Unhealthy targets are removed from rotation automatically. This is your first safety net against bad deploys.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Access logs:</span> Every request is logged — source IP, latency, status code, target. This is your first observability point and critical for debugging latency spikes.</div>
          </li>
        </ul>
      </Accordion>

      <Accordion title="Ingress Controller (inside K8s)" icon="4\uFE0F\u20E3">
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">What it does:</span> Traffic cop inside the cluster. Reads Ingress resources and routes by host/path to the right K8s Service. This is where you configure rate limiting, auth middleware, timeouts, and header manipulation.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Common options:</span> NGINX Ingress Controller (most common), AWS Load Balancer Controller (provisions ALB/NLB directly from K8s), Traefik, Kong. Your choice affects where routing logic lives — in K8s or in AWS.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Metrics here:</span> Ingress controllers expose request rate, error rate, and latency per upstream — the foundation of your SLO dashboards.</div>
          </li>
        </ul>
        <NotesBox id="request-flow-ingress" placeholder="Which ingress controller did your team use? NGINX, AWS LBC, Traefik? How were routing rules managed — Helm values, raw Ingress manifests, or ArgoCD?" />
      </Accordion>

      <Accordion title="K8s Service \u2192 Pod" icon="5\uFE0F\u20E3">
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">K8s Service (ClusterIP):</span> A stable virtual IP. Doesn't process the request — kube-proxy programs iptables rules so traffic to the ClusterIP gets DNAT'd to one of the healthy backend pod IPs. This is also where your HPA replica count matters.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Pod receives the request:</span> Your application code runs here. For login: validates the request, calls auth/user services or DB, generates JWT/session token, returns response.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Downstream service calls:</span> Internal calls to other services skip all the above layers — they go Service {'\u2192'} Pod directly within the cluster network. AWS calls (Secrets Manager, RDS, SQS) go via VPC endpoints or NAT Gateway.</div>
          </li>
        </ul>
      </Accordion>

      <Accordion title="Response Path & The Hidden Layer" icon={'\u21A9\uFE0F'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The response travels back: Pod {'\u2192'} Service {'\u2192'} Ingress {'\u2192'} ALB {'\u2192'} CDN {'\u2192'} Client. But the more important point is what each layer adds on the way back.
        </p>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">The part most people miss:</span> Each layer is not just a routing hop — it's a failure boundary and an observability point. ALB access logs, Ingress controller metrics, pod traces. A well-designed system has visibility at every hop.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Distributed tracing:</span> A trace ID is injected at the edge (or CDN) and propagated through every service call. In your observability stack (Jaeger, Tempo, Datadog APM), you can see the full request tree and where latency accumulated.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">The 3am question:</span> If login is slow, which layer is the bottleneck? ALB latency metrics {'\u2192'} Ingress latency {'\u2192'} Pod response time {'\u2192'} downstream DB query time. This is why you instrument every layer.</div>
          </li>
        </ul>
      </Accordion>
    </div>
  );
}
