import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import NotesBox from '../components/NotesBox';
import HighlightBox from '../components/HighlightBox';
import CompareTable from '../components/CompareTable';
import CodeBlock from '../components/CodeBlock';

export default function Incident() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">{'\uD83D\uDEA8'} Reliability & Operations</div>
        <h1>Incident Response</h1>
        <p>On-call runbooks, root cause analysis frameworks, postmortem culture, and real debugging stories. The skills that separate "I know tools" from "I keep production running."</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Problem It Solves',
          body: 'When production breaks at 3 AM, you need a repeatable process — not heroics. Incident response frameworks reduce MTTR by giving engineers a clear playbook: detect, triage, mitigate, communicate, then fix root cause later. Without this, every outage is chaos.'
        },
        {
          title: 'Why It Matters in Interviews',
          body: 'Senior DevOps interviews test how you think under pressure. "Walk me through debugging a production outage" is the most common open-ended question. They want to see systematic thinking, not random guessing.'
        },
        {
          title: 'The Core Principle',
          body: 'Mitigate first, investigate later. Your first job is to stop the bleeding — rollback, scale up, redirect traffic. Root cause analysis happens in the postmortem, not during the incident. Optimizing for MTTR over MTTF.'
        },
        {
          title: 'What Good Looks Like',
          body: 'A team with mature incident response has: clear severity levels, automated alerting with runbooks linked, an incident commander role, blameless postmortems, and action items that actually get completed.'
        }
      ]} />

      <Accordion title="On-Call Runbook Framework" icon={'\uD83D\uDCCB'} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          A runbook is a step-by-step guide for responding to a specific alert. Good runbooks reduce MTTR because engineers don't waste time figuring out <em>what to check</em> — they follow the playbook.
        </p>

        <HighlightBox type="tip">
          <strong>Runbook structure:</strong> Every runbook should answer 4 questions: (1) What triggered this alert? (2) What's the impact? (3) What do I check first? (4) How do I mitigate immediately?
        </HighlightBox>

        <p style={{fontSize:13, color:'var(--text)', margin:'12px 0'}}><strong>Example: Pod CrashLoopBackOff runbook</strong></p>

        <CodeBlock>{`# Step 1: Identify the failing pod
kubectl get pods -n <namespace> | grep CrashLoop

# Step 2: Check recent logs (current crash + previous crash)
kubectl logs <pod-name> -n <namespace> --tail=100
kubectl logs <pod-name> -n <namespace> --previous --tail=100

# Step 3: Describe the pod — check events, exit codes, resource limits
kubectl describe pod <pod-name> -n <namespace>

# Key things to look for:
# - Exit code 137 = OOMKilled (need more memory)
# - Exit code 1 = Application error (check logs)
# - Exit code 143 = SIGTERM (graceful shutdown failed)
# - ImagePullBackOff = wrong image tag or registry auth

# Step 4: Check if it's a recent deployment
kubectl rollout history deployment/<deploy-name> -n <namespace>

# Step 5: Mitigate — rollback if recent deployment caused it
kubectl rollout undo deployment/<deploy-name> -n <namespace>`}</CodeBlock>

        <HighlightBox type="warn">
          <strong>Common gotcha:</strong> Engineers jump straight to <code>kubectl logs</code> without checking <code>--previous</code>. If the pod already crashed and restarted, the current logs are from the new (possibly healthy) instance. The crash logs are in <code>--previous</code>.
        </HighlightBox>

        <CompareTable
          headers={['Severity', 'Definition', 'Response Time', 'Example']}
          rows={[
            ['<span class="tag red">SEV1</span>', 'Complete service outage or data loss', '&lt; 15 min', 'All pods down, DB unreachable, 5xx for all users'],
            ['<span class="tag yellow">SEV2</span>', 'Degraded service, partial impact', '&lt; 30 min', 'High latency, one AZ down, some features broken'],
            ['<span class="tag green">SEV3</span>', 'Minor issue, workaround exists', '&lt; 4 hours', 'Staging broken, non-critical job failing, cosmetic bug'],
          ]}
        />

        <NotesBox id="incident-oncall" placeholder="What on-call rotations have you been part of? What tools did you use for alerting (PagerDuty, OpsGenie)? What was your typical first response?" />
      </Accordion>

      <Accordion title="5-Whys Root Cause Analysis" icon={'\uD83D\uDD0D'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The 5-Whys technique traces an incident back from symptom to systemic root cause. The goal is to find the <em>process</em> failure, not the <em>person</em> failure.
        </p>

        <HighlightBox type="info">
          <strong>Real example: API returning 502 errors</strong>
        </HighlightBox>

        <ul className="item-list">
          <li><span className="bullet">{'\u0031\uFE0F\u20E3'}</span> <span className="label">Why?</span> The API pods were returning 502 to the load balancer.</li>
          <li><span className="bullet">{'\u0032\uFE0F\u20E3'}</span> <span className="label">Why?</span> The pods were OOMKilled and restarting, causing brief windows with no healthy endpoints.</li>
          <li><span className="bullet">{'\u0033\uFE0F\u20E3'}</span> <span className="label">Why?</span> A new feature introduced a memory leak — each request allocated a buffer that was never freed.</li>
          <li><span className="bullet">{'\u0034\uFE0F\u20E3'}</span> <span className="label">Why?</span> The feature was merged without a load test, so the leak wasn't caught before production.</li>
          <li><span className="bullet">{'\u0035\uFE0F\u20E3'}</span> <span className="label">Why?</span> The team had no automated performance testing in the CI pipeline, and the code review didn't include memory profiling.</li>
        </ul>

        <HighlightBox type="tip">
          <strong>Root cause:</strong> Missing performance/memory testing in CI pipeline. <strong>Action items:</strong> (1) Add memory limit alerting in Grafana, (2) Add load testing stage to CI, (3) Set up OOMKill alerts with runbook links.
        </HighlightBox>

        <HighlightBox type="warn">
          <strong>Anti-pattern:</strong> Stopping at "Why #3" — the code bug. That's the <em>proximate</em> cause. The real question is: what process allowed this bug to reach production? That's where you find systemic improvements.
        </HighlightBox>

        <NotesBox id="incident-rca" placeholder="Have you led or participated in RCA sessions? What technique did your team use? Did action items actually get prioritized?" />
      </Accordion>

      <Accordion title="Postmortem Format & Culture" icon={'\uD83D\uDCC4'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          A postmortem is a written document produced after an incident. It captures what happened, why, and what changes prevent recurrence. The key cultural principle: <strong>blameless</strong>.
        </p>

        <CodeBlock>{`# Postmortem Template

## Incident Summary
Title: API Gateway 502 Errors — 2026-03-15
Severity: SEV1
Duration: 47 minutes (14:23 - 15:10 UTC)
Impact: ~30% of API requests failed, affecting checkout flow

## Timeline
14:23 — PagerDuty alert: 5xx rate > 5% on api-gateway
14:25 — On-call engineer acknowledges, starts investigation
14:30 — Identified: pods OOMKilled after deploy at 14:15
14:35 — Decision: rollback deployment
14:38 — Rollback initiated via ArgoCD
14:45 — New pods healthy, error rate dropping
15:10 — All metrics back to baseline, incident closed

## Root Cause
Memory leak in new feature (unbounded cache growth)
No memory limits set on the deployment (limits.memory was missing)

## Action Items
[ ] Add memory limits to all deployments (owner: platform team, P0)
[ ] OPA policy to reject pods without resource limits (owner: SRE, P1)
[ ] Load test stage in CI pipeline (owner: dev team, P2)
[ ] OOMKill alert → runbook link in PagerDuty (owner: SRE, P1)`}</CodeBlock>

        <HighlightBox type="info">
          <strong>Blameless culture means:</strong> The postmortem focuses on <em>system</em> failures, not <em>human</em> failures. "The engineer deployed bad code" is not a root cause. "Our CI pipeline didn't catch the memory leak, and our deployment had no resource limits" <em>is</em> a root cause.
        </HighlightBox>

        <HighlightBox type="tip">
          <strong>Interview tip:</strong> When asked about postmortems, mention the blameless principle and that action items should have owners, priorities, and deadlines. Mention that you track completion of action items — many teams write postmortems but never follow up.
        </HighlightBox>

        <NotesBox id="incident-postmortem" placeholder="Have you written or participated in postmortems? Does your team have a template? Do action items actually get done?" />
      </Accordion>

      <Accordion title="Real Incident Debugging: CrashLoopBackOff Deep Dive" icon={'\uD83D\uDC1B'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The most common interview scenario: "Production is down, pods are CrashLooping. Walk me through your debugging process step by step."
        </p>

        <HighlightBox type="info">
          <strong>Systematic debugging flow — the order matters:</strong>
        </HighlightBox>

        <ul className="item-list">
          <li><span className="bullet">{'\u0031\uFE0F\u20E3'}</span> <span className="label">Scope the blast radius:</span> <code>kubectl get pods -A | grep -v Running</code> — Is it one pod, one deployment, one namespace, or cluster-wide? This tells you if it's app-level or infrastructure-level.</li>
          <li><span className="bullet">{'\u0032\uFE0F\u20E3'}</span> <span className="label">Check the events:</span> <code>kubectl describe pod &lt;name&gt;</code> — Look at Events section at the bottom. OOMKilled? ImagePullBackOff? FailedScheduling? Each points to a different root cause.</li>
          <li><span className="bullet">{'\u0033\uFE0F\u20E3'}</span> <span className="label">Read the logs:</span> <code>kubectl logs &lt;pod&gt; --previous</code> — The crash reason is in the <em>previous</em> container's logs. Current container may already be in init.</li>
          <li><span className="bullet">{'\u0034\uFE0F\u20E3'}</span> <span className="label">Check recent changes:</span> Was there a deployment? A config change? A secret rotation? <code>kubectl rollout history</code> and check ArgoCD recent syncs.</li>
          <li><span className="bullet">{'\u0035\uFE0F\u20E3'}</span> <span className="label">Check the node:</span> <code>kubectl describe node &lt;node&gt;</code> — Is the node under memory/disk pressure? Are there taints that shouldn't be there?</li>
        </ul>

        <CompareTable
          headers={['Symptom', 'Likely Cause', 'Quick Fix', 'Permanent Fix']}
          rows={[
            ['Exit code 137', 'OOMKilled — container exceeded memory limit', 'Increase <code>limits.memory</code>', 'Profile app memory, fix leak, set appropriate limits'],
            ['Exit code 1', 'Application error — uncaught exception', 'Rollback deployment', 'Fix the bug, add error handling, add integration tests'],
            ['Exit code 143', 'SIGTERM — graceful shutdown timeout', 'Increase <code>terminationGracePeriodSeconds</code>', 'Ensure app handles SIGTERM properly'],
            ['ImagePullBackOff', 'Wrong image tag or registry auth', 'Fix image reference', 'Pin image digests, validate in CI'],
            ['CreateContainerConfigError', 'Missing ConfigMap or Secret', 'Create the missing resource', 'Add ESO sync, validate deps before deploy'],
          ]}
        />

        <HighlightBox type="warn">
          <strong>Trap in interviews:</strong> Don't jump to "I'd check the logs." Start with scoping: "First, I'd understand the blast radius — is it one pod or many? That tells me whether to look at the application or the infrastructure."
        </HighlightBox>

        <NotesBox id="incident-debugging" placeholder="What's a real CrashLoopBackOff or production incident you debugged? What was the root cause? How long did it take?" />
      </Accordion>

      <Accordion title="Interview Q&A — Failure Scenarios & Incident Response" icon={'\uD83C\uDFAF'}>
        <HighlightBox type="info">
          <strong>Q: You get paged at 2 AM. Your service is returning 5xx errors. Walk me through your first 10 minutes.</strong><br /><br />
          "First 60 seconds: I check the alert details — which service, what error rate, when it started. I pull up Grafana dashboards for that service — request rate, error rate, latency, pod health. Within 2-3 minutes I'm correlating: did a deployment go out recently? (check ArgoCD history). Is it all pods or just some? (scope the blast radius). If I see a recent deploy correlates with the spike, my first move is rollback — mitigate now, investigate later. If it's not deploy-related, I check dependencies: is the database healthy? Are external APIs timing out? I'd also check node health — are nodes NotReady? Is there a cluster-level event? Throughout this, I'm posting updates in the incident channel every 5 minutes so the team has visibility."
        </HighlightBox>

        <HighlightBox type="info">
          <strong>Q: A deployment went out and now latency has increased 3x. But the rollback didn't fix it. What do you do?</strong><br /><br />
          "If rollback didn't fix it, the deployment wasn't the root cause — it was a red herring or just a trigger. I'd widen the investigation: (1) Check downstream dependencies — is the database slow? Are there lock contention issues? (2) Check if a dependent service also deployed. (3) Look at infrastructure — did an AZ have issues? Is there a noisy neighbor on the node? (4) Check resource metrics at the node level — CPU steal time can indicate EC2 host issues. (5) Look at connection pool exhaustion — maybe the deploy caused a connection storm that saturated the DB, and rollback didn't release those connections. The key insight: rollback doesn't undo <em>side effects</em> like DB connection leaks or cache invalidation."
        </HighlightBox>

        <HighlightBox type="info">
          <strong>Q: How do you decide between rolling back and pushing a hotfix forward?</strong><br /><br />
          "Rollback when: the previous version was stable and the issue is clearly caused by the new code. It's the fastest path to mitigation — you already know the old version works. Push forward when: rollback is risky (e.g., a DB migration already ran and the old code can't work with the new schema), or the fix is trivial and well-understood. My default bias is toward rollback because it's proven-safe, and I investigate the root cause once users are unblocked."
        </HighlightBox>

        <HighlightBox type="info">
          <strong>Q: Tell me about a time you were involved in a production incident. What happened and what did you learn?</strong><br /><br />
          "This is your story to fill in — use the notes box below. Structure it as: (1) What was the impact, (2) How did I discover it, (3) What was my debugging process, (4) What was the root cause, (5) What did we change to prevent recurrence. Keep it to 2 minutes when speaking."
        </HighlightBox>

        <NotesBox id="incident-story" placeholder="Fill in a real production incident story: What broke? How did you find out? What did you do? What was the root cause? What changed after?" />
      </Accordion>
    </div>
  );
}
