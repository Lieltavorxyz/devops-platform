import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import NotesBox from '../components/NotesBox';
import HighlightBox from '../components/HighlightBox';
import CompareTable from '../components/CompareTable';
import CodeBlock from '../components/CodeBlock';

export default function Observability() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">{'\uD83D\uDCCA'} Observability</div>
        <h1>Prometheus, Grafana & Loki</h1>
        <p>The standard open-source observability stack for Kubernetes — metrics, dashboards, and log aggregation.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Prometheus',
          body: "Time-series metrics database. Scrapes metrics from targets via HTTP. Evaluates alert rules. Pull model — it goes and fetches metrics, targets don't push."
        },
        {
          title: 'Grafana',
          body: 'Visualization layer. Queries Prometheus (and Loki) and renders dashboards. Dashboards as code (JSON/YAML). Alerting via Alertmanager or native.'
        },
        {
          title: 'Loki',
          body: "Log aggregation — like Prometheus but for logs. Doesn't index log content (fast ingest, lower cost). Stores labels (namespace, pod, container) for filtering. Query via LogQL."
        }
      ]} />

      <Accordion title="How Prometheus Scraping Works" icon={'\uD83D\uDD0D'} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Prometheus discovers targets via ServiceMonitor CRDs (if using kube-prometheus-stack) or static config. Every <code>scrapeInterval</code> (default 30s), it calls <code>/metrics</code> on each target and stores the result.
        </p>
        <CodeBlock>{`# ServiceMonitor — tells Prometheus to scrape your app
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: my-app
  namespace: monitoring
  labels:
    release: kube-prometheus-stack   # must match Prometheus selector
spec:
  selector:
    matchLabels:
      app: my-app
  namespaceSelector:
    matchNames:
      - production
  endpoints:
    - port: metrics                  # named port on the Service
      path: /metrics
      interval: 30s`}</CodeBlock>
        <HighlightBox type="warn"><strong>Common failure:</strong> ServiceMonitor labels don't match the Prometheus <code>serviceMonitorSelector</code>. Check your kube-prometheus-stack values — the default selector looks for <code>release: kube-prometheus-stack</code>. If your ServiceMonitor doesn't have this label, Prometheus ignores it silently.</HighlightBox>
      </Accordion>

      <Accordion title="Key Metrics to Know" icon={'\uD83D\uDCC8'}>
        <CompareTable
          headers={['Metric', 'What It Tells You', 'Alert Threshold']}
          rows={[
            ['<code>container_cpu_usage_seconds_total</code>', 'CPU usage per container', '> 80% of limit for 5m'],
            ['<code>container_memory_working_set_bytes</code>', 'Actual memory in use (what OOMKiller sees)', '> 90% of limit'],
            ['<code>kube_pod_container_status_restarts_total</code>', 'Restart count — crash loops show here', '> 5 restarts in 10m'],
            ['<code>kube_deployment_status_replicas_unavailable</code>', 'Pods not ready in a Deployment', '> 0 for 5m in prod'],
            ['<code>node_memory_MemAvailable_bytes</code>', 'Free memory on the node', '< 10% of total'],
            ['<code>http_requests_total</code>', 'Request rate — derive error rate with rate() + filter 5xx', 'Error rate > 1% for 5m'],
          ]}
        />
        <HighlightBox type="tip">
          <strong>PromQL essentials:</strong><br />
          <code>{'rate(http_requests_total{status=~"5.."}[5m])'}</code> — 5xx rate<br />
          <code>{'histogram_quantile(0.99, rate(http_duration_seconds_bucket[5m]))'}</code> — p99 latency<br />
          <code>{'sum by (namespace) (container_memory_working_set_bytes)'}</code> — memory by namespace
        </HighlightBox>
      </Accordion>

      <Accordion title="Loki + Fluent Bit — Log Pipeline" icon={'\uD83D\uDCCB'}>
        <HighlightBox type="info"><strong>Flow:</strong> App writes to stdout/stderr → Fluent Bit DaemonSet tails the log files from the node → ships to Loki → Grafana queries Loki with LogQL</HighlightBox>
        <CodeBlock>{`# LogQL — like PromQL but for logs
# Find all ERROR logs in the payments namespace
{namespace="payments"} |= "ERROR"

# Count error logs per minute
rate({namespace="payments"} |= "ERROR" [1m])

# Parse JSON logs and filter by field
{namespace="payments"} | json | level="error" | status_code >= 500`}</CodeBlock>
        <HighlightBox type="warn"><strong>Loki gotcha:</strong> Loki does NOT index log content — only labels (namespace, pod, container). High-cardinality labels (like pod names with random suffixes) will explode the index and kill performance. Use low-cardinality labels only: namespace, app, environment.</HighlightBox>
        <NotesBox id="observability-stack" placeholder="What observability stack did you use? Datadog? CloudWatch? Prometheus? How did you handle alerting? Any on-call incidents?" />
      </Accordion>

      <Accordion title="Alerting Best Practices" icon={'\uD83D\uDD14'}>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Alert on symptoms, not causes:</span> Alert on "error rate &gt; 1%" or "p99 latency &gt; 2s", not on "CPU &gt; 80%". High CPU might be fine if latency is normal.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Use severity levels:</span> Critical = pages someone at 3am (service down). Warning = looked at during business hours. Info = dashboard annotation only.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Avoid alert fatigue:</span> Every alert should be actionable. If you can't write a runbook for it, it shouldn't page anyone.</div>
          </li>
        </ul>
        <NotesBox id="observability-alerting" placeholder="How was alerting set up in your team? What tools did you use? Any false-positive horror stories?" />
      </Accordion>

      <Accordion title="Interview Q&A" icon={'\uD83D\uDCAC'}>
        <HighlightBox type="info">
          <strong>Q: How do you know if a deployment caused a regression?</strong><br /><br />
          "We correlate deploy events with Grafana dashboards. After a deploy, I watch the p99 latency, error rate, and restart count for 5-10 minutes. We annotate Grafana dashboards with deployment events so you can see the exact moment traffic patterns changed. If restarts spike or error rate climbs after the deploy, we roll back via <code>helm rollback</code> or ArgoCD sync to previous revision."
        </HighlightBox>
        <HighlightBox type="info">
          <strong>Q: A pod is OOMKilled repeatedly. How do you investigate?</strong><br /><br />
          "Check <code>kubectl describe pod</code> for OOMKilled exit code (137). Then query Prometheus: <code>container_memory_working_set_bytes</code> for that pod over the last 24h to see the growth trend. If it's a slow memory leak, the graph climbs steadily. If it's a spike, it's a specific request pattern. From there, either increase the memory limit or find the leak — check heap dumps or profiling if the language supports it."
        </HighlightBox>
      </Accordion>
    </div>
  );
}
