import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import NotesBox from '../components/NotesBox';
import HighlightBox from '../components/HighlightBox';
import CompareTable from '../components/CompareTable';
import CodeBlock from '../components/CodeBlock';

export default function Sre() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">{'\uD83D\uDCD0'} Site Reliability Engineering</div>
        <h1>SRE Concepts</h1>
        <p>SLIs, SLOs, SLAs, error budgets, and toil reduction — the quantitative framework for making reliability decisions. Understanding these concepts shows you think about reliability as an engineering discipline, not just "keep things up."</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Problem It Solves',
          body: '"How reliable should our service be?" Without SRE concepts, the answer is "as reliable as possible" — which means infinite cost and zero feature velocity. SRE gives you a quantitative framework: set a target, measure against it, and use the gap to make decisions.'
        },
        {
          title: 'The Key Insight',
          body: '100% reliability is the wrong target. Users can\'t tell the difference between 99.99% and 100%, but your engineering team pays a massive cost trying to close that gap. Error budgets formalize this: you get a "budget" of acceptable unreliability, and you spend it on shipping features.'
        },
        {
          title: 'SRE vs DevOps',
          body: 'DevOps is a culture — break silos between dev and ops. SRE is a practice — a specific way to implement operations with engineering rigor. Google\'s Ben Treynor: "SRE is what happens when you ask a software engineer to design an operations team."'
        },
        {
          title: 'Why It Matters in Interviews',
          body: 'Companies want engineers who can make data-driven reliability decisions. "We need to slow down feature releases because we\'re burning error budget" is the kind of reasoning senior engineers are expected to articulate.'
        }
      ]} />

      <Accordion title="SLI / SLO / SLA — Definitions with Real Examples" icon={'\uD83D\uDCCA'} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          These three terms form a hierarchy: SLI is the measurement, SLO is the target, SLA is the contract with consequences.
        </p>

        <CompareTable
          headers={['Term', 'What It Is', 'Who Sets It', 'Real Example']}
          rows={[
            ['<strong>SLI</strong><br />(Service Level Indicator)', 'A measurable metric that reflects service health', 'Engineering team', '% of HTTP requests that return 2xx within 300ms'],
            ['<strong>SLO</strong><br />(Service Level Objective)', 'A target value for an SLI — internal goal', 'Engineering + Product', '99.9% of requests succeed within 300ms, measured over 30 days'],
            ['<strong>SLA</strong><br />(Service Level Agreement)', 'A contract with financial consequences if breached', 'Business + Legal', '"99.9% uptime or customer gets 10% credit" (like AWS S3 SLA)'],
          ]}
        />

        <HighlightBox type="tip">
          <strong>Key relationship:</strong> SLA should always be <em>less strict</em> than SLO. If your SLO is 99.9%, your SLA might be 99.5%. This gives you a buffer — you can breach your internal target without owing customers money. If SLA = SLO, every internal miss is a financial penalty.
        </HighlightBox>

        <HighlightBox type="info">
          <strong>Common SLI types:</strong><br />
          <strong>Availability:</strong> % of successful requests (non-5xx / total)<br />
          <strong>Latency:</strong> % of requests faster than threshold (p99 &lt; 500ms)<br />
          <strong>Throughput:</strong> requests per second the system can handle<br />
          <strong>Correctness:</strong> % of responses that return the right data (harder to measure)
        </HighlightBox>

        <p style={{fontSize:13, color:'var(--text)', margin:'12px 0'}}><strong>What 99.9% actually means:</strong></p>

        <CompareTable
          headers={['SLO Target', 'Allowed Downtime/Month', 'Allowed Downtime/Year', 'Typical Use Case']}
          rows={[
            ['99%', '~7.3 hours', '~3.65 days', 'Internal tools, batch jobs'],
            ['99.9%', '~43.8 minutes', '~8.76 hours', 'Most SaaS products'],
            ['99.95%', '~21.9 minutes', '~4.38 hours', 'Payment systems, auth services'],
            ['99.99%', '~4.38 minutes', '~52.6 minutes', 'Core infrastructure (DNS, DB)'],
          ]}
        />

        <HighlightBox type="warn">
          <strong>Gotcha:</strong> Many teams pick "99.99%" because it sounds good, without understanding the cost. Four nines means you can have less than 5 minutes of downtime per month. That means zero-downtime deployments, multi-region failover, and probably no maintenance windows. Is your service really worth that investment?
        </HighlightBox>

        <NotesBox id="sre-sli-slo" placeholder="Does your team have defined SLOs? What SLIs do you measure? How are they tracked (Grafana dashboards, Datadog)?" />
      </Accordion>

      <Accordion title="Error Budgets — The Decision Framework" icon={'\uD83D\uDCB0'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          An error budget is the inverse of your SLO. If your SLO is 99.9%, your error budget is 0.1% — that's how much unreliability you're allowed. It turns reliability into a <em>resource</em> you can spend.
        </p>

        <HighlightBox type="info">
          <strong>How error budgets work in practice:</strong><br /><br />
          Your service has a 99.9% SLO measured over a 30-day rolling window.<br />
          That means you can have ~43.8 minutes of downtime per month.<br />
          If on day 14 you've already used 35 minutes (80% of budget), that's a signal.<br /><br />
          <strong>Budget remaining &gt; 50%:</strong> Ship features freely. Deploy multiple times a day. Take risks.<br />
          <strong>Budget remaining 20-50%:</strong> Slow down. More careful rollouts. Canary deployments.<br />
          <strong>Budget remaining &lt; 20%:</strong> Feature freeze. Focus entirely on reliability. Fix what's causing incidents.<br />
          <strong>Budget exhausted:</strong> Hard stop on deploys. All engineering effort goes to reliability.
        </HighlightBox>

        <CodeBlock>{`# Error budget calculation
SLO target: 99.9%
Error budget: 100% - 99.9% = 0.1%

# Over 30 days (in minutes)
Total minutes: 30 * 24 * 60 = 43,200
Error budget: 43,200 * 0.001 = 43.2 minutes

# If you've had 2 incidents this month:
Incident 1: 15 min downtime
Incident 2: 20 min downtime
Budget used: 35 min / 43.2 min = 81%
Budget remaining: 19% — approaching freeze threshold`}</CodeBlock>

        <HighlightBox type="tip">
          <strong>The power of error budgets:</strong> They resolve the eternal tension between dev ("ship features faster") and ops ("don't break things"). Instead of arguing, you look at the budget. Budget remaining? Ship. Budget burned? Stabilize. It's data-driven, not opinion-driven.
        </HighlightBox>

        <HighlightBox type="warn">
          <strong>Real-world scenario (interview question):</strong> "Your service has a 99.9% SLO. You've burned 80% of your error budget in week 2. What do you do?" Answer: (1) Immediately communicate to stakeholders that feature releases will slow down. (2) Review the incidents that burned the budget — are they the same root cause? (3) Shift sprint priorities to address the top reliability issues. (4) Require canary deployments for any remaining releases this month. (5) Set up a daily error budget check-in until the window resets.
        </HighlightBox>

        <NotesBox id="sre-error-budget" placeholder="Does your team use error budgets? How do they influence deployment decisions? Have you ever been in a 'budget freeze'?" />
      </Accordion>

      <Accordion title="Toil Reduction" icon={'\uD83D\uDD27'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Toil is manual, repetitive, automatable work that scales linearly with service size. Google's SRE book says: if an SRE team spends more than 50% of their time on toil, something is broken.
        </p>

        <HighlightBox type="info">
          <strong>What counts as toil:</strong><br />
          - Manually restarting pods that crash<br />
          - Manually rotating secrets or certificates<br />
          - Responding to the same alert repeatedly without fixing the underlying cause<br />
          - Manually running database migrations<br />
          - Copy-pasting config between environments<br /><br />
          <strong>What is NOT toil:</strong><br />
          - Incident response (novel problems require human judgment)<br />
          - Architecture design (creative work)<br />
          - On-call when things are quiet (availability isn't toil)
        </HighlightBox>

        <CompareTable
          headers={['Toil Example', 'Frequency', 'Time per Occurrence', 'Automation Solution']}
          rows={[
            ['Manually scaling pods for traffic spikes', 'Daily', '15 min', 'HPA/KEDA autoscaling'],
            ['Rotating expiring certificates', 'Quarterly', '2 hours', 'cert-manager with auto-renewal'],
            ['Creating namespaces for new teams', 'Monthly', '1 hour', 'Self-service platform / IDP'],
            ['Restarting pods after config changes', 'Weekly', '10 min', 'Reloader or stakater/reloader'],
            ['Manually approving deployments', 'Daily', '5 min', 'Automated canary with AnalysisTemplate'],
          ]}
        />

        <HighlightBox type="tip">
          <strong>Toil budget:</strong> Track how much time your team spends on toil vs engineering work. If toil is growing faster than your service, you have a scaling problem. The goal: automate yourself out of repetitive work so you can focus on reliability improvements.
        </HighlightBox>

        <NotesBox id="sre-toil" placeholder="What repetitive tasks have you automated? What's still toil on your team? What would you automate if you had time?" />
      </Accordion>

      <Accordion title="SRE vs DevOps — The Real Difference" icon={'\u2696\uFE0F'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          This comes up in interviews a lot. The short answer: DevOps is a culture/philosophy, SRE is a specific implementation of that philosophy with engineering practices.
        </p>

        <CompareTable
          headers={['Aspect', 'DevOps', 'SRE']}
          rows={[
            ['<strong>Origin</strong>', 'Community movement (~2008, Patrick Debois)', 'Google (~2003, Ben Treynor)'],
            ['<strong>Focus</strong>', 'Breaking down silos between Dev and Ops', 'Engineering approach to operations'],
            ['<strong>Reliability</strong>', '"Automate everything, move fast"', '"Set an SLO, use error budgets to balance speed and reliability"'],
            ['<strong>Metrics</strong>', 'DORA metrics (deploy frequency, lead time, MTTR, change failure rate)', 'SLIs/SLOs, error budgets, toil %'],
            ['<strong>Team Structure</strong>', 'Embedded in dev teams or platform team', 'Dedicated SRE team that works with dev teams'],
            ['<strong>On-Call</strong>', '"You build it, you run it"', 'SRE team shares on-call; can hand back pager if error budget is burned'],
            ['<strong>Best For</strong>', 'Any org wanting to improve delivery speed', 'Orgs at scale that need quantitative reliability management'],
          ]}
        />

        <HighlightBox type="info">
          <strong>The complement, not the competition:</strong> Most companies practice DevOps culture with some SRE practices. You don't need to choose one. Use DevOps principles (automation, shared ownership, CI/CD) and add SRE practices (SLOs, error budgets, toil tracking) when you need them.
        </HighlightBox>

        <NotesBox id="sre-vs-devops" placeholder="Is your team more DevOps or SRE? Do you have SLOs? Who owns reliability — dev teams or a dedicated team?" />
      </Accordion>

      <Accordion title="Interview Q&A — SRE Concepts & Error Budgets" icon={'\uD83C\uDFAF'}>
        <HighlightBox type="info">
          <strong>Q: Your service has a 99.9% SLO. You've burned 80% of your error budget in week 2. What do you do?</strong><br /><br />
          "First, I'd analyze <em>what</em> burned the budget — was it one big incident or many small ones? If it's one recurring issue, that's my top priority. I'd communicate to product/management that we're entering a reliability-focused sprint. Practically: (1) halt non-critical deploys, (2) require canary for anything that does deploy, (3) review and fix the top error-budget-burning issues, (4) set up daily error budget check-ins. The error budget exists so we can have this exact conversation — it's not a punishment, it's a signal that reliability needs investment right now."
        </HighlightBox>

        <HighlightBox type="info">
          <strong>Q: How do you decide what SLO to set for a new service?</strong><br /><br />
          "Start with user expectations, not technical aspirations. Ask: what's the consequence if this service is down for 1 hour? For an internal dashboard — 99% is fine (7 hours/month). For a payment API — 99.95% minimum. For a login service — 99.99% because everything depends on it. I also look at what the dependencies can deliver — if your database has a 99.95% SLA, your service mathematically can't be more reliable than that. Start conservative (99.9%), measure for a month, then adjust based on actual performance and business needs."
        </HighlightBox>

        <HighlightBox type="info">
          <strong>Q: What's the difference between SRE and DevOps? Why would a company choose one over the other?</strong><br /><br />
          "DevOps is a culture — shared ownership, automation, fast feedback loops. SRE is a specific practice — it takes the DevOps principles and adds quantitative rigor: SLOs, error budgets, toil measurement. Most companies practice DevOps culture and borrow SRE practices. A small startup doesn't need a dedicated SRE team — they need DevOps culture. A company running 50 microservices with millions of users needs the quantitative framework of SRE to make reliability decisions at scale."
        </HighlightBox>

        <HighlightBox type="info">
          <strong>Q: How do you measure toil, and what do you do about it?</strong><br /><br />
          "I'd track how much time the team spends on repetitive, manual, automatable tasks each sprint — literally log it. If toil is over 30-40%, it's eating into our ability to improve the system. I'd rank toil by frequency times time-per-occurrence, then automate the highest-impact items first. For example, if we spend 2 hours/week manually rotating secrets, that's 100 hours/year — worth investing a few days to set up cert-manager or ESO auto-rotation. The goal: keep toil under 50% of team capacity so there's always time for reliability engineering."
        </HighlightBox>

        <NotesBox id="sre-interview" placeholder="Customize these answers with your specific experience. Which SRE practices does your team actually use?" />
      </Accordion>
    </div>
  );
}
