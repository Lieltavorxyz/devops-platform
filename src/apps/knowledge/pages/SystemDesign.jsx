import Accordion from '../components/Accordion';
import HighlightBox from '../components/HighlightBox';

export default function SystemDesign() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">{'\uD83D\uDCCB'} Interview Prep</div>
        <h1>System Design Framework</h1>
        <p>How to approach, structure, and communicate system design answers — for senior DevOps and platform engineering interviews.</p>
      </div>

      <HighlightBox type="tip">Interview context: High-scale environments with many teams, likely multi-cluster or multi-account AWS, strong cost-awareness culture. Every design decision should be explainable in terms of scale, team autonomy, and blast radius isolation.</HighlightBox>

      <Accordion title="The Framework (use for every question)" icon={'\uD83D\uDDC2\uFE0F'} defaultOpen={true}>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Step 1 — Clarify requirements first.</span> Ask: scale (RPS, data size), SLA, team size, on-call model, existing constraints. Never start drawing before this.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Step 2 — State your assumptions.</span> "I'll assume this is an EKS-on-AWS environment with ArgoCD for deployment." This shows expertise and sets context.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Step 3 — Top-down design:</span> Networking {'\u2192'} Compute {'\u2192'} Data {'\u2192'} Observability {'\u2192'} CI/CD. Don't jump to implementation details before the architecture.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Step 4 — Be opinionated and explain tradeoffs.</span> "I'd use X because Y, the alternative Z would make sense if W." This is what separates senior engineers from juniors.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Step 5 — Address failure modes.</span> "What happens if this component fails?" Shows operational maturity.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Step 6 — Mention what you'd do differently with more time.</span> Shows self-awareness and depth of knowledge beyond the immediate solution.</div>
          </li>
        </ul>
      </Accordion>

      <Accordion title="Likely Interview Topics" icon={'\uD83C\uDFAF'}>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">"Design infra for a new microservice"</span> — VPC/subnets, EKS namespace, Helm chart, ArgoCD app, HPA, PDB, IRSA for AWS access, observability stack hookup.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">"How would you handle multi-tenancy in K8s?"</span> — Namespace isolation, RBAC per team, resource quotas/LimitRanges, network policies, separate node pools for sensitive workloads.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">"How do you manage infra across many environments?"</span> — Terragrunt folder structure, ArgoCD ApplicationSets, environment promotion strategy.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">"How do you handle a gradual rollout?"</span> — ArgoCD + Argo Rollouts canary/blue-green, analysis templates based on metrics, automatic rollback on error rate.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">"How would you reduce infra costs?"</span> — Karpenter spot instances, KEDA scale-to-zero, rightsizing with VPA, S3 lifecycle policies, Reserved/Savings Plans analysis.</div>
          </li>
        </ul>
      </Accordion>

      <Accordion title="Honest Answer Templates" icon={'\uD83D\uDCAC'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          For things you used but didn't design:
        </p>
        <HighlightBox>"The architecture I worked in used [X]. After working with it closely I understood why — specifically [reason]. If I were designing it from scratch I would [same or different approach] because [reasoning]."</HighlightBox>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12, marginTop:16}}>
          For things you genuinely don't know:
        </p>
        <HighlightBox>"I haven't worked with that specific tool, but the problem it solves sounds similar to [X] which I have used. My approach would be [reasoning from first principles]."</HighlightBox>
      </Accordion>
    </div>
  );
}
