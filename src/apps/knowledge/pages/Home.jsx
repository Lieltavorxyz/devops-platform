import { useNavigate } from 'react-router-dom';
import HighlightBox from '../components/HighlightBox';

const CARDS = [
  { path: '/terraform', icon: '\uD83C\uDFD7\uFE0F', title: 'Terraform', desc: 'State management, module design, remote backends, and drift detection patterns.', topics: ['State', 'Modules', 'Backends', 'Workspaces'] },
  { path: '/terragrunt', icon: '\uD83C\uDF3F', title: 'Terragrunt', desc: 'DRY infrastructure, folder structure, dependency management, and run-all patterns.', topics: ['DRY', 'Structure', 'Dependencies', 'Environments'] },
  { path: '/k8s-core', icon: '\u2638\uFE0F', title: 'Kubernetes', desc: 'Resource design, RBAC, HPA/KEDA, network policies, and multi-tenancy patterns.', topics: ['RBAC', 'HPA', 'Resources', 'Multi-tenancy'] },
  { path: '/argocd', icon: '\uD83D\uDC19', title: 'ArgoCD', desc: 'ApplicationSets, sync strategies, secrets management, and multi-cluster GitOps.', topics: ['GitOps', 'AppSets', 'Secrets', 'Sync Waves'] },
  { path: '/aws-networking', icon: '\uD83C\uDF10', title: 'AWS Networking', desc: 'VPC design, subnet strategy, routing, peering, and security group patterns.', topics: ['VPC', 'Subnets', 'TGW', 'Security Groups'] },
  { path: '/request-flow', icon: '\uD83D\uDD01', title: 'Request Flow', desc: "Full journey of a request: DNS \u2192 CDN \u2192 ALB \u2192 Ingress \u2192 Service \u2192 Pod \u2192 response. Every layer's job.", topics: ['DNS', 'CDN', 'ALB', 'Ingress'] },
  { path: '/secrets', icon: '\uD83D\uDD11', title: 'Secrets Management', desc: 'ESO, IRSA, Vault, AWS SM \u2014 how secrets reach pods securely without touching Git.', topics: ['ESO', 'IRSA', 'Vault', 'Dynamic Secrets'] },
  { path: '/helm', icon: '\u26F5', title: 'Helm', desc: 'Chart structure, templating patterns, lifecycle management, and hooks.', topics: ['Charts', 'Values', 'Hooks', 'Rollback'] },
  { path: '/observability', icon: '\uD83D\uDCCA', title: 'Observability', desc: 'Prometheus, Grafana, Loki \u2014 metrics, dashboards, log aggregation, and alerting.', topics: ['Prometheus', 'Grafana', 'Loki', 'PromQL'] },
  { path: '/cicd', icon: '\u2699\uFE0F', title: 'CI/CD Pipelines', desc: 'GitHub Actions, pipeline stages, OIDC auth to AWS, GitOps vs push-based CD.', topics: ['GitHub Actions', 'Stages', 'OIDC', 'GitOps CD'] },
  { path: '/karpenter', icon: '\uD83C\uDFAF', title: 'Karpenter', desc: 'Flexible node provisioner \u2014 spot handling, NodePool config, vs Cluster Autoscaler.', topics: ['NodePool', 'Spot', 'Consolidation', 'EC2 Fleet'] },
  { path: '/cost', icon: '\uD83D\uDCB0', title: 'Cost Optimization', desc: 'Spot instances, right-sizing, scale-to-zero with KEDA, and Savings Plans.', topics: ['Spot', 'Right-sizing', 'KEDA', 'NTH'] },
  { path: '/argo-rollouts', icon: '\uD83D\uDE80', title: 'Argo Rollouts', desc: 'Canary, blue-green, and automated analysis \u2014 deploy safely with traffic control.', topics: ['Canary', 'Blue-Green', 'Analysis', 'Rollback'] },
  { path: '/docker', icon: '\uD83D\uDC33', title: 'Docker & Containers', desc: 'Multi-stage builds, layer caching, image security, and scanning with Trivy.', topics: ['Multi-stage', 'Layer Cache', 'Trivy', 'Distroless'] },
  { path: '/eks-internals', icon: '\uD83D\uDD2C', title: 'EKS Internals', desc: 'Control plane vs data plane, VPC CNI networking, and what happens on every kubectl apply.', topics: ['etcd', 'VPC CNI', 'kubelet', 'kubectl'] },
  { path: '/system-design', icon: '\uD83D\uDCCB', title: 'System Design Framework', desc: 'How to approach, structure, and communicate system design answers in interviews.', topics: ['Framework', 'Templates', 'Tradeoffs'] },
  { path: '/incident', icon: '\uD83D\uDEA8', title: 'Incident Response', desc: 'On-call runbooks, 5-whys RCA, postmortem format, and debugging CrashLooping pods step by step.', topics: ['Runbook', 'RCA', 'Postmortem', 'Debugging'] },
  { path: '/sre', icon: '\uD83D\uDCD0', title: 'SRE Concepts', desc: 'SLI/SLO/SLA with real examples, error budgets, toil reduction, and the SRE vs DevOps distinction.', topics: ['SLO/SLA', 'Error Budgets', 'Toil', 'Reliability'] },
  { path: '/linux', icon: '\uD83D\uDC27', title: 'Linux & OS Fundamentals', desc: 'Cgroups, namespaces, iptables, and file descriptors \u2014 the kernel primitives behind containers and K8s.', topics: ['cgroups', 'Namespaces', 'iptables', 'File Descriptors'] },
  { path: '/networking', icon: '\uD83C\uDF0D', title: 'Networking Deep Dive', desc: 'DNS resolution, TCP handshake, TLS setup, and CDN mechanics \u2014 from URL to response.', topics: ['DNS', 'TCP/IP', 'TLS', 'CDN'] },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div>
      <div className="home-hero">
        <div className="page-badge">Interview Prep Platform</div>
        <h1>DevOps Knowledge Base</h1>
        <p>Interview prep & deep reference — built around the 'why', not just the 'what'.</p>
        <div className="stat-line">
          <span className="dot"></span>
          {CARDS.length} sections available
        </div>
      </div>

      <HighlightBox type="tip">
        <strong>Quick Start:</strong> Use the sidebar to navigate sections. Each section has a Reasoning Map, real code examples, and Interview Q&A.
      </HighlightBox>

      <div id="progress-tracker">
        <div className="pt-label"><strong>0</strong> / <strong>0</strong> experience notes filled in</div>
        <div id="progress-bar-wrap"><div id="progress-bar" style={{width:'0%'}}></div></div>
        <div id="progress-pct">0%</div>
      </div>

      <div className="home-grid">
        {CARDS.map(card => (
          <div className="home-card" key={card.path} onClick={() => navigate(card.path)}>
            <div className="hc-icon">{card.icon}</div>
            <h3>{card.title}</h3>
            <p>{card.desc}</p>
            <div className="hc-topics">
              {card.topics.map(t => <span className="hc-topic" key={t}>{t}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
