import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import HighlightBox from '../components/HighlightBox';
import CompareTable from '../components/CompareTable';
import CodeBlock from '../components/CodeBlock';
import { BarChart2, DollarSign, Wrench, Scale, Activity, Settings } from 'lucide-react';

export default function Sre() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">Site Reliability Engineering</div>
        <h1>SRE Concepts</h1>
        <p>SLIs, SLOs, SLAs, error budgets, toil reduction, and capacity planning — the quantitative framework for making reliability decisions and the production mechanics of implementing them in Prometheus and Kubernetes.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Reliability is a Feature with a Cost Function',
          body: '100% reliability is the wrong target. Users cannot distinguish 99.99% from 100%, but your engineering team pays an enormous cost in complexity, deployment risk aversion, and maintenance trying to close that last gap. SRE formalizes this: set a target (SLO), measure against it (SLI), and use the gap between target and actual as a decision-making tool (error budget). The error budget is not the amount of downtime you plan to have — it is the amount of risk you are allowed to take on new features before reliability work must take priority.'
        },
        {
          title: 'The Tension This Solves',
          body: 'Product wants to ship faster. Operations wants to reduce risk. Without a framework, this is a permanent argument based on opinions and past incidents. With SLOs and error budgets, the conversation becomes: "We have 60% of our error budget remaining this month — we can deploy the risky migration." Or: "We are at 5% error budget remaining — we are in reliability-only mode until the window resets." The budget is the referee, not anyone\'s opinion.'
        }
      ]} />

      <Accordion title="SLI, SLO, SLA — Definitions and the Math" icon={BarChart2} defaultOpen={true}>
        <CompareTable
          headers={['Term', 'What It Is', 'Who Sets It', 'Consequences If Missed']}
          rows={[
            ['SLI (Service Level Indicator)', 'A measured ratio or value that reflects service health from the user perspective', 'Engineering — measured automatically', 'None directly — it is just a measurement'],
            ['SLO (Service Level Objective)', 'A target value for an SLI over a time window — internal goal', 'Engineering + Product together', 'Error budget burned; reliability sprint triggered'],
            ['SLA (Service Level Agreement)', 'A contractual commitment with financial penalties if breached', 'Business + Legal + Engineering', 'Customer credits, contract penalties, churn'],
          ]}
        />
        <HighlightBox>SLA must always be less strict than SLO. If your SLO is 99.9%, your SLA might be 99.5%. The gap between SLO and SLA is your operational safety margin — you can breach your internal target without immediately owing customers money. Companies that set SLA = SLO have no buffer: every internal miss is a financial penalty.</HighlightBox>
        <CodeBlock language="text">
{`# What reliability percentages actually mean in lost minutes

SLO Target | Monthly budget    | Annual budget     | Notes
-----------|-------------------|-------------------|---------------------------
99%        | 432 min (7.2 hrs) | 5,256 min (3.6d)  | Internal tools, batch jobs
99.9%      | 43.2 min          | 525.6 min (8.8h)  | Most SaaS APIs
99.95%     | 21.6 min          | 262.8 min (4.4h)  | Payment systems, auth
99.99%     | 4.32 min          | 52.6 min          | Core infra: DNS, IAM
99.999%    | 0.43 min          | 5.25 min          | Rarely needed outside telco

# For 99.9% over a 30-day window:
Total minutes = 30 * 24 * 60 = 43,200
Allowed failures = 43,200 * 0.001 = 43.2 minutes of downtime`}
        </CodeBlock>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Good SLIs measure what users experience, not internal technical metrics. Request success rate (non-5xx / total requests) is a good SLI because a user experiences failure when they get an error. CPU utilization is a bad SLI — high CPU does not mean users are seeing errors; low CPU does not mean they are not.
        </p>
        <CompareTable
          headers={['SLI Category', 'Definition', 'Prometheus Query (example)', 'Good For']}
          rows={[
            ['Availability', 'Fraction of successful requests', 'sum(rate(http_requests_total{code!~"5.."}[5m])) / sum(rate(http_requests_total[5m]))', 'All request-serving services'],
            ['Latency', 'Fraction of requests faster than threshold', 'histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) < 0.3', 'Latency-sensitive APIs'],
            ['Throughput', 'Rate of successful operations', 'sum(rate(http_requests_total{code!~"5.."}[5m]))', 'Batch processing systems'],
            ['Correctness', 'Fraction of responses with correct results', 'Custom probe comparing output to expected — harder to automate', 'Data pipelines, calculation services'],
            ['Freshness', 'Age of most recent data written', 'time() - max(last_successful_write_timestamp)', 'Caches, sync jobs, feeds'],
          ]}
        />
      </Accordion>

      <Accordion title="Error Budgets — The Decision Framework" icon={DollarSign}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          An error budget is the complement of your SLO. 99.9% SLO = 0.1% error budget. It is the amount of unreliability you are allowed over the measurement window. Spending it on a risky deployment that causes a 10-minute outage is legitimate — that is what the budget is for. Burning it on avoidable incidents is waste.
        </p>
        <CodeBlock language="python">
{`# Error budget calculation for a 30-day rolling window
slo_target = 0.999           # 99.9%
error_budget_fraction = 1 - slo_target  # 0.001

total_requests_per_day = 86_400 * 1000  # 1000 rps service
total_requests_30d = total_requests_per_day * 30  # 2,592,000,000

error_budget_requests = total_requests_30d * error_budget_fraction
# = 2,592,000 failed requests allowed over 30 days

# At 1000 rps:
# 2,592,000 errors / 1000 rps = 2,592 seconds = 43.2 minutes of complete outage
# OR 8,640 seconds (2.4 hours) at 30% error rate

# Tracking budget burn rate:
# If on day 15 you have used 2,000,000 of 2,592,000 allowed failures
# Budget remaining: 592,000 / 2,592,000 = 22.8%
# Burn rate: 2,000,000 / 15 days = 133,333/day
# At current burn rate, budget exhausted in: 592,000 / 133,333 = 4.4 more days`}
        </CodeBlock>
        <CompareTable
          headers={['Budget Remaining', 'Signal', 'Action']}
          rows={[
            ['>50%', 'Healthy — ahead of target', 'Deploy freely. Accept high-risk changes. Invest in new features.'],
            ['20-50%', 'Watch closely', 'Require canary deployments. Code freeze for highest-risk changes. Watch burn rate.'],
            ['5-20%', 'Alert threshold', 'Slow feature releases. Reliability sprint begins. Fix top error-budget consumers.'],
            ['<5%', 'Near exhaustion', 'Feature freeze. All hands on reliability. Every deploy requires explicit approval.'],
            ['Exhausted', 'SLO breached', 'Hard stop on deploys. Incident review. Formal reliability sprint before any new feature work.'],
          ]}
        />
        <CodeBlock language="yaml">
{`# Prometheus recording rules for SLO tracking
# These rules pre-compute SLI values for efficient alerting

groups:
  - name: payments-api-slo
    interval: 30s
    rules:
      # 5-minute error rate (short window — fast detection)
      - record: job:http_requests_success:rate5m
        expr: |
          sum(rate(http_requests_total{job="payments-api",code!~"5.."}[5m]))
          /
          sum(rate(http_requests_total{job="payments-api"}[5m]))

      # 30-day rolling availability (the SLI we track against the SLO)
      - record: job:http_requests_success:rate30d
        expr: |
          sum(rate(http_requests_total{job="payments-api",code!~"5.."}[30d]))
          /
          sum(rate(http_requests_total{job="payments-api"}[30d]))

      # Error budget remaining (fraction, not percentage)
      - record: job:error_budget_remaining
        expr: |
          (job:http_requests_success:rate30d - 0.999) / (1 - 0.999)
          # Positive = budget remaining; negative = SLO breached

  - name: payments-api-slo-alerts
    rules:
      - alert: ErrorBudgetBurnRateHigh
        expr: |
          (
            1 - job:http_requests_success:rate5m
          ) > 14.4 * (1 - 0.999)
          # 14.4x burn rate = budget exhausted in 2 hours at this rate
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Error budget burning at 14.4x rate — will exhaust in 2 hours"
          runbook_url: "https://runbooks.internal/slo-burn-rate"`}
        </CodeBlock>
        <HighlightBox type="tip">Burn rate alerts are more actionable than threshold alerts. An alert firing when error rate exceeds 1% fires too late — you may have already burned significant budget. A burn rate alert fires when your error rate is X times higher than the sustainable rate for your SLO window. 14.4x burn rate means at the current error rate, you will exhaust your monthly budget in 2 hours — act now. Google's SRE workbook defines specific burn rate multipliers (1x, 6x, 14.4x) for different severity levels.</HighlightBox>
      </Accordion>

      <Accordion title="Toil Reduction — What It Is and How to Measure It" icon={Wrench}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Toil is manual, repetitive, automatable work that scales with service size and has no lasting value. It is distinct from operational work that requires human judgment (incident response, architecture decisions). Google's SRE principle: toil should be less than 50% of any SRE's work. Beyond that threshold, the team cannot improve the system — it is only running on the hamster wheel.
        </p>
        <CompareTable
          headers={['Is It Toil?', 'Example', 'Reasoning']}
          rows={[
            ['Yes — toil', 'Manually restarting a pod that crashes periodically', 'Repetitive, automatable (liveness probe + self-healing), scales with pod count'],
            ['Yes — toil', 'Manually rotating TLS certificates before expiry', 'Automatable with cert-manager, no judgment required'],
            ['Yes — toil', 'Creating namespaces and RBAC for new teams', 'Same template every time — automate via IDP or gitops workflow'],
            ['Yes — toil', 'Responding to the same alert that has a known fix', 'Should be automated (runbook automation) or fixed (address root cause)'],
            ['Not toil', 'Investigating a novel production incident', 'Requires judgment, diagnosis — not repetitive by nature'],
            ['Not toil', 'Architecture design for a new service', 'Creative, high-value engineering work'],
            ['Not toil', 'On-call coverage during a quiet week', 'Availability is not toil — the value is being ready'],
          ]}
        />
        <CodeBlock language="bash">
{`# Toil tracking: log time spent on repetitive tasks each sprint
# Simple approach: team spreadsheet or issue tracker tags

# High-value toil to eliminate (ranked by frequency * time):
# 1. Manual certificate renewal → cert-manager with automatic renewal
# 2. Creating resources for new teams → Crossplane or Backstage IDP
# 3. Responding to noisy flapping alerts → tune or fix the underlying cause
# 4. Manual deploy approval clicks → automated canary AnalysisTemplate
# 5. Secret rotation → ESO + AWS Secrets Manager rotation Lambda

# cert-manager auto-renewal example — eliminates certificate expiry toil
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: payments-api-tls
  namespace: payments-prod
spec:
  secretName: payments-api-tls
  renewBefore: 720h  # renew 30 days before expiry — no manual intervention
  dnsNames:
    - payments.internal.company.com
  issuerRef:
    name: internal-ca
    kind: ClusterIssuer`}
        </CodeBlock>
        <HighlightBox>The 50% toil ceiling is a signal, not just a guideline. If more than half your team's time is spent on toil, you are in a debt spiral: toil grows with the service, engineering time to reduce toil shrinks, so toil grows faster. Breaking out requires a deliberate reliability sprint where the explicit goal is toil reduction — no new features, all effort goes to automation. Most teams need this once per year.</HighlightBox>
      </Accordion>

      <Accordion title="Capacity Planning — Sizing for Reliability" icon={Activity}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Capacity planning determines whether you have enough infrastructure to serve traffic at your SLO. Under-provisioned services fail under load. Over-provisioned services waste money. The goal is to provision at the right size with the right scaling response time.
        </p>
        <CodeBlock language="bash">
{`# Step 1: Measure your service's resource consumption at known load
# Run a load test (k6, Locust) against staging at production-level RPS
# Measure: CPU usage, memory usage, P99 latency, error rate

k6 run --vus 500 --duration 10m - <<EOF
import http from 'k6/http';
import { check } from 'k6';
export default function() {
  const res = http.get('https://payments-staging.internal.company.com/health');
  check(res, { 'status 200': (r) => r.status === 200 });
}
EOF

# Output: avg latency, P95/P99, error rate at 500 VUs
# Tells you: what load can the current sizing handle?

# Step 2: Determine your traffic headroom
# If current pod sizing handles 1000 rps at P99 < 300ms,
# and production traffic peaks at 600 rps (Monday morning),
# headroom = 40% — comfortable for 1.4x traffic growth before scaling

# Step 3: Validate HPA scaling is fast enough
# HPA default: check every 15 seconds, scale based on last 2 minutes of metrics
# Problem: 2-minute window means slow response to traffic spikes
# If traffic doubles in 30 seconds, you need 2+ minutes before HPA adds capacity

# Fast HPA config for latency-sensitive services
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: payments-api-hpa
  namespace: payments-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payments-api
  minReplicas: 6    # baseline: survive AZ failure with 4 remaining = 66% capacity
  maxReplicas: 50
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 50   # scale at 50% CPU, not 80% — leaves headroom
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30   # scale up quickly
      policies:
        - type: Percent
          value: 100
          periodSeconds: 30      # can double replicas every 30 seconds
    scaleDown:
      stabilizationWindowSeconds: 300  # scale down slowly — 5 min stability required`}
        </CodeBlock>
        <CompareTable
          headers={['Sizing Decision', 'Too Low Risk', 'Too High Risk', 'Rule of Thumb']}
          rows={[
            ['minReplicas', 'AZ failure takes out too many replicas; cold start latency spike', 'Paying for idle capacity 24/7', 'Set minReplicas so losing one AZ leaves enough capacity for peak traffic'],
            ['CPU target for HPA', 'Runs hot — latency spikes before HPA responds', 'Scales too aggressively — expensive', '50-60% CPU target for latency-sensitive; 70-80% for batch'],
            ['Memory limits', 'OOMKills during traffic spikes if app is memory-correlated', 'Over-allocating — fewer pods per node', 'Set to 1.5-2x of P99 actual usage'],
            ['Node instance type', 'Too small — pods cannot fit; frequent scaling events', 'Too large — wasted capacity when mostly idle', 'Match to pod memory size: 3-5 pods per node ideally'],
          ]}
        />
      </Accordion>

      <Accordion title="SRE vs DevOps — What Actually Differs" icon={Scale}>
        <CompareTable
          headers={['Dimension', 'DevOps', 'SRE']}
          rows={[
            ['Origin', 'Community movement (2008, Patrick Debois), emerged from conference talks', 'Google internal practice (2003, Ben Treynor), made public 2016 via SRE Book'],
            ['Primary goal', 'Break down silos between development and operations teams', 'Apply software engineering rigor to operations problems'],
            ['Reliability approach', 'Automation, CI/CD, shared ownership, fast iteration', 'SLOs + error budgets — quantitative decision framework'],
            ['Metrics', 'DORA: deploy frequency, lead time, change failure rate, MTTR', 'SLI/SLO burn rates, error budget %, toil %'],
            ['Team model', 'Dev teams own their services end-to-end; platform team provides tools', 'Dedicated SRE team; can hand back pager to dev if error budget is burned'],
            ['On-call model', 'You build it, you run it — dev teams on-call for their services', 'SRE on-call for services they support; engagement gated by error budget'],
            ['Toil', 'Reduce manual work through automation (same principle, less formal)', 'Explicit toil tracking; 50% ceiling is a formal limit'],
          ]}
        />
        <HighlightBox type="tip">In practice, most companies do not choose between DevOps and SRE — they apply DevOps culture (shared ownership, automation, CI/CD) and adopt SRE practices (SLOs, error budgets) when scale demands them. A 10-person startup does not need a dedicated SRE team or formal error budgets. A company running 200 microservices with 50 engineers on-call needs the quantitative framework to make consistent reliability decisions across teams. The SRE book itself says: "SRE is what you get when you treat operations as if it's a software problem."</HighlightBox>
      </Accordion>

      <Accordion title="Implementing SLOs in Practice — Prometheus and Grafana" icon={Settings}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Defining SLOs on a whiteboard is easy. Making them actionable requires: instrumented services, recording rules that compute the SLI efficiently, burn rate alerts that fire before the budget is exhausted, and dashboards that show the budget in real time. This is what production SLO implementation looks like.
        </p>
        <CodeBlock language="yaml">
{`# Complete SLO implementation for payments-api

# 1. Application instrumentation (Prometheus client in Go)
# http_requests_total{method, code, path} — counter
# http_request_duration_seconds{method, path} — histogram

# 2. Prometheus recording rules (compute SLIs efficiently)
groups:
  - name: payments-slo-recording
    interval: 30s
    rules:
      # Short window: fast alerting
      - record: payments_api:availability:rate1h
        expr: |
          sum(rate(http_requests_total{app="payments-api",code!~"5.."}[1h]))
          / sum(rate(http_requests_total{app="payments-api"}[1h]))

      # Long window: SLO measurement
      - record: payments_api:availability:rate30d
        expr: |
          sum(rate(http_requests_total{app="payments-api",code!~"5.."}[30d]))
          / sum(rate(http_requests_total{app="payments-api"}[30d]))

      # Error budget remaining (1.0 = full budget, 0.0 = exhausted, negative = breached)
      - record: payments_api:error_budget_remaining
        expr: |
          (payments_api:availability:rate30d - 0.999) / (1 - 0.999)

# 3. Multi-window burn rate alerts (Google SRE Workbook pattern)
  - name: payments-slo-alerts
    rules:
      # Page: burning budget fast — will exhaust in 1 hour
      - alert: PaymentsAPIErrorBudgetBurnCritical
        expr: |
          (1 - payments_api:availability:rate1h) > 14.4 * (1 - 0.999)
          and
          (1 - payments_api:availability:rate5m) > 14.4 * (1 - 0.999)
        for: 2m
        labels:
          severity: page
        annotations:
          summary: "payments-api burning error budget at 14.4x rate"
          description: "At current burn rate, monthly budget exhausted in 1 hour"
          runbook_url: "https://runbooks.internal/payments-slo-burn"

      # Ticket: slower burn — will exhaust in 6 hours
      - alert: PaymentsAPIErrorBudgetBurnHigh
        expr: |
          (1 - payments_api:availability:rate6h) > 6 * (1 - 0.999)
          and
          (1 - payments_api:availability:rate30m) > 6 * (1 - 0.999)
        for: 15m
        labels:
          severity: ticket
        annotations:
          summary: "payments-api burning error budget at 6x rate"
          description: "Budget will exhaust in ~6 hours if trend continues"`}
        </CodeBlock>
        <HighlightBox>Two-window burn rate alerting prevents both false positives and delayed detection. A single short window (5 minutes) is noisy — transient spikes trigger alerts. A single long window (1 hour) is slow — you get paged after significant budget is already burned. Using two windows simultaneously (short + long) ensures the alert fires only when the burn is sustained: the short window confirms it is happening now, the long window confirms it is not a transient spike.</HighlightBox>
      </Accordion>
    </div>
  );
}
