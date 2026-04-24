import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import HighlightBox from '../components/HighlightBox';
import CompareTable from '../components/CompareTable';
import CodeBlock from '../components/CodeBlock';
import { Database, GitBranch, Layers, Network, Scale, AlertTriangle } from 'lucide-react';

export default function DatabaseScaling() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">Postgres &middot; MySQL &middot; Sharding</div>
        <h1>Database Scaling Patterns</h1>
        <p>Read replicas and replication lag, sharding strategies and their failure modes, CQRS, connection pooling (because databases can&apos;t handle 10k TCP connections), and what actually happens during a network partition when your app is talking to two copies of the truth.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'The Database Is The Hardest Layer To Scale',
          body: 'Compute is easy: spin up more pods. Stateless APIs are easy: put them behind a load balancer. Databases hold state, and state does not clone cheaply. Every scaling technique — replicas, sharding, caching, CQRS — is a different way of admitting that a single database instance has a hard ceiling, and making peace with consistency trade-offs in exchange for scale.'
        },
        {
          title: 'Consistency Is A Spectrum, Not A Switch',
          body: 'Strong consistency (read sees latest write) is the default mental model, but the moment you add a replica, you enter eventual-consistency territory. The question is not &quot;consistent or not&quot; — it is &quot;how stale can a read be before it becomes a product bug?&quot; Five seconds is fine for a social feed. Five milliseconds is unacceptable for a trading platform. Know your tolerance.'
        }
      ]} />

      <Accordion title="Read Replicas — Lag, Slots, and Promotion" icon={Database} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The simplest scaling pattern: add read replicas that asynchronously replicate from the primary. All writes go to the primary; reads can be offloaded to replicas. The trap is replication lag — replicas are always behind the primary by some amount, and apps need to handle it.
        </p>
        <CodeBlock language="bash">
{`# Postgres streaming replication basics:

# On primary — check replication connections:
SELECT client_addr, state, sent_lsn, write_lsn, flush_lsn, replay_lsn,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes
FROM pg_stat_replication;
#  client_addr  | state     | lag_bytes
# --------------|-----------|----------
#  10.0.2.50    | streaming | 15234      <- ~15KB behind (negligible)
#  10.0.3.10    | streaming | 9123456789 <- 9GB behind (replica is struggling)

# On replica — measure lag from the replica's perspective:
SELECT NOW() - pg_last_xact_replay_timestamp() AS replica_lag;
#  replica_lag
# -------------
#  00:00:01.23   <- 1.2 seconds behind

# The WAL (write-ahead log) streams from primary to replica. If the replica
# falls too far behind, the primary may recycle WAL segments the replica
# still needs → replica can't catch up, must be rebuilt from base backup.

# Solution: replication slots (Postgres) or binlog retention (MySQL).
# A slot tells the primary "hold WAL until this replica has consumed it."

# Create a slot on the primary:
SELECT pg_create_physical_replication_slot('replica_01');

# Configure replica to use it (recovery.conf or primary_conninfo):
# primary_slot_name = 'replica_01'

# DANGER: if a replica using a slot dies and is never reconnected,
# the primary will fill up disk holding WAL forever. Set up alerting:
SELECT slot_name, active,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained_wal
FROM pg_replication_slots;
# Alert if retained_wal > 50GB or active = false for > 15 minutes

# Promoting a replica to primary (disaster recovery):
# RDS:
aws rds promote-read-replica --db-instance-identifier payments-db-replica-2
# Aurora (global DB managed):
aws rds failover-global-cluster --global-cluster-identifier payments-global \\
  --target-db-cluster-identifier <secondary-cluster-arn>

# Self-managed Postgres:
# On replica: pg_ctl promote -D /var/lib/postgresql/data
# Then: update app config → point writes to new primary → re-establish other replicas`}
        </CodeBlock>
        <CompareTable
          headers={['Replication Mode', 'Commit Semantics', 'Lag Behavior', 'Use When']}
          rows={[
            ['Async (default)', 'Primary acks after local WAL write; does not wait for replica', 'Lag exists; data loss possible on primary failure', 'Default — most workloads tolerate it'],
            ['Sync (synchronous_commit=on + synchronous_standby_names)', 'Primary waits for at least one replica to acknowledge WAL', 'Zero lag for sync replica; write latency = max(primary, replica)', 'Financial systems where RPO=0 is required'],
            ['Quorum sync', 'Wait for N of M replicas to ack', 'Small lag; tolerates single replica slowness', 'High durability + availability'],
            ['Logical replication', 'Row-level replication, not WAL; can replicate across versions', 'Per-subscription lag; selective replication', 'Cross-version upgrades, multi-tenant data isolation'],
          ]}
        />
        <HighlightBox type="warn">Promoting a replica is a one-way operation. After promotion, the old primary cannot automatically rejoin the cluster — the WAL has diverged. You must either rebuild the old primary as a fresh replica of the new primary, or use tools like pg_rewind which can re-align a demoted primary if the diverged WAL is still present. For managed RDS: promotion detaches the replica permanently; the old primary must be deleted or repurposed. Plan your failover runbook accordingly.</HighlightBox>
      </Accordion>

      <Accordion title="Sharding — Partitioning Data Across Instances" icon={GitBranch}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          When a single primary cannot handle write volume even with the biggest instance, you shard — split data across multiple independent databases. Each shard is a full, independent database holding a subset of rows. The strategy for deciding which row goes to which shard determines how well it scales and where it breaks.
        </p>
        <CompareTable
          headers={['Strategy', 'How Keys Map to Shards', 'Pros', 'Cons / When It Breaks']}
          rows={[
            ['Range', 'Shard 1 = user_id 1-1M, Shard 2 = 1M-2M, etc.', 'Range queries are efficient (all in one shard); easy to reason about', 'Hot shards if recent IDs are most active (newest shard gets all writes); resharding is painful'],
            ['Hash', 'shard = hash(user_id) mod N', 'Even distribution; no hotspots by key', 'Range queries scatter; changing N requires rehashing everything'],
            ['Consistent hash', 'hash(key) placed on a ring; nearest node owns it', 'Adding/removing nodes moves only 1/N of keys', 'More complex; requires a smart client or proxy (Vitess, Citus)'],
            ['Directory (lookup table)', 'A separate metadata service maps key → shard', 'Flexible — can move specific keys to specific shards for tenant isolation', 'Lookup service is now a single point of failure; extra hop per query'],
            ['Geo-sharding', 'shard = user region (EU users on EU shard)', 'Data residency compliance; low cross-region latency', 'Users moving between regions need data migration'],
          ]}
        />
        <CodeBlock language="sql">
{`-- Example: hash sharding with a user_id key
-- Shard count = 4. Client picks shard = user_id % 4

-- Application code (pseudocode):
-- shard_idx = user_id % 4
-- db_conn = connections[shard_idx]
-- result = db_conn.query("SELECT * FROM orders WHERE user_id = ?", user_id)

-- Cross-shard queries require scatter-gather (fan out to all shards, merge):
-- SELECT COUNT(*) FROM orders WHERE created_at > NOW() - INTERVAL '1 hour'
-- → run on all 4 shards in parallel, sum results
-- This is slow and doesn't scale well. Avoid scatter-gather in hot paths.

-- Rebalancing when adding a shard (4 → 8 shards):
-- Every row's new shard = user_id % 8 which usually differs from user_id % 4
-- → roughly 50% of all rows must move across physical instances
-- → write path must be frozen or dual-write during migration
-- → this is why hash sharding is painful to grow

-- Vitess handles this with vreplication — continuous row-level migration
-- between shards while traffic continues. Expensive infrastructure, but
-- it's the only way to do zero-downtime reshard at scale.

-- PostgreSQL native option: declarative partitioning (not true sharding,
-- all partitions on same instance):
CREATE TABLE orders (
  id BIGINT,
  user_id BIGINT,
  created_at TIMESTAMPTZ,
  amount NUMERIC
) PARTITION BY HASH (user_id);

CREATE TABLE orders_0 PARTITION OF orders FOR VALUES WITH (modulus 4, remainder 0);
CREATE TABLE orders_1 PARTITION OF orders FOR VALUES WITH (modulus 4, remainder 1);
-- ... etc.
-- Postgres plans queries across partitions automatically.
-- For multi-instance sharding, use Citus (Postgres extension that turns
-- declarative partitioning into cross-instance distribution).`}
        </CodeBlock>
        <HighlightBox type="warn">Sharding is the nuclear option. Before sharding, exhaust: (1) vertical scaling — biggest available instance class, (2) read replicas for read-heavy workloads, (3) caching with Redis/Memcached for hot data, (4) application-level optimization (N+1 queries, missing indexes), (5) archival / tiering of old data. Sharding introduces operational complexity that most teams underestimate: distributed transactions, cross-shard joins, schema migrations on N shards, backup coordination. If you can buy 2-3 more years with a db.r6g.16xlarge, do that instead.</HighlightBox>
      </Accordion>

      <Accordion title="CQRS — Command Query Responsibility Segregation" icon={Layers}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          CQRS splits the write path (command) and read path (query) into separate data models, often backed by separate storage. Writes go to a normalized transactional store; a projection process updates a denormalized read store optimized for queries. Worth the complexity only in specific scenarios.
        </p>
        <CodeBlock language="bash">
{`# A typical CQRS architecture:

# Write path:
# Client → API → Postgres (source of truth, normalized schema)
# → Postgres logical replication or CDC (Debezium) emits change events
# → Event stream (Kafka)
# → Projection service consumes events
# → Materialized read store (Elasticsearch for search, Redis for counters,
#   or a separate denormalized Postgres table for complex read shapes)

# Read path:
# Client → API → Elasticsearch / Redis / denormalized table
# No joins, no complex SQL — just pre-computed views

# Example: an e-commerce product listing.
# Write model (normalized, 3NF):
#   products(id, name, price, stock)
#   categories(id, name)
#   product_categories(product_id, category_id)
#   reviews(id, product_id, rating, body)

# Read model (denormalized projection):
#   product_search_doc(
#     id, name, price, stock, categories: [name1, name2],
#     avg_rating, review_count,
#     search_text: "name name description..."
#   )

# When a write happens (new review posted):
# 1. Insert into reviews table (write model)
# 2. CDC captures the change
# 3. Projection service: fetch product, recalculate avg_rating, update read doc
# 4. Elasticsearch now has updated avg_rating

# Key insight: reads are eventually consistent with writes.
# Typical projection lag: 100-500ms. Fine for product listings, bad for
# anything the user just submitted and expects to see immediately.`}
        </CodeBlock>
        <CompareTable
          headers={['Scenario', 'CQRS Worth It?', 'Why']}
          rows={[
            ['CRUD app with &lt;100 req/s', 'No', 'Premature complexity; normal Postgres handles it'],
            ['Read-heavy (100:1 read:write)', 'Maybe', 'Read replicas often solve it more cheaply'],
            ['Complex aggregations on read', 'Yes', 'Precomputed views avoid expensive query-time joins'],
            ['Multiple read shapes (search, analytics, API)', 'Yes', 'Each shape gets a purpose-built projection'],
            ['Strict read-your-writes required', 'No', 'Async projection breaks the contract'],
            ['Event-sourced system already', 'Yes', 'You already have the stream; projections are natural'],
          ]}
        />
        <HighlightBox>Simpler alternative to full CQRS: Postgres materialized views with scheduled refresh. If you need the complex read model but not the full separation, CREATE MATERIALIZED VIEW + REFRESH MATERIALIZED VIEW CONCURRENTLY gives you 80% of the benefit with 10% of the operational surface. You lose real-time freshness but gain massive query performance. Good middle ground before committing to Kafka + projection services.</HighlightBox>
      </Accordion>

      <Accordion title="Connection Pooling — Why Databases Can't Handle 10k Connections" icon={Network}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Postgres allocates ~10MB of RAM per connection for the per-backend process. MySQL is lighter but still has overhead. At 10,000 connections you are talking 100GB of memory before any query runs. This is why every production deployment needs a connection pooler.
        </p>
        <CodeBlock language="bash">
{`# Without pooling — the math breaks:
# 200 pods x 50 connections per pod = 10,000 connections to DB
# Postgres: 10,000 x 10MB = 100GB RAM just for connections
# Result: DB runs out of memory, OOM-killed by kernel, everything dies

# With PgBouncer (transaction-level pooling):
# 200 pods x 50 connections → PgBouncer (10,000 client connections)
# PgBouncer → Postgres (50 server connections)
# Postgres: 50 x 10MB = 500MB — trivial

# How PgBouncer transaction pooling works:
# 1. Client (app) opens connection to PgBouncer (cheap, no backend process)
# 2. Client sends BEGIN; INSERT ...; COMMIT;
# 3. PgBouncer grabs a free server connection, forwards transaction
# 4. On COMMIT, PgBouncer releases server connection back to pool
# 5. Same server connection serves a different client's next transaction

# Deployment pattern for PgBouncer in K8s:
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pgbouncer
spec:
  replicas: 3   # HA — 3 instances behind a Service
  template:
    spec:
      containers:
      - name: pgbouncer
        image: bitnami/pgbouncer:1.22
        env:
        - name: PGBOUNCER_POOL_MODE
          value: transaction
        - name: PGBOUNCER_MAX_CLIENT_CONN
          value: "2000"
        - name: PGBOUNCER_DEFAULT_POOL_SIZE
          value: "25"   # 25 server conns per db+user pair
        - name: PGBOUNCER_SERVER_RESET_QUERY
          value: "DISCARD ALL"

# Managed alternatives: RDS Proxy
# - IAM-authenticated, TLS to backend, failover-aware
# - Handles connection multiplexing like PgBouncer
# - Cost: $0.015/vCPU-hr of the underlying DB instance
# - Gotcha: adds ~2-3ms latency per query; not always a win for low-volume workloads

# Validate pool is healthy:
# PgBouncer admin console:
psql -h pgbouncer -p 6432 -U admin pgbouncer
pgbouncer=# SHOW POOLS;
#  database      | user      | cl_active | cl_waiting | sv_active | sv_idle | maxwait
# ---------------|-----------|-----------|------------|-----------|---------|--------
#  payments_db   | app_user  |     450   |    12      |    25     |    0    |  0.04s
# cl_waiting > 0 sustained = pool is too small, clients are queued
# maxwait > 1s = pool is starved, requests are stacking`}
        </CodeBlock>
        <CompareTable
          headers={['Pool Mode', 'Behavior', 'Gotchas']}
          rows={[
            ['Session (default)', 'Client owns server connection until disconnect', 'Same as no pooling for most apps; rarely useful'],
            ['Transaction', 'Server connection released between transactions', 'Cannot use prepared statements (session state lost); most popular mode'],
            ['Statement', 'Server connection released between statements', 'Breaks multi-statement transactions; almost never used'],
          ]}
        />
        <HighlightBox type="warn">Transaction pooling has a critical gotcha: any session-level state is lost between transactions. This includes prepared statements, SET commands, temporary tables, and LISTEN/NOTIFY. Many ORMs (Rails, Django) try to use prepared statements by default — this silently breaks. Fix: disable prepared statements in the driver (statement_cache_size=0 for Django, prepared_statements=false for Rails), or use a pooler that properly translates prepared statements (Pgcat, Supabase's pooler).</HighlightBox>
      </Accordion>

      <Accordion title="Geo-Routing Writes and Reads" icon={Scale}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          At global scale, you want writes to go to the user&apos;s local primary and reads served locally. This requires either multi-master replication (conflict-prone) or partitioning users by geography.
        </p>
        <CodeBlock language="bash">
{`# Pattern: geo-partitioned single writer per region.
# Each user is pinned to a "home region" that owns their writes.

# User location mapping (in a central config or DNS-like service):
# user 12345 (EU) → home region = eu-west-1
# user 67890 (US) → home region = us-east-1

# Request flow:
# 1. User 12345 in Paris hits api.example.com
# 2. Anycast routes to nearest region = eu-west-1 (good for latency)
# 3. App checks user's home region → happens to be eu-west-1 → local writes
# 4. App reads local replica, writes local primary

# User 12345 traveling to NYC:
# 1. Anycast routes to us-east-1
# 2. App checks user's home region → eu-west-1 (not local)
# 3. Two options:
#    (a) Proxy write back to eu-west-1 (add ~80ms latency)
#    (b) Temporarily redirect user to api-eu.example.com (ugly UX)
# 4. Reads: use local us-east-1 replica of EU data (if cross-region replication exists),
#    accepting eventual consistency

# CockroachDB / Spanner handle this natively with row-level regional pinning:
ALTER TABLE orders SET LOCALITY REGIONAL BY ROW;
ALTER TABLE orders ADD COLUMN region crdb_internal_region NOT NULL DEFAULT gateway_region();
-- Each row physically lives in the region specified by its "region" column.
-- Queries for rows in the local region are fast; cross-region queries pay latency.

# Aurora Global DB doesn't offer per-row locality — only secondary region
# read replicas with managed failover. For true geo-sharding you either
# use a globally distributed DB or architect it at the application layer.`}
        </CodeBlock>
        <HighlightBox>The GDPR / data residency angle is the real forcing function for most geo-partitioning. EU user data must stay in the EU; the architecture to enforce that is usually a hard partition by user region, not a global DB. Aurora / DynamoDB regional tables make this easier than rolling your own, but you still have to design the application to route users to the correct region.</HighlightBox>
      </Accordion>

      <Accordion title="Consistency Trade-offs During a Partition" icon={AlertTriangle}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          What actually happens when the network between primary and replica breaks? The answer depends on the system, and &quot;the system&quot; is probably lying to you about its guarantees.
        </p>
        <CompareTable
          headers={['System', 'Behavior During Partition', 'Consistency After']}
          rows={[
            ['Postgres async replication', 'Primary keeps accepting writes; replica stops receiving them', 'Replica falls behind; on reconnect catches up from WAL'],
            ['Postgres sync replication (strict)', 'Primary stalls writes — waits for replica ack', 'No lag, but writes block until network heals or timeout'],
            ['MySQL semi-sync', 'Primary waits for ack with timeout; falls back to async after', 'Small window of data loss possible during fallback'],
            ['MongoDB replica set', 'Majority partition continues; minority becomes read-only', 'Minority primary steps down; rollback of its uncommitted writes on rejoin'],
            ['DynamoDB Global Tables', 'Both regions accept writes independently', 'Conflict resolution (last-writer-wins); concurrent writes silently lost'],
            ['Cassandra QUORUM', 'Reads/writes succeed if quorum reachable; fail if not', 'Hinted handoff replays missed writes after partition heals'],
            ['etcd / ZooKeeper (Raft)', 'Majority partition remains leader; minority unavailable', 'Perfect consistency — minority sees nothing until rejoin'],
          ]}
        />
        <CodeBlock language="bash">
{`# Simulating a partition in test to validate behavior:

# Use iptables in a kind/minikube cluster to block traffic between pods:
kubectl exec -it payments-db-primary-0 -- iptables -A OUTPUT \\
  -d <replica-ip> -j DROP

# Observations to record:
# 1. What does the primary do? (Accept writes? Stall? Error?)
# 2. What does the replica do? (Read-only? Keep serving stale reads?)
# 3. What do applications see? (Timeouts? Partial failures? Silent staleness?)
# 4. On healing (remove iptables rule), how long until consistent again?
#    - Replay lag: primary → replica catches up
#    - Application cache TTL may still serve stale data

# Chaos engineering frameworks automate this:
# - LitmusChaos: pod-network-loss, network-partition experiments
# - Chaos Mesh: PartitionAction CRD
# - Gremlin: black-hole attack on network

# Run a partition experiment monthly in staging.
# Interview answer that impresses: "I don't trust the docs — I test the
# partition behavior of every stateful system we run, record the actual
# observed behavior, and document it in our runbooks."`}
        </CodeBlock>
        <HighlightBox type="warn">The AWS Aurora docs say &quot;RPO less than 1 second&quot; for Aurora Global Database. This is true on average under good network conditions. During an actual cross-region network partition, the RPO can spike to minutes as WAL accumulates on the primary. If your business genuinely requires RPO=0, you need synchronous replication, which caps write latency at the round-trip time to the replica — and cross-region sync is almost never acceptable for write latency. The honest answer: you cannot have strict RPO=0 across regions without unacceptable write latency. Pick your poison.</HighlightBox>
      </Accordion>
    </div>
  );
}
