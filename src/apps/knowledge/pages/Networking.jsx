import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import HighlightBox from '../components/HighlightBox';
import CompareTable from '../components/CompareTable';
import CodeBlock from '../components/CodeBlock';
import { Globe, Network, Lock, Zap, Activity, Server } from 'lucide-react';

export default function Networking() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">Network Fundamentals</div>
        <h1>Networking Deep Dive</h1>
        <p>DNS resolution mechanics, TCP state machine, TLS handshake internals, CDN edge routing, and the curl timing breakdown that isolates which layer is slow — the full stack from URL to response byte.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Every Production Issue Is Eventually a Networking Issue',
          body: 'Slow API responses could be DNS resolution delay inside the pod, TCP connect latency to a dependency, TLS handshake overhead on every new connection, CDN cache misses, or server TTFB (the actual application processing time). These are different problems with different fixes. Without knowing which layer is slow, you are guessing. The curl -w timing breakdown and systematic layer-by-layer isolation are the foundation of networking debugging.'
        },
        {
          title: 'The Request Path',
          body: 'User types URL → browser checks DNS cache → OS checks /etc/hosts → recursive resolver walks DNS hierarchy → TCP 3-way handshake to server IP → TLS 1.3 handshake (1 RTT) → HTTP request → server processes → response → browser renders. Each step has measurable latency and its own failure modes. In Kubernetes, there are additional layers: CoreDNS for service discovery, kube-proxy iptables rules for ClusterIP routing, ingress controller, and pod network namespace traversal.'
        }
      ]} />

      <Accordion title="DNS Resolution — The Full Hierarchy" icon={Globe} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          DNS is a distributed hierarchical database with caching at every layer. It is not one server — it is a delegation chain where each level says "I do not know the answer, but here is who does." Understanding this chain is essential for debugging propagation delays, stale caches, and DNS-based failures.
        </p>
        <CodeBlock language="bash">
{`# Full DNS delegation trace for app.example.com:

# 1. Browser DNS cache (TTL from previous response)
# 2. OS resolver cache (/etc/nsswitch.conf controls order: files, dns)
# 3. /etc/hosts file (checked before network queries on most systems)
# 4. Recursive resolver (your DHCP-assigned DNS, 8.8.8.8, or 1.1.1.1)
#    - If cached: returns immediately
#    - If not cached: walks the hierarchy:

# Root nameserver (13 root server IPs, anycast to hundreds of locations):
#   "I don't know app.example.com, but .com TLD is handled by these NS records"
#   → returns NS records for .com TLD

# .com TLD nameserver (operated by Verisign):
#   "I don't know app.example.com, but example.com NS records point to:"
#   → returns NS records for example.com (usually Route53 or Cloudflare)

# Authoritative nameserver for example.com (e.g., ns1.p01.awsdns-01.com):
#   "app.example.com is 93.184.216.34 (A record) with TTL 300"
#   → returns the actual IP address

# 5. Recursive resolver caches the A record with the TTL
# 6. Returns IP to client; client caches it

# Trace the full chain yourself:
dig +trace app.example.com

# Check what resolver you're using:
cat /etc/resolv.conf

# Measure DNS resolution time:
dig app.example.com | grep "Query time"
# ;; Query time: 12 msec   ← fast (cached at resolver)
# ;; Query time: 189 msec  ← slow (cache miss, full resolution)`}
        </CodeBlock>
        <CompareTable
          headers={['DNS Record Type', 'Purpose', 'Example', 'Notes']}
          rows={[
            ['A', 'IPv4 address mapping', 'app.example.com → 93.184.216.34', 'The fundamental record. Multiple A records = round-robin DNS load balancing'],
            ['AAAA', 'IPv6 address mapping', 'app.example.com → 2606:2800:220:1:248:1893:25c8:1946', 'Dual-stack: return both A and AAAA, client chooses'],
            ['CNAME', 'Alias to another domain name', 'www.example.com → app.example.com', 'Cannot exist at zone apex (use ALIAS/ANAME for apex)'],
            ['NS', 'Nameserver delegation', 'example.com NS ns1.p01.awsdns-01.com', 'Delegates authority for a zone to specific nameservers'],
            ['MX', 'Mail exchange — where to deliver email', 'example.com MX 10 mail.example.com', 'Priority value: lower number = higher priority'],
            ['TXT', 'Arbitrary text — SPF, DKIM, domain verification', 'example.com TXT "v=spf1 include:_spf.google.com ~all"', 'Used for many verification protocols'],
            ['SRV', 'Service location: host, port, weight, priority', '_http._tcp.example.com SRV 0 5 80 app.example.com', 'Kubernetes headless services use SRV records'],
          ]}
        />
        <HighlightBox type="warn">Kubernetes DNS gotcha — ndots:5: pods have ndots:5 in /etc/resolv.conf by default. Any hostname with fewer than 5 dots triggers search path resolution before trying the hostname directly. Resolving api.stripe.com (2 dots, fewer than 5) causes CoreDNS to try: api.stripe.com.payments-prod.svc.cluster.local, api.stripe.com.svc.cluster.local, api.stripe.com.cluster.local, api.stripe.com — four failing queries before the real one. At scale with thousands of requests per second, this generates significant CoreDNS load. Fix: append a trailing dot to force absolute resolution (api.stripe.com.) or use ndots:2 in pod dnsConfig to reduce the threshold.</HighlightBox>
        <CodeBlock language="yaml">
{`# Fix ndots in a pod spec:
spec:
  dnsConfig:
    options:
      - name: ndots
        value: "2"   # only try search suffixes if fewer than 2 dots
  # Or: use FQDN with trailing dot in app config:
  # DB_HOST: "postgres.payments-prod.svc.cluster.local."  ← note trailing dot
  # This bypasses ndots entirely — resolved as absolute name immediately`}
        </CodeBlock>
      </Accordion>

      <Accordion title="TCP — Connection Lifecycle and State Machine" icon={Network}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          TCP is a connection-oriented, reliable, ordered protocol. Before any application data flows, a 3-way handshake establishes the connection. After the conversation ends, a 4-way close process terminates it. The TCP state machine determines connection behavior at each stage.
        </p>
        <CodeBlock language="bash">
{`# 3-way handshake — 1 round-trip overhead before data:
# Client → Server: SYN (seq=X)
# Server → Client: SYN-ACK (seq=Y, ack=X+1)
# Client → Server: ACK (ack=Y+1)
# Connection is now ESTABLISHED — application data can flow

# 4-way close — each side closes independently:
# Client → Server: FIN
# Server → Client: ACK
# (Server may send more data here)
# Server → Client: FIN
# Client → Server: ACK (enters TIME_WAIT state)

# TIME_WAIT lasts 2*MSL (Maximum Segment Lifetime) = typically 60 seconds
# Purpose: ensures delayed packets from this connection don't interfere with a new one
# Problem: high-traffic servers can accumulate thousands of TIME_WAIT connections
# Solution: tune net.ipv4.tcp_tw_reuse = 1 (reuse TIME_WAIT sockets for new outbound connections)

# View TCP connection states on a host:
ss -tn | awk '{print $1}' | sort | uniq -c | sort -rn
# Output:
# 12450 ESTABLISHED
#  8234 TIME_WAIT      ← normal for active HTTP servers
#    45 CLOSE_WAIT     ← potentially problematic
#     3 SYN_RECV

# CLOSE_WAIT = remote sent FIN, local app did not respond with FIN
# Indicates a bug: local application is not closing connections properly
# Fix: find where connections are leaked (HTTP clients, DB connections)

# SYN flood detection — many SYN_RECV, few ESTABLISHED:
ss -tn state syn-recv | wc -l`}
        </CodeBlock>
        <CompareTable
          headers={['TCP State', 'Meaning', 'Common Cause', 'Problem Threshold']}
          rows={[
            ['ESTABLISHED', 'Active connection in use', 'Normal — active clients or server connections', 'Concern if more than ulimit allows'],
            ['TIME_WAIT', 'Closed, waiting for late packets to expire', 'Normal on high-traffic servers', 'Concern if causing port exhaustion (ephemeral port range ~28k ports)'],
            ['CLOSE_WAIT', 'Remote closed, local has not', 'Application bug — not calling close()/response.body.Close()', 'Any sustained count is a problem'],
            ['SYN_RECV', 'Received SYN, sent SYN-ACK, waiting for ACK', 'Normal briefly; many = SYN flood attack or firewall issue', '>100 sustained is concerning'],
            ['FIN_WAIT_2', 'Local sent FIN, waiting for remote FIN', 'Normal briefly; sustained = remote not completing close', 'Sustained count indicates remote issue'],
          ]}
        />
        <HighlightBox type="tip">Connection reuse is critical for performance. HTTP/1.1 with Keep-Alive reuses the TCP connection for multiple requests, avoiding the 1-RTT handshake cost per request. HTTP/2 multiplexes multiple requests over a single connection. Without connection reuse, a service making 10,000 requests per second to a database 5ms away spends 50 seconds per second just on TCP handshakes — before any data is sent. Ensure your HTTP clients (including database drivers and Redis clients) use connection pools with persistent connections.</HighlightBox>
      </Accordion>

      <Accordion title="TLS Handshake — HTTPS Under the Hood" icon={Lock}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          TLS (Transport Layer Security) authenticates the server and establishes an encrypted channel. TLS 1.3 (2018) reduced the handshake from 2 RTTs (TLS 1.2) to 1 RTT, and added 0-RTT resumption for repeat connections. Understanding TLS is necessary for debugging certificate errors, handshake failures, and performance issues.
        </p>
        <CodeBlock language="bash">
{`# TLS 1.3 handshake sequence (1 RTT):

# Client → Server: ClientHello
#   - TLS version (1.3 preferred)
#   - Supported cipher suites (e.g., TLS_AES_256_GCM_SHA384)
#   - Client random (entropy for key derivation)
#   - Key share: client's Diffie-Hellman public key

# Server → Client: ServerHello + Certificate + Finished (all in one flight)
#   - Chosen cipher suite
#   - Server's DH public key
#   - Server's TLS certificate (signed by CA)
#   - Encrypted Finished message (using derived session key)

# Client: verifies certificate chain, derives same session key
# Client → Server: Finished
# → Encrypted connection established

# TLS 1.2 handshake sequence (2 RTTs — older, slower):
# RTT 1: ClientHello → ServerHello + Certificate + ServerHelloDone
# Client computes pre-master secret, sends ClientKeyExchange
# RTT 2: ChangeCipherSpec + Finished (both directions)

# Inspect TLS details for a connection:
openssl s_client -connect api.example.com:443 -servername api.example.com

# Check certificate expiry:
echo | openssl s_client -connect api.example.com:443 2>/dev/null \
  | openssl x509 -noout -dates
# notBefore=Jan  1 00:00:00 2026 GMT
# notAfter=Apr  1 00:00:00 2026 GMT  ← expiry date

# Check which TLS version is negotiated:
echo | openssl s_client -connect api.example.com:443 2>/dev/null | grep "Protocol  :"
# Protocol  : TLSv1.3`}
        </CodeBlock>
        <CompareTable
          headers={['TLS Issue', 'Error Message', 'Cause', 'Fix']}
          rows={[
            ['Certificate expired', 'SSL_ERROR_RX_RECORD_TOO_LONG or "certificate expired"', 'notAfter date has passed', 'Renew certificate; use cert-manager for automatic renewal'],
            ['Hostname mismatch', '"certificate is not valid for this hostname"', 'Certificate SANs do not include the requested hostname', 'Add hostname to certificate SAN; check ingress host rule'],
            ['Untrusted CA', '"certificate signed by unknown authority"', 'Intermediate CA not in chain or using private CA', 'Serve full chain; distribute private CA cert to clients'],
            ['TLS handshake timeout', 'Connection hangs, then times out', 'Firewall blocking TLS port (443), packet loss, server overloaded', 'Check firewall rules, trace with tcpdump, check server accept queue'],
            ['SNI mismatch', 'Wrong certificate returned', 'Server does not support SNI or ingress misconfigured', 'Add SNI support; fix ingress TLS host configuration'],
          ]}
        />
        <HighlightBox>Certificate chain issues are the most common TLS failure in production. The server must send not just its leaf certificate but also all intermediate CA certificates in the chain. Browsers can often fetch missing intermediates via AIA (Authority Information Access), but other clients (curl, backend services, mobile apps) typically cannot. When a new certificate is issued, validate the chain before deploying: <code>openssl verify -CAfile root-ca.crt -untrusted intermediate.crt leaf.crt</code>. cert-manager handles this automatically — it stores the full chain in the Kubernetes Secret.</HighlightBox>
      </Accordion>

      <Accordion title="curl Timing Breakdown — Isolating Slow Layers" icon={Activity}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The curl -w flag with timing variables produces a breakdown of where time is spent during a request. This is the primary tool for network performance debugging — it tells you definitively which layer is slow without requiring packet capture.
        </p>
        <CodeBlock language="bash">
{`# Full timing breakdown with curl
curl -w "\n\
DNS:    %{time_namelookup}s\n\
TCP:    %{time_connect}s\n\
TLS:    %{time_appconnect}s\n\
TTFB:   %{time_starttransfer}s\n\
Total:  %{time_total}s\n\
Size:   %{size_download} bytes\n" \
  -o /dev/null -s https://api.example.com/health

# Example output and interpretation:
# DNS:    0.001s  → cached (near-instant)
# TCP:    0.025s  → 24ms TCP handshake (TCP connect - DNS time)
# TLS:    0.075s  → 50ms TLS handshake (TLS - TCP time)
# TTFB:   0.234s  → 159ms server processing time (TTFB - TLS time)
# Total:  0.241s  → 7ms transfer time (Total - TTFB)

# What each high value indicates:
# DNS high (>50ms):  DNS cache miss, slow resolver, CoreDNS overloaded in K8s
# TCP high (>100ms): Network path latency, server overloaded, SYN backlog full
# TLS high (>100ms): TLS 1.2 (2 RTTs), no session resumption, CPU overhead
# TTFB high (>500ms): Application processing slow, DB queries slow, dependencies
# Transfer high:      Large response, slow network bandwidth

# Run multiple times to distinguish consistent vs transient issues:
for i in {1..10}; do
  curl -w "%{time_total}s\n" -o /dev/null -s https://api.example.com/health
done

# Test from different locations (use a VM in a different region):
# If DNS/TCP is fast from local but slow from EU → latency is geographic
# → Add CDN, deploy multi-region, or use Route53 latency-based routing`}
        </CodeBlock>
        <CodeBlock language="bash">
{`# Debugging DNS latency specifically in Kubernetes:

# Is CoreDNS overloaded?
kubectl top pods -n kube-system -l k8s-app=kube-dns
kubectl logs -n kube-system -l k8s-app=kube-dns --since=5m | grep -i "timeout\|error"

# CoreDNS metrics (if Prometheus is scraping it):
# coredns_dns_requests_total — request rate
# coredns_dns_request_duration_seconds — latency histogram
# coredns_cache_hits_total / coredns_cache_misses_total — cache efficiency

# Test DNS resolution from a pod:
kubectl run dns-debug --image=busybox:1.35 --rm -it --restart=Never -- \
  sh -c "time nslookup payments-api.payments-prod.svc.cluster.local"

# Check CoreDNS configmap for custom settings:
kubectl get configmap coredns -n kube-system -o yaml`}
        </CodeBlock>
      </Accordion>

      <Accordion title="CDN Mechanics — Edge Caching and Cache Strategy" icon={Zap}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          A CDN serves content from edge servers geographically close to users. The edge server acts as a caching proxy — on the first request for a resource (cache miss), it fetches from origin and caches the response. Subsequent requests for the same resource (cache hit) are served from the edge without contacting origin.
        </p>
        <CodeBlock language="bash">
{`# Verify CDN caching behavior:
curl -sI https://app.example.com/static/main.abc123.js | grep -i "x-cache\|cache-control\|age\|cf-cache-status\|x-amz-cf"

# CloudFront response headers:
# X-Cache: Hit from cloudfront
# Age: 7234           ← seconds since cached at edge
# Cache-Control: public, max-age=31536000, immutable

# Cloudflare response headers:
# CF-Cache-Status: HIT
# Age: 3600

# Cache miss (first request to this edge location):
# X-Cache: Miss from cloudfront
# Age: 0

# Invalidate CloudFront after a deployment:
aws cloudfront create-invalidation \
  --distribution-id E1XXXXXXXXXXXX \
  --paths "/index.html" "/manifest.json"
# Note: invalidations cost $0.005 per path after 1000/month free

# Better: use content-hashed filenames — no invalidation needed
# main.js → main.7c3a8f2b.js (new hash = new filename = new URL)
# Old URL stays cached (harmless — nobody will request it)
# New URL gets cached fresh on first request
# This is how Vite, webpack, etc. work by default`}
        </CodeBlock>
        <CompareTable
          headers={['Cache-Control Directive', 'Meaning', 'Use For']}
          rows={[
            ['max-age=31536000, immutable', 'Cache for 1 year, content will not change', 'Content-hashed static assets (JS, CSS, images with hash in filename)'],
            ['max-age=300', 'Cache for 5 minutes', 'HTML documents that reference hashed assets — short TTL allows updates'],
            ['no-cache', 'Must revalidate with server before using cached copy', 'Data that must always be fresh but can be conditionally cached'],
            ['no-store', 'Never cache this response anywhere', 'Sensitive data (auth tokens, personal information)'],
            ['s-maxage=3600', 'CDN cache TTL (overrides max-age for shared caches)', 'Different TTL for CDN vs browser — CDN caches longer'],
            ['stale-while-revalidate=60', 'Serve stale content for 60s while revalidating in background', 'APIs where slightly stale data is acceptable — improves perceived latency'],
          ]}
        />
        <HighlightBox>Anycast routing is how CDNs ensure users connect to the nearest edge. The same IP address (or range) is announced via BGP from hundreds of points-of-presence worldwide. BGP's routing algorithm (favoring shorter AS path, lower latency) ensures that when a user queries the IP, their ISP routes the request to the geographically closest PoP. This happens transparently — there is no DNS-based geo-routing required. CloudFront and Cloudflare both use anycast. AWS Global Accelerator also uses anycast but for dynamic content that cannot be cached.</HighlightBox>
      </Accordion>

      <Accordion title="HTTP Protocol Versions — What Actually Changed" icon={Server}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          HTTP version selection happens during TLS negotiation (ALPN extension). The server advertises supported versions; the client picks the highest mutually supported version. Understanding the differences matters for performance tuning and debugging protocol-level issues.
        </p>
        <CompareTable
          headers={['Version', 'Transport', 'Connections', 'Multiplexing', 'Head-of-Line Blocking', 'TLS Handshake']}
          rows={[
            ['HTTP/1.1', 'TCP', '6 parallel per hostname (browser limit)', 'No — one request per connection at a time', 'Yes — at both HTTP and TCP layer', 'TLS 1.2: 2 RTT; TLS 1.3: 1 RTT'],
            ['HTTP/2', 'TCP', 'One connection (multiplexed)', 'Yes — multiple streams over one TCP connection', 'HTTP layer: No; TCP layer: Yes (one packet loss blocks all streams)', 'Same as above'],
            ['HTTP/3', 'QUIC (UDP)', 'One QUIC connection', 'Yes — over QUIC streams', 'No — QUIC handles packet loss per stream independently', 'Integrated into QUIC: 1 RTT (or 0 RTT for resumption)'],
          ]}
        />
        <CodeBlock language="bash">
{`# Check which HTTP version is negotiated:
curl -sI --http2 https://api.example.com | head -1
# HTTP/2 200

curl -sI --http3 https://api.example.com | head -1
# HTTP/3 200 (requires curl 7.66+ with QUIC support)

# Check ALB HTTP/2 support (AWS ALB supports HTTP/2 to clients by default):
aws elbv2 describe-load-balancer-attributes \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  | jq '.Attributes[] | select(.Key | contains("http2"))'

# NGINX ingress: enable HTTP/2 (default in modern versions):
# nginx.ingress.kubernetes.io/use-http2: "true"

# Check if your backend supports HTTP/2 (pod to pod):
# Most Go/Node.js servers support HTTP/2 with net/http2 or http2 package
# Verify: kubectl exec -it payments-api-xxxx -- curl -sI --http2 http://localhost:8080/health`}
        </CodeBlock>
        <HighlightBox type="tip">HTTP/2 server push (sending resources before the client requests them) is largely deprecated — browsers removed support. Instead, use the Link preload header or Resource Hints. HTTP/3 is worth enabling at the CDN/ALB edge for client connections — browsers fully support it and the 0-RTT improvement is meaningful for mobile clients with variable latency. The backend (pod to pod, pod to database) typically stays on HTTP/1.1 or HTTP/2 depending on the client library, with no need for HTTP/3 on internal traffic where latency is low and packet loss is rare.</HighlightBox>
      </Accordion>
    </div>
  );
}
