import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import HighlightBox from '../components/HighlightBox';
import CompareTable from '../components/CompareTable';
import CodeBlock from '../components/CodeBlock';
import { Globe2, Route, Database, Scale, Activity, AlertTriangle } from 'lucide-react';

export default function MultiRegion() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">Global Architecture</div>
        <h1>Multi-Region Architecture</h1>
        <p>Active-active vs active-passive, DNS-based routing vs anycast, cross-region database replication, CAP trade-offs in practice, and the real failover playbooks that keep traffic flowing when an entire AWS region goes dark.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Regions Fail — Plan Accordingly',
          body: 'AWS us-east-1 has had multi-hour outages roughly once per year since 2011. If your service is single-region and that region goes down, your business is down. Multi-region is not just about latency for global users — it is fundamentally about survival when an entire cloud region is unreachable. The engineering cost is real (data replication, failover automation, eventual consistency) but the alternative is accepting a hard cap on availability of one region.'
        },
        {
          title: 'Latency vs Consistency — Pick Two (You Only Get Two)',
          body: 'CAP theorem is not an academic exercise when your EU database is 120ms behind your US primary. If a user in Paris writes their profile, reads it 50ms later from the local replica, and sees old data — that is the partition tolerance tax. Every multi-region design is a decision about where on the spectrum you sit: strong consistency (single write region, slower global writes) vs eventual consistency (local writes everywhere, conflict resolution needed). There is no free lunch.'
        },
        {
          title: 'Routing Layer Is The Control Plane',
          body: 'Whether traffic goes to us-east-1 or eu-west-1 is decided before it ever reaches your app. Route 53 latency policies, CloudFront, Global Accelerator, and Cloudflare anycast all answer the question "which region handles this request?" differently. Understanding the routing layer — and how fast it can fail traffic away from a broken region — is the difference between a 5-minute blip and a 4-hour outage.'
        }
      ]} />

      <Accordion title="Active-Active vs Active-Passive — The Core Trade-off" icon={Scale} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Every multi-region design is either active-active (all regions serve live traffic) or active-passive (one region is primary, others stand by for failover). The choice shapes cost, complexity, and RTO.
        </p>
        <CompareTable
          headers={['Dimension', 'Active-Active', 'Active-Passive']}
          rows={[
            ['Traffic pattern', 'Both regions serve live user traffic simultaneously', 'Primary serves 100%; secondary idle or read-only'],
            ['RTO (Recovery Time Objective)', 'Seconds — DNS or anycast reroutes around failed region', 'Minutes to hours — DNS cutover + DB promotion + cache warm-up'],
            ['RPO (Recovery Point Objective)', '0 to seconds (if sync replication) or minutes (async)', 'Depends on replication lag at failure time — typically seconds'],
            ['Cost', '2x compute, 2x DB, 2x everything — full capacity in both', '1x primary + reduced standby (pilot light or warm standby)'],
            ['Write consistency', 'Hard — conflict resolution, last-write-wins, or single write region', 'Easy — primary owns all writes, secondary is read-only or cold'],
            ['Operational complexity', 'High — drift detection, cross-region data sync, chaos testing', 'Moderate — runbook-driven failover, periodic DR drills'],
            ['When to use', 'Global user base, latency-sensitive, SaaS where 99.99% is table stakes', 'Regulated industries, finance, where consistency > availability'],
          ]}
        />
        <HighlightBox>RTO vs RPO precisely: <b>RTO</b> is how long it takes to recover service (downtime tolerance). <b>RPO</b> is how much data you can lose (measured in time — "up to 30 seconds of writes lost"). An active-active setup with sync replication has RTO of seconds and RPO of zero. A nightly-backup cold-DR setup has RTO of hours and RPO of 24 hours. The business decides these numbers, and engineering picks the architecture that meets them.</HighlightBox>
        <CodeBlock language="bash">
{`# Warm standby example — replicate primary to secondary continuously,
# but run scaled-down in secondary. Scale up only on failover.

# Primary (us-east-1): full production capacity
#   EKS cluster: 50 nodes, 500 pods
#   RDS: db.r6g.4xlarge primary + 2 replicas
#   ElastiCache: 6-node cluster

# Warm standby (eu-west-1): always running, scaled down
#   EKS cluster: 5 nodes, 50 pods (Karpenter scales on cutover)
#   RDS: read replica of primary (cross-region)
#   ElastiCache: 2-node cluster

# On failover:
# 1. Promote RDS read replica to standalone (aws rds promote-read-replica)
# 2. Scale up EKS node group (Karpenter handles burst within minutes)
# 3. Flip Route 53 health check / weighted record
# 4. Warm caches from DB (can take 5-10 minutes)
# 5. Accept increased tail latency until caches fill

# Cost trade-off:
# Warm standby: ~40% of primary cost, RTO ~5-10 minutes
# Pilot light:  ~15% of primary cost, RTO ~30 minutes (must scale from near-zero)
# Cold DR:      ~5% of primary cost,  RTO ~hours (restore from backups)
# Active-active: ~180% of single-region cost, RTO ~30 seconds`}
        </CodeBlock>
      </Accordion>

      <Accordion title="DNS-Based Routing — Route 53 Policies in Depth" icon={Route}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Route 53 offers several routing policies that implement multi-region differently. The policy determines how the resolver answers a DNS query based on client location, health, and weight.
        </p>
        <CompareTable
          headers={['Policy', 'How It Decides', 'Failover Mechanism', 'Use Case']}
          rows={[
            ['Simple', 'Returns all records, client picks one', 'None — no health check', 'Single-region or round-robin'],
            ['Weighted', 'Returns record based on weight percentages', 'Set unhealthy record weight to 0', 'Gradual traffic shifts, canary regions'],
            ['Latency-based', 'Returns record for region with lowest latency to client', 'Skips unhealthy regions via associated health check', 'Global active-active — serve nearest region'],
            ['Geolocation', 'Returns record based on client country/continent', 'Default fallback record for uncovered regions', 'Data residency requirements (EU users → EU region)'],
            ['Geoproximity', 'Distance from resource location, with bias adjustments', 'Via associated health check', 'Custom geo-routing with manual tuning'],
            ['Failover', 'Returns primary unless health check fails, then secondary', 'Automatic on health check failure (30-60s detection)', 'Active-passive disaster recovery'],
            ['Multi-value', 'Returns up to 8 healthy records', 'Unhealthy records excluded from response', 'Client-side load balancing with DNS-level health'],
          ]}
        />
        <CodeBlock language="bash">
{`# Route 53 latency-based routing with health checks for active-active failover:

# 1. Health check on us-east-1 ALB:
aws route53 create-health-check --caller-reference "us-east-1-$(date +%s)" \\
  --health-check-config '{
    "Type": "HTTPS",
    "FullyQualifiedDomainName": "us-east-1.api.example.com",
    "Port": 443,
    "ResourcePath": "/health",
    "RequestInterval": 10,
    "FailureThreshold": 2
  }'
# RequestInterval 10s + FailureThreshold 2 = ~20s detection time
# Fast interval (10s) costs $1/health check/month extra vs default 30s

# 2. Create two A records, same name, different regions, latency policy:
# api.example.com → latency us-east-1 → ALB IP, health check ID US
# api.example.com → latency eu-west-1 → ALB IP, health check ID EU

# 3. A query from a US user:
#    Route 53 evaluates: "which region has lowest latency to this resolver IP?"
#    → returns us-east-1 ALB IP (unless US health check is failing)
#    → If US is failing, returns eu-west-1 (next-lowest latency, healthy)

# 4. Client caches the response for TTL seconds.
# CRITICAL: low TTL enables faster failover but increases query cost.
# Typical production: TTL = 60s. Trade-off: up to 60s of failover delay
#   per-client vs 10x more DNS queries.

# Inspect Route 53 query log to see what resolver saw:
aws route53resolver get-query-log-config --resolver-query-log-config-id rqlc-xxx`}
        </CodeBlock>
        <HighlightBox type="warn">DNS caching is the enemy of fast failover. Even if Route 53 evicts an unhealthy record in 30 seconds, the client resolver (ISP, corporate DNS, pod CoreDNS) may cache the old IP for the full TTL. Java applications are especially bad — the JVM caches DNS results forever by default (networkaddress.cache.ttl=-1). Solution: set TTL low (30-60s), configure JVM DNS cache (networkaddress.cache.ttl=30), and understand that DNS failover has an inherent lower bound of the longest cache in the chain. This is why anycast is better for sub-second failover.</HighlightBox>
      </Accordion>

      <Accordion title="Anycast Routing — BGP Does the Work" icon={Globe2}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Anycast announces the same IP address from multiple physical locations via BGP. The internet&apos;s routing layer (BGP path selection) delivers each packet to the topologically nearest location. When a region fails and stops announcing the prefix, BGP withdraws the route and traffic redirects — no DNS change required.
        </p>
        <CompareTable
          headers={['Service', 'Mechanism', 'Failover Speed', 'Use Case']}
          rows={[
            ['Cloudflare', 'Anycast IPs announced from 300+ PoPs', '~seconds (BGP convergence)', 'CDN, WAF, DDoS protection, DNS'],
            ['AWS Global Accelerator', 'Two static anycast IPs, backed by regional ALBs/NLBs', '~30 seconds (health check driven)', 'Non-cacheable dynamic traffic with fast regional failover'],
            ['CloudFront', 'Anycast edge (400+ PoPs) for CDN + origin shield', 'Transparent — edge fails over to origin', 'HTTP/HTTPS content delivery with caching'],
            ['GCP Cloud Load Balancer', 'Global anycast IP with backend services', '~seconds (instant BGP)', 'Global applications on GCP'],
            ['Route 53 (non-anycast)', 'DNS responses from anycast nameservers, but records point to regional IPs', 'TTL-bound (30-60s + client cache)', 'Name resolution, not data plane'],
          ]}
        />
        <CodeBlock language="bash">
{`# AWS Global Accelerator example — active-active with 30-second failover:

# 1. Create accelerator with two static anycast IPs
aws globalaccelerator create-accelerator \\
  --name payments-api-global \\
  --ip-address-type IPV4 \\
  --enabled

# 2. Create listener on ports 443
aws globalaccelerator create-listener \\
  --accelerator-arn <arn> \\
  --port-ranges FromPort=443,ToPort=443 \\
  --protocol TCP

# 3. Create endpoint groups per region, add ALBs
aws globalaccelerator create-endpoint-group \\
  --listener-arn <arn> \\
  --endpoint-group-region us-east-1 \\
  --traffic-dial-percentage 50 \\
  --endpoint-configurations EndpointId=<alb-arn-us>,Weight=128

aws globalaccelerator create-endpoint-group \\
  --listener-arn <arn> \\
  --endpoint-group-region eu-west-1 \\
  --traffic-dial-percentage 50 \\
  --endpoint-configurations EndpointId=<alb-arn-eu>,Weight=128

# Result:
# - DNS returns the two static anycast IPs (never changes)
# - User in Paris connects to closest AWS edge location
# - Edge tunnels to eu-west-1 ALB (if healthy)
# - If eu-west-1 ALB fails health check: GA withdraws it from endpoint group
#   → edge routes to us-east-1 instead — transparent to the client
# - No DNS TTL to wait out — BGP + GA internal routing handles it

# Downside: ~$0.025/hour per accelerator + $0.01/GB data processed
# Worth it when: global users + low failover tolerance + non-cacheable traffic`}
        </CodeBlock>
      </Accordion>

      <Accordion title="Cross-Region Database Replication" icon={Database}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The data layer is where multi-region gets hard. Compute is stateless — just run it in both regions. Data needs replication, and every replication technology has a consistency and lag trade-off.
        </p>
        <CompareTable
          headers={['Technology', 'Replication Model', 'Typical Lag', 'Failover Behavior']}
          rows={[
            ['RDS cross-region read replica', 'Async single-leader, MySQL/Postgres binlog-based', '50-500ms under normal load; seconds-to-minutes under write load', 'Manual promotion via promote-read-replica; RTO ~5 min; data loss = lag at failure'],
            ['Aurora Global Database', 'Storage-layer replication, physical not logical', 'Typically &lt;1 second cross-region', 'Failover ~1 minute (managed); RPO typically &lt;1s'],
            ['DynamoDB Global Tables', 'Multi-leader, last-writer-wins via timestamps', 'Typically &lt;1 second', 'No failover needed — all regions are writable; use conflict resolution'],
            ['Spanner (GCP)', 'Synchronous Paxos, globally strong consistency', 'Higher write latency (~50-150ms) but strong consistency', 'No manual failover; zone/region loss handled transparently'],
            ['Cassandra multi-DC', 'Tunable consistency (LOCAL_QUORUM, EACH_QUORUM, ALL)', 'Depends on consistency level and network', 'Survive DC loss if replication factor ≥ 3 with LOCAL_QUORUM reads'],
            ['CockroachDB', 'Range-based Raft replication, can pin replicas to regions', 'Write latency = furthest replica in quorum', 'Automatic — loses no data as long as majority survives'],
          ]}
        />
        <CodeBlock language="bash">
{`# RDS cross-region read replica lag monitoring — critical for RPO guarantees:

# Read replica lag metric — CloudWatch:
# RDS/ReplicaLag in seconds — the delay behind the primary
# Alert when ReplicaLag > 30 seconds for 5 minutes

# Query the replica directly for source position:
# PostgreSQL:
SELECT NOW() - pg_last_xact_replay_timestamp() AS replica_lag;
# Returns: 00:00:02.345 = 2.3 seconds behind primary

# MySQL:
SHOW SLAVE STATUS\\G
# Seconds_Behind_Master: 5

# Aurora Global DB — more precise metric:
# RDS/AuroraGlobalDBReplicationLag in milliseconds
# Under normal conditions this is consistently <1000ms (1 second)

# Promote a cross-region replica to standalone (DR scenario):
aws rds promote-read-replica --db-instance-identifier payments-db-eu-replica
# WARNING: this is one-way. Old primary cannot automatically rejoin.
# Post-failover: re-establish replication in reverse or rebuild from snapshot.

# Aurora Global DB managed failover (preferred — bidirectional recovery):
aws rds failover-global-cluster \\
  --global-cluster-identifier payments-global \\
  --target-db-cluster-identifier <eu-west-1-cluster-arn>
# RTO: ~1 minute. RPO: <1 second typical.`}
        </CodeBlock>
        <HighlightBox type="warn">DynamoDB Global Tables use last-writer-wins conflict resolution. If the same item is updated in us-east-1 at t=0 and eu-west-1 at t=100ms, and the replication takes 500ms, both regions eventually converge to the eu-west-1 value (newer timestamp wins). This means <b>you can silently lose writes</b> if two users update the same record concurrently across regions. Design your data model around this: idempotent updates, conditional writes with version attributes, or keep mutable state in a single-writer region and replicate read-only to others. Shopping cart? Safe (each user writes their own cart). Inventory count? Dangerous (two warehouses decrementing concurrently) — needs a different pattern.</HighlightBox>
      </Accordion>

      <Accordion title="CAP Theorem In Practice — What Consistency Actually Means" icon={Activity}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          CAP theorem says: during a network partition, you must choose between Consistency (every read sees the latest write) and Availability (every request gets a response). Most distributed systems are AP by default — they stay available and accept stale reads — but the nuances matter.
        </p>
        <CompareTable
          headers={['Consistency Level', 'Guarantee', 'Cost', 'Example System']}
          rows={[
            ['Linearizable (strong)', 'Every read returns the result of the most recent write, system-wide', 'High write latency — coordination across all replicas', 'Spanner, etcd, ZooKeeper'],
            ['Sequential', 'All nodes see operations in the same order, but not necessarily "latest"', 'Moderate — agreement on order, not timing', 'Most RDBMS with sync replication'],
            ['Causal', 'Reads preserve cause-and-effect relationships', 'Moderate — track dependencies per write', 'Azure Cosmos DB (causal tier), research systems'],
            ['Read-your-writes', 'A client sees their own writes immediately; others may not', 'Low — route reads to writer or track session', 'Session-pinned replicas, sticky load balancing'],
            ['Eventual', 'Given enough time with no writes, all replicas converge', 'Lowest — async replication', 'DynamoDB Global Tables, Cassandra, S3 (historically)'],
          ]}
        />
        <CodeBlock language="bash">
{`# Read-your-writes in practice — common pitfall with async replicas:

# User submits profile update:
# POST /profile    → hits us-east-1 primary, write succeeds at t=0
# Response returns to client at t=50ms (DB write acked, replication starts)
# Client redirects to GET /profile → round-robin to eu-west-1 replica
#   → replica has not received the update yet (lag = 200ms)
#   → user sees their OLD profile and files a bug

# Three fixes:

# 1. Route reads-after-writes to the primary region for a window:
#    Set a session cookie "recent_write=1, expires=30s"
#    Application reads go to primary if cookie present
#    Simple but ties the user to the primary region temporarily

# 2. Use session consistency token (Cosmos DB, DynamoDB):
#    Write returns a consistency token (LSN or version)
#    Subsequent reads include token; DB blocks until replica has caught up
#    Examples: DynamoDB ConsistentRead=true (strongly consistent read, 2x cost)
#              Cosmos DB x-ms-session-token header

# 3. Read from primary always, use replicas only for analytics:
#    Simple but doesn't leverage read scaling
#    Common in fintech where correctness trumps latency

# Measure your read-after-write success rate in staging:
# Synthetic check: write record, immediately read 10 times with 5ms spacing
#   across all replicas. Count reads that return stale data.
#   Target: <0.01% stale reads for user-facing paths.`}
        </CodeBlock>
      </Accordion>

      <Accordion title="Failover Strategies — Automated vs Manual" icon={AlertTriangle}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The decision of when and how to fail over between regions is the highest-stakes operation in multi-region ops. Too eager and a transient blip triggers an unnecessary cutover; too conservative and a real outage goes minutes longer than needed.
        </p>
        <CompareTable
          headers={['Approach', 'Trigger', 'Blast Radius', 'When to Use']}
          rows={[
            ['Fully automated', 'Health check failure triggers Route 53 / GA flip', 'Whole region; recovers in &lt;1 min', 'Active-active with safe read/write patterns'],
            ['Human-approved (runbook)', 'Pager + on-call decision after triage', 'Whole region; 5-15 min RTO', 'Active-passive, DB promotion required'],
            ['Partial / bulkheaded', 'Fail specific service or tenant, not whole region', 'Limited', 'Large SaaS, multi-tenant'],
            ['Cell-based architecture', 'Each cell (shard) fails independently', 'One cell only', 'Amazon-style services, extreme scale'],
          ]}
        />
        <CodeBlock language="yaml">
{`# GitHub Actions runbook for manual cross-region failover:
name: Cross-Region Failover
on: workflow_dispatch
inputs:
  target_region:
    type: choice
    options: [us-east-1, eu-west-1]
  reason:
    type: string
    required: true

jobs:
  failover:
    runs-on: ubuntu-latest
    environment: production   # requires manual approval
    steps:
      - name: Verify source region is actually unhealthy
        run: |
          # Don't fail over based on one bad health check
          for i in 1 2 3; do
            curl -f https://old-region.api.example.com/health && exit 1
            sleep 10
          done
          echo "Confirmed unhealthy across 3 checks"

      - name: Promote RDS replica
        run: |
          aws rds promote-read-replica \\
            --db-instance-identifier payments-db-\${{ inputs.target_region }}
          # Wait for promotion to complete (~3-5 minutes)
          aws rds wait db-instance-available \\
            --db-instance-identifier payments-db-\${{ inputs.target_region }}

      - name: Scale up target region EKS
        run: |
          aws eks update-nodegroup-config \\
            --cluster-name prod-\${{ inputs.target_region }} \\
            --nodegroup-name default \\
            --scaling-config minSize=30,maxSize=100,desiredSize=30

      - name: Flip Route 53 health check
        run: |
          # Force the weighted record for old region to weight=0
          aws route53 change-resource-record-sets \\
            --hosted-zone-id Z123 \\
            --change-batch file://failover-change.json

      - name: Post-failover validation
        run: |
          sleep 60   # DNS propagation
          for i in {1..10}; do
            curl -f https://api.example.com/health
            sleep 2
          done`}
        </CodeBlock>
        <HighlightBox type="warn">Automated failover without safeguards causes more outages than it prevents. The classic failure mode: health check flaps because of a transient network issue, automation fails traffic to the secondary region, the secondary (warm but not fully scaled) gets overwhelmed, both regions are now unhealthy. Mitigations: (1) require N consecutive failures before triggering, (2) rate-limit failovers (only one per 10 minutes), (3) always have manual override, (4) include a "pause automation" switch that on-call can hit before investigating. The AWS "TGW flap" incident and the Cloudflare 2022-07-21 outage both had automation-amplification elements.</HighlightBox>
      </Accordion>

      <Accordion title="Interview Scenario — EU User Hits Your API" icon={Globe2}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Walk through a real interview question end to end: &quot;You have two RDS instances in us-east-1 and eu-west-1 (EU is a cross-region read replica). A user in Europe hits your API. Walk me through how traffic routes and what happens if the EU DB falls behind.&quot;
        </p>
        <CodeBlock language="bash">
{`# The request path — answer this step by step:

# 1. DNS resolution for api.example.com
#    - User's resolver (likely ISP or Cloudflare 1.1.1.1) queries Route 53
#    - Route 53 is configured with latency-based routing on api.example.com
#    - Resolver's IP is in Europe → Route 53 returns eu-west-1 ALB IP
#    - TTL 60s → cached for 60s in resolver

# 2. TCP + TLS to eu-west-1 ALB
#    - ~20ms RTT from Paris to eu-west-1 (Dublin)
#    - TLS 1.3: 1 RTT handshake
#    - ALB forwards to a healthy pod in eu-west-1 EKS cluster

# 3. Application logic — critical question: is this read or write?

#    READ (GET /orders):
#    App connects to local eu-west-1 read replica (same-region, ~2ms latency)
#    Replica serves the query → response to user
#    Total round-trip: ~40ms (fast — everything local)

#    WRITE (POST /orders):
#    EU replica is READ-ONLY — writes must go to us-east-1 primary
#    Option A: App has two DB configs (local for reads, cross-region for writes)
#      → write RTT adds ~80ms EU→US network
#      → primary commits, acks back to EU → total write ~200ms user-facing
#    Option B: App writes locally, ignores that replica is read-only
#      → write fails with "cannot execute INSERT on a read-only transaction"
#      → app must catch error and retry against primary

# 4. Read-your-writes problem
#    User POSTs new order at t=0 (committed at us-east-1 primary)
#    App redirects to GET /orders/:id at t=50ms
#    Request routed to eu-west-1 (latency-based, fast)
#    eu-west-1 replica has not yet received the new row (lag = 100-500ms)
#    → User sees "Order not found" and panics

# 5. Now the scenario: EU DB falls behind
#    ReplicaLag metric starts climbing: 10s → 60s → 300s
#    Causes: network saturation, heavy write load on primary, replica CPU pegged

#    What do you do?
#    - STALENESS IMPACT: reads in EU are serving data up to 5 minutes old
#      Is that acceptable for your business? (Banking: no. Social feed: maybe.)
#    - TRAFFIC OPTIONS:
#      (a) Route EU reads to us-east-1 primary temporarily (slow but fresh)
#          Update app config flag → deploy → EU reads cross-region (~80ms extra)
#      (b) Shed load — return 503 to EU users instead of stale data
#      (c) Accept staleness and alert product/support
#    - ROOT CAUSE: investigate why replica is behind
#      Check: replica instance class (too small?), primary write volume (spike?),
#      network throughput (cross-region link saturated?), any DDL on primary?
#    - AUTOMATED RESPONSE: CloudWatch alarm on ReplicaLag > 60s
#      → fires a Lambda that flips a feature flag "eu_reads_to_primary"
#      → application layer reads this flag on each request
#      → reads transparently re-route until alarm clears`}
        </CodeBlock>
        <HighlightBox>The interviewer is testing whether you distinguish reads from writes, understand that async replication has lag that shows up in user-visible ways, and have a plan for degradation (not just &quot;it works normally&quot;). Strong answers include specific numbers (RTT, lag SLOs, TTL), explicit trade-offs (stale reads vs higher latency), and a runbook for the abnormal case. Weak answers describe the happy path and hand-wave when the replica falls behind.</HighlightBox>
      </Accordion>
    </div>
  );
}
