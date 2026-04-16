import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import NotesBox from '../components/NotesBox';
import HighlightBox from '../components/HighlightBox';
import CompareTable from '../components/CompareTable';
import CodeBlock from '../components/CodeBlock';

export default function Networking() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">{'\uD83C\uDF0D'} Network Fundamentals</div>
        <h1>Networking Deep Dive</h1>
        <p>DNS resolution, TCP handshake, TLS setup, and CDN mechanics — understanding the full journey from URL to response. These fundamentals come up in every "how does the internet work" interview question.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Why Networking Matters for DevOps',
          body: 'Every production issue eventually becomes a networking issue. "The app is slow" could be DNS resolution delay, TCP retransmits, TLS handshake overhead, or CDN cache misses. You need to know the full stack to diagnose effectively.'
        },
        {
          title: 'The Full Request Journey',
          body: 'User types URL \u2192 DNS resolution (find IP) \u2192 TCP 3-way handshake (establish connection) \u2192 TLS handshake (encrypt) \u2192 HTTP request \u2192 Server processes \u2192 Response back through the same layers. Each step can fail or be slow.'
        },
        {
          title: 'Interview Context',
          body: '"What happens when you type google.com in your browser?" is the most classic interview question in tech. For DevOps, they want depth on DNS, TCP/TLS, load balancers, and CDNs — not just "a request goes to a server."'
        },
        {
          title: 'Debugging Lens',
          body: 'When users report "the site is slow," you need to isolate which layer is slow: DNS (dig/nslookup), TCP (connection time in curl), TLS (handshake time), server processing (TTFB), or content transfer (download time). Each has different fixes.'
        }
      ]} />

      <Accordion title="DNS Resolution — Step by Step" icon={'\uD83D\uDD0D'} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          DNS translates human-readable domain names to IP addresses. It's a distributed hierarchical database — not one server, but a chain of lookups.
        </p>

        <HighlightBox type="info">
          <strong>What happens when you type <code>app.example.com</code>:</strong><br /><br />
          <strong>1. Browser cache</strong> — Did I resolve this recently? (TTL-based cache)<br />
          <strong>2. OS cache</strong> — Check <code>/etc/hosts</code> and the OS DNS cache<br />
          <strong>3. Recursive resolver</strong> — Query your ISP's (or 8.8.8.8's) DNS resolver<br />
          <strong>4. Root nameserver</strong> — "I don't know app.example.com, but here's who handles .com" {'\u2192'} returns TLD nameserver<br />
          <strong>5. TLD nameserver (.com)</strong> — "I don't know app.example.com, but here's the authoritative NS for example.com" {'\u2192'} returns NS record<br />
          <strong>6. Authoritative nameserver</strong> — "app.example.com is 93.184.216.34" {'\u2192'} returns A record<br />
          <strong>7. Response cached</strong> — Recursive resolver caches with TTL, returns to client
        </HighlightBox>

        <CodeBlock>{`# Trace the full DNS resolution path
dig +trace app.example.com

# Check what DNS server responds and with what TTL
dig app.example.com +short
dig app.example.com +noall +answer

# Query a specific DNS server
dig @8.8.8.8 app.example.com

# Check DNS resolution time
dig app.example.com | grep "Query time"
# ;; Query time: 23 msec

# In Kubernetes — pods use CoreDNS (ClusterIP 10.96.0.10)
# Pod resolves "my-svc" → CoreDNS looks up my-svc.&lt;namespace&gt;.svc.cluster.local
# ndots:5 in /etc/resolv.conf means short names get 5 search suffixes tried first`}</CodeBlock>

        <HighlightBox type="warn">
          <strong>Kubernetes DNS gotcha — ndots:5:</strong> By default, pods have <code>ndots:5</code> in <code>/etc/resolv.conf</code>. This means any name with fewer than 5 dots gets the search suffixes appended first. So resolving <code>api.external.com</code> (2 dots) will first try <code>api.external.com.&lt;namespace&gt;.svc.cluster.local</code>, then <code>api.external.com.svc.cluster.local</code>, etc. — 5 failed DNS queries before the real one. Fix: use FQDNs with trailing dot (<code>api.external.com.</code>) or reduce ndots.
        </HighlightBox>

        <CompareTable
          headers={['DNS Record', 'What It Does', 'Real Example']}
          rows={[
            ['<strong>A</strong>', 'Maps domain to IPv4 address', '<code>app.example.com \u2192 93.184.216.34</code>'],
            ['<strong>AAAA</strong>', 'Maps domain to IPv6 address', '<code>app.example.com \u2192 2606:2800:220:1:...</code>'],
            ['<strong>CNAME</strong>', 'Alias — points to another domain name', '<code>www.example.com \u2192 app.example.com</code>'],
            ['<strong>NS</strong>', 'Nameserver — who\'s authoritative for this domain', '<code>example.com NS ns1.awsdns.com</code>'],
            ['<strong>MX</strong>', 'Mail server for the domain', '<code>example.com MX 10 mail.example.com</code>'],
            ['<strong>TXT</strong>', 'Arbitrary text (used for SPF, DKIM, domain verification)', '<code>example.com TXT "v=spf1 include:_spf.google.com ~all"</code>'],
            ['<strong>SRV</strong>', 'Service discovery (host + port)', 'Used by K8s for headless services'],
          ]}
        />

        <NotesBox id="networking-dns" placeholder="Have you managed Route53? Dealt with DNS propagation issues? Debugged ndots in K8s?" />
      </Accordion>

      <Accordion title="TCP 3-Way Handshake" icon={'\uD83E\uDD1D'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          TCP is a connection-oriented protocol. Before any data is sent, client and server must establish a connection through a 3-way handshake. This adds latency but guarantees reliable, ordered delivery.
        </p>

        <HighlightBox type="info">
          <strong>The 3-way handshake:</strong><br /><br />
          <strong>1. SYN</strong> — Client {'\u2192'} Server: "I want to connect. My sequence number is X."<br />
          <strong>2. SYN-ACK</strong> — Server {'\u2192'} Client: "OK. I acknowledge X+1. My sequence number is Y."<br />
          <strong>3. ACK</strong> — Client {'\u2192'} Server: "I acknowledge Y+1. Connection established."<br /><br />
          This takes <strong>1 round-trip (RTT)</strong> before any data flows. For a server 50ms away, that's 50ms just to establish TCP.
        </HighlightBox>

        <CodeBlock>{`# Measure TCP connection time with curl
curl -w "DNS: %{time_namelookup}s\\nTCP: %{time_connect}s\\nTLS: %{time_appconnect}s\\nTTFB: %{time_starttransfer}s\\nTotal: %{time_total}s\\n" \\
  -o /dev/null -s https://example.com

# Example output:
# DNS:  0.023s       ← DNS resolution
# TCP:  0.045s       ← TCP handshake complete (0.045 - 0.023 = 22ms for handshake)
# TLS:  0.112s       ← TLS handshake complete
# TTFB: 0.234s       ← First byte received (server processing time)
# Total: 0.312s      ← Full response received

# Watch TCP connections and their states
ss -tnp | grep &lt;port&gt;
# States: ESTABLISHED, TIME_WAIT, CLOSE_WAIT, SYN_SENT, etc.`}</CodeBlock>

        <HighlightBox type="warn">
          <strong>TCP connection states to know:</strong><br />
          <strong>TIME_WAIT:</strong> Connection is closed but waiting (default 60s) to handle late packets. Too many = port exhaustion. Fix: tune <code>net.ipv4.tcp_tw_reuse</code>.<br />
          <strong>CLOSE_WAIT:</strong> Remote end closed, but local app hasn't. This means a bug in your app — it's not closing connections. Fix: find and fix the connection leak.<br />
          <strong>SYN_SENT / SYN_RECV:</strong> Handshake in progress. Many of these = firewall dropping SYN packets or server under SYN flood attack.
        </HighlightBox>

        <HighlightBox type="tip">
          <strong>Performance insight:</strong> Each new TCP connection costs 1 RTT. HTTP/1.1 Keep-Alive reuses connections (avoids re-handshake). HTTP/2 multiplexes multiple requests over one connection. HTTP/3 (QUIC) uses UDP and does TLS + transport setup in 1 RTT (or 0 RTT for repeat connections).
        </HighlightBox>

        <NotesBox id="networking-tcp" placeholder="Have you debugged connection issues? Dealt with TIME_WAIT buildup? Used tcpdump or Wireshark?" />
      </Accordion>

      <Accordion title="TLS Handshake — What Happens During HTTPS" icon={'\uD83D\uDD10'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          TLS (Transport Layer Security) encrypts the connection between client and server. The TLS handshake negotiates encryption parameters and authenticates the server (and optionally the client).
        </p>

        <HighlightBox type="info">
          <strong>TLS 1.3 Handshake (modern — 1 RTT):</strong><br /><br />
          <strong>1. Client Hello</strong> — Client {'\u2192'} Server: supported cipher suites, supported TLS versions, client random, key share (Diffie-Hellman parameters)<br />
          <strong>2. Server Hello + Finished</strong> — Server {'\u2192'} Client: chosen cipher suite, server certificate, server key share, encrypted handshake data<br />
          <strong>3. Client Finished</strong> — Client verifies certificate chain, computes shared secret, sends encrypted finished message<br /><br />
          <strong>Total: 1 RTT</strong> (TLS 1.2 was 2 RTTs). With 0-RTT resumption, repeat connections can send data immediately.
        </HighlightBox>

        <HighlightBox type="info">
          <strong>Certificate verification (what the client checks):</strong><br />
          1. Is the certificate signed by a trusted CA? (chain of trust up to root CA)<br />
          2. Is the domain name in the certificate's SAN (Subject Alternative Name)?<br />
          3. Is the certificate expired?<br />
          4. Is the certificate revoked? (OCSP stapling or CRL check)
        </HighlightBox>

        <CodeBlock>{`# Inspect a server's TLS certificate
openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | openssl x509 -text -noout

# Check certificate expiry
echo | openssl s_client -connect example.com:443 2>/dev/null | openssl x509 -noout -dates

# Test TLS handshake with curl verbose
curl -vI https://example.com 2>&1 | grep -E "SSL|TLS|subject|issuer|expire"

# In Kubernetes — cert-manager automates certificate management:
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-tls
spec:
  secretName: app-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - app.example.com`}</CodeBlock>

        <CompareTable
          headers={['TLS Version', 'Handshake RTTs', 'Key Exchange', 'Status']}
          rows={[
            ['TLS 1.2', '2 RTTs', 'RSA or ECDHE (configurable)', 'Still common, being phased out'],
            ['TLS 1.3', '1 RTT (0-RTT for resumption)', 'ECDHE only (forward secrecy required)', 'Modern standard, much faster'],
          ]}
        />

        <HighlightBox type="warn">
          <strong>Common TLS issues in production:</strong><br />
          - <strong>Certificate expired:</strong> Users see "Your connection is not private." Use cert-manager with auto-renewal.<br />
          - <strong>Mixed content:</strong> Page loads over HTTPS but resources over HTTP. Browser blocks them.<br />
          - <strong>SNI mismatch:</strong> Server sends wrong certificate because it doesn't support SNI or the ingress has a misconfigured host rule.<br />
          - <strong>Intermediate CA missing:</strong> Server sends leaf cert but not the intermediate. Some clients can't build the chain.
        </HighlightBox>

        <NotesBox id="networking-tls" placeholder="Have you managed certificates? Used cert-manager? Debugged TLS errors in production?" />
      </Accordion>

      <Accordion title="How CDNs Work — Edge Caching & Anycast" icon={'\uD83C\uDF10'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          A CDN (Content Delivery Network) caches content at edge locations worldwide, reducing latency by serving from a server close to the user instead of the origin server.
        </p>

        <HighlightBox type="info">
          <strong>CDN request flow:</strong><br /><br />
          <strong>1.</strong> User requests <code>app.example.com/image.png</code><br />
          <strong>2.</strong> DNS resolves to CDN edge IP (using anycast — same IP announced from many locations, BGP routes to nearest)<br />
          <strong>3.</strong> CDN edge checks cache:<br />
          &nbsp;&nbsp;&nbsp;&nbsp;<strong>Cache HIT:</strong> Returns cached response immediately (fast — ~10-50ms)<br />
          &nbsp;&nbsp;&nbsp;&nbsp;<strong>Cache MISS:</strong> Edge fetches from origin server, caches it, returns to user<br />
          <strong>4.</strong> Response includes cache headers: <code>Cache-Control</code>, <code>X-Cache: Hit from cloudfront</code>
        </HighlightBox>

        <CompareTable
          headers={['CDN Concept', 'What It Is', 'Why It Matters']}
          rows={[
            ['<strong>Edge Location</strong>', 'Server/datacenter close to users (CloudFront has 400+ globally)', 'Reduces latency — content served from 20ms away instead of 200ms'],
            ['<strong>Anycast Routing</strong>', 'Same IP address announced from multiple locations; BGP routes to nearest', 'User always hits closest edge without explicit geo-routing logic'],
            ['<strong>Cache-Control</strong>', 'HTTP header that tells CDN how long to cache (<code>max-age=3600</code>)', 'Controls freshness vs performance tradeoff'],
            ['<strong>Cache Invalidation</strong>', 'Purging stale content from edge caches', '"The two hardest problems in CS: cache invalidation and naming things"'],
            ['<strong>Origin Shield</strong>', 'Extra cache layer between edges and origin', 'Reduces load on origin server during cache misses'],
          ]}
        />

        <CodeBlock>{`# Check if response came from CDN cache
curl -I https://app.example.com/static/main.js 2>/dev/null | grep -i "x-cache\\|cache-control\\|age\\|cf-cache"

# Example CloudFront response:
# X-Cache: Hit from cloudfront
# Age: 3456
# Cache-Control: public, max-age=86400

# Invalidate CloudFront cache (when you deploy new static assets)
aws cloudfront create-invalidation \\
  --distribution-id E1A2B3C4D5 \\
  --paths "/static/*" "/index.html"

# Better pattern: use content-hashed filenames
# main.abc123.js → never needs invalidation (new hash = new URL)`}</CodeBlock>

        <HighlightBox type="tip">
          <strong>Best practice:</strong> Use content-hashed filenames for static assets (<code>main.abc123.js</code>). Set <code>Cache-Control: public, max-age=31536000, immutable</code>. The filename changes when content changes, so you never need cache invalidation. For HTML documents, use short TTLs (<code>max-age=300</code>) so users get updated references to new asset URLs.
        </HighlightBox>

        <HighlightBox type="warn">
          <strong>CDN debugging tip:</strong> If users report stale content after a deploy, check: (1) Did the CDN cache get invalidated? (2) Is the browser caching locally? (clear cache or use <code>Cache-Control: no-cache</code>). (3) Are you using content-hashed filenames? If not, you're fighting cache invalidation constantly.
        </HighlightBox>

        <NotesBox id="networking-cdn" placeholder="Have you worked with CloudFront, Cloudflare, or other CDNs? How do you handle cache invalidation on deploy?" />
      </Accordion>

      <Accordion title="Interview Q&A — Networking Scenarios" icon={'\uD83C\uDFAF'}>
        <HighlightBox type="info">
          <strong>Q: Users report intermittent slow load times on your app. Walk through how you'd diagnose it from DNS all the way to the pod.</strong><br /><br />
          "I'd work through the layers systematically. (1) <strong>DNS:</strong> Run <code>dig</code> from multiple locations — is resolution slow or inconsistent? Check TTLs, check if ndots is causing extra queries in K8s. (2) <strong>TCP/TLS:</strong> Use <code>curl -w</code> to break down connection time vs TLS time vs TTFB. If TCP connect is slow, it could be network path or server accept queue full. (3) <strong>CDN:</strong> Check <code>X-Cache</code> headers — are we getting cache hits? If cache miss rate is high, check Cache-Control headers. (4) <strong>Load Balancer:</strong> Check ALB metrics — target response time, healthy host count, 5xx from targets. (5) <strong>Pod level:</strong> Check latency metrics in Grafana, look for high p99 (not just p50). Check if pods are being throttled (CPU limits) or if GC pauses are happening. (6) <strong>Dependencies:</strong> Is the DB slow? Are external API calls timing out? One slow dependency can cascade. The key is being systematic — don't jump to the pod until you've ruled out the network layers."
        </HighlightBox>

        <HighlightBox type="info">
          <strong>Q: What happens when you type google.com in your browser?</strong><br /><br />
          "The browser checks its DNS cache, then the OS cache, then queries the recursive resolver (like 8.8.8.8 or your ISP). The resolver walks the DNS hierarchy: root {'\u2192'} .com TLD {'\u2192'} google.com's authoritative nameserver {'\u2192'} gets the A record (IP address). Then the browser opens a TCP connection (SYN {'\u2192'} SYN-ACK {'\u2192'} ACK). Since it's HTTPS, a TLS handshake follows — client hello, server hello with certificate, key exchange, encrypted connection established. Now the browser sends an HTTP GET / request. The server (or CDN edge) processes it and returns HTML. The browser parses HTML, discovers CSS/JS/image resources, opens additional connections (or reuses via HTTP/2 multiplexing) to fetch them. The page renders progressively as resources arrive. Total time: typically 200-500ms for first contentful paint on a well-optimized site."
        </HighlightBox>

        <HighlightBox type="info">
          <strong>Q: How would you reduce latency for users in a different continent?</strong><br /><br />
          "CDN is the primary answer — serve static assets from edge locations near the user. For dynamic content: (1) Deploy the application in multiple regions with a global load balancer (Route53 latency-based routing or CloudFront with regional origins). (2) Use HTTP/2 or HTTP/3 to reduce round trips. (3) Optimize TLS — TLS 1.3 saves 1 RTT vs 1.2, and session resumption saves another. (4) Reduce payload size — compress responses (gzip/brotli), optimize images (WebP/AVIF). (5) Prefetch DNS for domains you know the page will need. (6) Consider read replicas in the remote region if DB latency is the bottleneck."
        </HighlightBox>

        <HighlightBox type="info">
          <strong>Q: Explain the difference between HTTP/1.1, HTTP/2, and HTTP/3.</strong><br /><br />
          "HTTP/1.1: one request per connection at a time (head-of-line blocking). Browsers open 6 parallel connections per domain as a workaround. HTTP/2: multiplexes multiple requests over a single TCP connection — no head-of-line blocking at the HTTP layer, but still has it at the TCP layer (one lost packet blocks all streams). HTTP/3: uses QUIC (UDP-based) instead of TCP — eliminates TCP head-of-line blocking, integrates TLS into the transport (faster handshake), and handles connection migration (works when switching WiFi to cellular). For DevOps: ensure your ALB/ingress supports HTTP/2, and your CDN supports HTTP/3."
        </HighlightBox>

        <NotesBox id="networking-interview" placeholder="Customize these answers with your experience. Have you debugged latency issues? Configured CDNs? Set up Route53?" />
      </Accordion>
    </div>
  );
}
