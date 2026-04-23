import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import HighlightBox from '../components/HighlightBox';
import CompareTable from '../components/CompareTable';
import CodeBlock from '../components/CodeBlock';
import { AlertTriangle, Search, FileText, Activity, RefreshCw, Terminal } from 'lucide-react';

export default function Incident() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">Reliability & Operations</div>
        <h1>Incident Response</h1>
        <p>Incident detection, triage methodology, the full debugging sequence for common failure modes, postmortem structure, and how to design systems that make the next incident shorter.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Mitigate First, Investigate Later',
          body: 'The job during an incident is to restore service, not to find root cause. Root cause analysis happens in the postmortem, after users are unblocked. The fastest path to recovery is usually rollback — you already know the previous version worked. Every minute spent debugging during an active incident is a minute users are experiencing the failure. Document what you observe as you go so postmortem reconstruction is accurate.'
        },
        {
          title: 'MTTD vs MTTR vs MTTF',
          body: 'Mean Time To Detect (MTTD): how long between failure occurring and alert firing. Improved by better alerting and lower thresholds. Mean Time To Recover (MTTR): how long from alert to service restored. Improved by runbooks, faster rollback, and practiced incident response. Mean Time To Failure (MTTF): how long the system runs before the next failure. Improved by reducing deployment risk, better testing, and addressing postmortem action items. Most teams focus on MTTR first because it directly reduces user impact duration.'
        }
      ]} />

      <Accordion title="Incident Severity Levels and Response Protocol" icon={AlertTriangle} defaultOpen={true}>
        <CompareTable
          headers={['Severity', 'Criteria', 'Response Time', 'Who Gets Paged', 'Communication']}
          rows={[
            ['SEV1 — Critical', 'Full service down, data loss, security breach, >50% error rate', '<5 minutes acknowledge, <15 min first update', 'On-call + team lead + management', 'Dedicated incident channel, status page updated every 15 min'],
            ['SEV2 — Major', 'Significant degradation, one feature broken, 10-50% error rate or 3x latency', '<15 minutes', 'On-call + team lead if not resolving in 30 min', 'Incident channel, status page if customer-visible'],
            ['SEV3 — Minor', 'Partial degradation, workaround exists, single user affected', '<2 hours', 'On-call only', 'Team Slack thread, no status page update'],
            ['SEV4 — Low', 'Non-production issue, cosmetic, no user impact', 'Business hours', 'Ticket only', 'Jira/Linear ticket'],
          ]}
        />
        <HighlightBox type="tip">Incident commander pattern: for SEV1/SEV2, designate one person as incident commander whose job is coordination, not debugging. They: write in the incident channel, update the status page, bring in additional responders, run the timeline. The technical responders focus entirely on investigation. Without this separation, incident channels become chaotic and status page updates get forgotten while everyone is deep in logs.</HighlightBox>
        <CodeBlock language="bash">
{`# First 60 seconds of an incident — the scope question
# Is this affecting one pod, one deployment, one namespace, or the whole cluster?

# Cluster-wide health — quick overview
kubectl get nodes
kubectl get pods -A | grep -v Running | grep -v Completed

# If specific service is paged:
kubectl get pods -n payments-prod -l app=payments-api
kubectl describe deployment payments-api -n payments-prod | grep -A5 "Conditions:"

# Recent events across namespace (last 5 minutes)
kubectl get events -n payments-prod --sort-by='.lastTimestamp' | tail -20

# Service endpoint health — is there at least one healthy backend?
kubectl get endpoints payments-api -n payments-prod
# Empty Addresses with Addresses: <none> = all pods failing readiness probe`}
        </CodeBlock>
      </Accordion>

      <Accordion title="Full Debugging Sequence — CrashLoopBackOff" icon={Search}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          CrashLoopBackOff means a container is crashing and Kubernetes is applying exponential backoff before restarting it again. The backoff maxes out at 5 minutes. The debugging sequence below works for any crash scenario.
        </p>
        <CodeBlock language="bash">
{`# Step 1: Which pods are failing and since when?
kubectl get pods -n payments-prod -l app=payments-api -o wide
# Look for: RESTARTS count, STATUS (CrashLoopBackOff), NODE placement

# Step 2: Exit code tells you the failure category
kubectl describe pod payments-api-7d8f9b-xxxx -n payments-prod
# Events section at bottom — most recent events first
# Key exit codes:
# Exit Code 0   — process exited cleanly (config issue, wrong entrypoint)
# Exit Code 1   — application error (unhandled exception, startup failure)
# Exit Code 137 — killed by SIGKILL, usually OOMKilled
# Exit Code 143 — killed by SIGTERM (terminationGracePeriod exceeded)

# Step 3: Crash logs from the PREVIOUS container run
# The current container is the new restart — it may be healthy or mid-crash
kubectl logs payments-api-7d8f9b-xxxx -n payments-prod --previous --tail=200
# If previous logs are empty: container crashed before writing anything
# → check init container logs, check container startup command

# Step 4: Are all replicas crashing or just some?
# If only one: node-specific issue (disk full, hardware, eviction)
# If all: code issue, config issue, dependency unavailable
kubectl get pods -n payments-prod -l app=payments-api -o wide
# Check NODE column — all on same node? Different nodes?

# Step 5: Node health if pods are on same node
kubectl describe node ip-10-0-1-100.ec2.internal
# Look for: Conditions (MemoryPressure, DiskPressure), Taints, Allocatable vs Requests

# Step 6: Recent changes — did a deployment trigger this?
kubectl rollout history deployment/payments-api -n payments-prod
# Check ArgoCD UI or:
kubectl describe deployment payments-api -n payments-prod | grep Image`}
        </CodeBlock>
        <CompareTable
          headers={['Exit Code', 'Meaning', 'What to Check', 'Mitigation']}
          rows={[
            ['137 + OOMKilled in events', 'Container exceeded memory limit and was killed', 'memory usage trend in Grafana, --previous logs for memory spike', 'Raise limits.memory; check for memory leak'],
            ['1 — application error', 'Unhandled exception at startup or runtime', '--previous logs for stack trace', 'Rollback deployment; fix the bug'],
            ['143 — SIGTERM', 'Graceful shutdown took longer than terminationGracePeriodSeconds', 'App shutdown logic, database connection close', 'Increase terminationGracePeriodSeconds; fix shutdown handler'],
            ['0 — exited cleanly', 'Process ran and exited — should be a long-running service', 'Entrypoint command, process supervision', 'Fix CMD/ENTRYPOINT; wrap in process manager if needed'],
            ['CreateContainerConfigError in events', 'Missing ConfigMap or Secret referenced in pod spec', 'kubectl describe pod — which volume or env var is missing', 'Create the missing Secret/ConfigMap; check ESO sync status'],
            ['ImagePullBackOff', 'Cannot pull container image', 'Image tag exists in ECR? ECR auth on node?', 'Fix image reference; check IRSA for node pull permissions'],
          ]}
        />
        <HighlightBox type="warn">The most common mistake: checking current logs instead of previous logs. When a pod is CrashLoopBackOff, the current container is the new restart after the crash. Its logs may show a healthy startup or just the beginning of the next crash. The crash reason is in <code>kubectl logs --previous</code>, which shows the terminated container's output. If --previous returns nothing, the container crashed before writing any logs — check init containers and the event log for the exact failure.</HighlightBox>
      </Accordion>

      <Accordion title="Production Latency Spike — Debugging Sequence" icon={Activity}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Latency spikes are harder than crashes because the service is still responding — just slowly. The debugging approach is structured around the USE method (Utilization, Saturation, Errors) for each component in the request path.
        </p>
        <CodeBlock language="bash">
{`# Step 1: Characterize the latency spike
# Is it all endpoints or specific ones? (route-level metrics in Grafana)
# Is it all pods or specific ones? (per-pod latency metrics)
# When did it start? (correlate with deployments, cronjobs, traffic spikes)

# Step 2: Check CPU throttling — CFS throttling causes latency without OOMKill
kubectl top pods -n payments-prod
# High CPU usage? Check throttle ratio in Prometheus:
# sum(rate(container_cpu_cfs_throttled_seconds_total[5m])) by (pod)
#   / sum(rate(container_cpu_cfs_periods_total[5m])) by (pod)
# > 0.25 means pod is throttled 25% of the time — latency impact is severe

# Step 3: Check database
# Most latency spikes trace back to slow DB queries or connection pool exhaustion
# For RDS: check CloudWatch → Enhanced Monitoring → Active connections, CPU
# For self-managed: kubectl exec into DB pod, check pg_stat_activity (Postgres)
kubectl exec -it postgres-0 -n db -- psql -U postgres -c \
  "SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
   FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC LIMIT 20;"

# Step 4: Check connection pool saturation
# If app uses a connection pool (PgBouncer, HikariCP), is it full?
# Prometheus metrics: hikaricp_connections_active, hikaricp_connections_pending
# Pending connections accumulating = pool is saturated = requests queue up

# Step 5: Distributed tracing
# If you have Jaeger or Tempo, find a slow trace and identify which span is slow
# This points directly to the slow component: DB, external API, internal service

# Step 6: Check if it's a downstream service
# Is payments-api slow because fraud-service (which it calls) is slow?
kubectl logs -n payments-prod -l app=payments-api --since=5m | grep -i "timeout\|slow\|error"

# Step 7: Node-level issues
# CPU steal time on EC2 = noisy neighbor (happens on shared hardware)
kubectl exec -it payments-api-xxxx -n payments-prod -- top
# %st in CPU line = steal time — if >5%, escalate to AWS Support or move to dedicated`}
        </CodeBlock>
        <HighlightBox>Latency spikes after a deployment that does not roll back: the deployment may have triggered a side effect that persists even after rollback. Common examples: (1) DB schema migration ran — old code cannot use new schema, so rollback re-introduces a different error. (2) Cache invalidation — new code flushed a large cache on startup, causing all requests to be cache misses temporarily. (3) Connection storm — rolling restart of 50 pods all opening new DB connections simultaneously, saturating the connection limit. These require forward-fixing, not rolling back.</HighlightBox>
      </Accordion>

      <Accordion title="Postmortem Structure and Blameless Culture" icon={FileText}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          A postmortem is a structured document produced within 48-72 hours of a significant incident. Its purpose is to capture what happened accurately while memory is fresh, and to drive systemic improvements that reduce the probability or impact of the next incident.
        </p>
        <CodeBlock language="markdown">
{`# Postmortem: payments-api 502 Spike — 2026-04-15

## Summary
payments-api returned 502 errors to ~35% of requests for 23 minutes.
Cause: memory leak in v2.4.1 triggered OOMKills across all pods.
Impact: Checkout was degraded. ~8,000 failed payment attempts.

## Timeline (all times UTC)
14:23 — Automated alert: 5xx rate > 5% on payments-api (threshold: 1%)
14:25 — On-call engineer acknowledges PagerDuty alert
14:27 — Opens incident channel #inc-2026-04-15-payments
14:30 — Identified: multiple pods in CrashLoopBackOff after OOMKill
14:32 — Correlated with v2.4.1 deployment at 14:15
14:33 — Decision: rollback to v2.4.0
14:35 — ArgoCD rollback initiated (git revert + push to config repo)
14:38 — New pods from v2.4.0 starting up
14:44 — Error rate back to 0%, all pods Running
14:46 — All-clear posted in incident channel
15:30 — Postmortem draft started

## Root Cause
v2.4.1 introduced an in-memory cache in the product lookup service that
was not bounded. Under production load (~500 rps), the cache grew
unboundedly, consuming memory until the OOMKill threshold was reached.
The feature worked in staging at <50 rps load.

## Contributing Factors
1. No memory limits on the payments-api Deployment (missing from Helm values)
2. Staging load test uses 10% of production traffic — didn't reveal the leak
3. No memory trend alert — only OOMKill alert existed (fires after the kill)

## What Went Well
- Alert fired within 3 minutes of first OOMKill
- On-call identified deployment correlation quickly
- ArgoCD made rollback straightforward (1-minute operation)

## Action Items
| Item | Owner | Priority | Due |
|------|-------|----------|-----|
| Add memory limits to all Deployments | Platform | P0 | 2026-04-17 |
| OPA policy: reject pods without resource limits | SRE | P0 | 2026-04-17 |
| Add memory growth trend alert (warn before OOMKill) | SRE | P1 | 2026-04-22 |
| Increase staging load test to 50% of prod traffic | Dev | P1 | 2026-04-30 |
| Add bounded cache with LRU eviction to payments-api | Dev | P0 | 2026-04-18 |`}
        </CodeBlock>
        <HighlightBox>Blameless culture means the postmortem identifies system and process failures, not individual failures. "The engineer deployed without testing" is not a root cause — it is a symptom. The systemic question is: why did the system allow an untested change to reach production? The answer is usually missing automation (no load tests in CI, no resource limit enforcement, no canary deployment). Engineers make mistakes in every organization; the difference is whether the system catches those mistakes before they impact users.</HighlightBox>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Action item quality:</span> Good action items are specific, assigned to one owner, have a due date, and are tracked in a project tracker (not just the postmortem document). "Improve testing" is not an action item. "Add k6 load test to CI that runs at 50% prod traffic level with a P99 latency threshold" is an action item.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Postmortem review cadence:</span> Publish the draft within 24 hours of the incident closing. Hold a 30-minute review meeting where stakeholders can challenge the timeline and root cause. Finalize and share broadly. Review action item completion at the next team retrospective — postmortems that produce forgotten action items are security theater.</div>
          </li>
        </ul>
      </Accordion>

      <Accordion title="Runbook Design — What Makes Them Actually Useful" icon={Terminal}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          A runbook is only useful if an on-call engineer who did not write the service can follow it at 3 AM under pressure. That standard should drive every design decision: concrete commands, not abstract steps; current expected output, so the engineer knows what success looks like; and explicit decision trees for ambiguous situations.
        </p>
        <CodeBlock language="markdown">
{`# Runbook: payments-api High Error Rate (SEV1/SEV2)

## Alert
Alert name: payments_api_5xx_high
Fires when: 5xx rate > 5% for 2 minutes

## Quick triage (2 minutes)

### Check pod health
kubectl get pods -n payments-prod -l app=payments-api
# Expected: all Running with 0-1 restarts
# If CrashLoopBackOff: → go to Section A (crash debugging)
# If all Running: → go to Section B (runtime degradation)

## Section A: Pods Crashing

1. Get crash reason:
   kubectl describe pod <pod-name> -n payments-prod
   kubectl logs <pod-name> -n payments-prod --previous --tail=100

2. Check exit code:
   - Exit 137 (OOMKilled): raise limits.memory to 2x current value → see "Scale Resources"
   - Exit 1 (app error): → check for recent deployment → rollback if yes

3. Rollback if deployment-related:
   # In ArgoCD UI: Application → History → Rollback to previous revision
   # Or via git: revert the image tag change in k8s-config repo → push → ArgoCD auto-syncs

## Section B: Pods Running but Errors

1. Check if specific endpoint is failing (route-level metrics in Grafana):
   Dashboard: "payments-api" → panel "Error rate by endpoint"

2. Check downstream dependencies:
   - RDS: CloudWatch → payments-db → DatabaseConnections + CPUUtilization
   - fraud-service: kubectl get pods -n payments-prod -l app=fraud-service

3. If downstream is healthy, check application logs for error pattern:
   kubectl logs -n payments-prod -l app=payments-api --since=10m | grep ERROR | sort | uniq -c | sort -rn

## Escalation
- Not resolving in 15 minutes: page team lead
- Data loss suspected: page VP Engineering
- Security incident suspected: page Security team + follow security runbook`}
        </CodeBlock>
        <HighlightBox type="tip">Link runbooks from PagerDuty/Alertmanager alert annotations so the on-call engineer has the runbook URL in the alert notification. Runbooks stored in a wiki that nobody remembers to check are not useful. Alertmanager annotation example: <code>annotations.runbook_url: "https://runbooks.internal/payments-api-high-error-rate"</code>. Measure runbook effectiveness by tracking whether on-call engineers report using them — if they are not being used, the runbook is too abstract or too long.</HighlightBox>
      </Accordion>

      <Accordion title="5-Whys and Systemic Root Cause Analysis" icon={RefreshCw}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The 5-Whys technique iteratively asks "why" to move from symptom to systemic root cause. The goal is to reach a level of causation where a process change prevents recurrence — not just the specific bug that caused this incident.
        </p>
        <CodeBlock language="text">
{`Example: payments-api returned 502 errors for 23 minutes

Why did payments-api return 502 errors?
→ Pods were OOMKilled, leaving no healthy endpoints during restart.

Why were pods OOMKilled?
→ A memory leak in v2.4.1 caused unbounded memory growth under load.

Why did a memory leak reach production?
→ The code was reviewed and merged without performance testing at production load.

Why was there no performance testing?
→ The CI pipeline has no load test stage, and staging is only run at 10% of production traffic.

Why is staging only 10% of prod traffic?
→ Load test infrastructure was never built; the assumption was staging traffic was sufficient.

Root cause: No load testing infrastructure or process means memory leaks
and performance regressions are not caught until they hit production.

Action items:
1. Build k6 load test suite targeting production-level RPS (immediate)
2. Add load test stage to CI pipeline running against staging (1 week)
3. Add memory growth alert that fires before OOMKill threshold (2 days)
4. Add resource limits to all Deployments (immediate)

Note: Stopping at "Why #2 — there was a memory leak" produces an action
item of "don't write memory leaks." Stopping at "Why #4 — no load tests"
produces infrastructure and process improvements that catch the next
different memory leak before it reaches production.`}
        </CodeBlock>
        <HighlightBox type="warn">5-Whys has limits. Complex incidents with multiple contributing causes do not have a single root cause — they have a chain of failures where any single link being stronger would have prevented the outage. For complex incidents, use a fault tree or fishbone diagram to capture all contributing factors simultaneously, not just one linear chain. The goal is always to find interventions — system changes that increase resilience — not a single cause to assign blame.</HighlightBox>
      </Accordion>
    </div>
  );
}
