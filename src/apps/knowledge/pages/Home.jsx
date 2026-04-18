import { useNavigate } from 'react-router-dom';
import {
  Layers, FolderTree, Ship, Layout, Package, Cpu,
  GitPullRequest, GitMerge, Network, Cloud, Shield,
  ArrowRightLeft, Microscope, KeyRound, BarChart2,
  Workflow, Box, TrendingDown, AlertTriangle, Target,
  Terminal, Globe, ChevronRight,
} from 'lucide-react';

const SECTIONS = [
  {
    group: 'Infrastructure as Code',
    items: [
      { path: '/knowledge/terraform',  Icon: Layers,    title: 'Terraform',   desc: 'State management, module design, remote backends, drift detection.', topics: ['State', 'Modules', 'Backends', 'Workspaces'] },
      { path: '/knowledge/terragrunt', Icon: FolderTree, title: 'Terragrunt', desc: 'DRY infrastructure, folder hierarchy, dependency management, run-all.', topics: ['DRY', 'Structure', 'Dependencies', 'Environments'] },
    ],
  },
  {
    group: 'Kubernetes',
    items: [
      { path: '/knowledge/k8s-core',     Icon: Ship,    title: 'Core Concepts',     desc: 'Resources, RBAC, HPA/KEDA, network policies, multi-tenancy.', topics: ['RBAC', 'HPA', 'Scheduling', 'Multi-tenancy'] },
      { path: '/knowledge/k8s-patterns', Icon: Layout,  title: 'Patterns & Design', desc: 'Sidecar, init containers, topology constraints, workload patterns.', topics: ['Sidecar', 'Init Containers', 'Affinity', 'Topology'] },
      { path: '/knowledge/helm',         Icon: Package, title: 'Helm',              desc: 'Chart structure, templating patterns, lifecycle management, hooks.', topics: ['Charts', 'Values', 'Hooks', 'Rollback'] },
      { path: '/knowledge/karpenter',    Icon: Cpu,     title: 'Karpenter',         desc: 'Node provisioner — Spot handling, NodePool config, vs Cluster Autoscaler.', topics: ['NodePool', 'Spot', 'Consolidation', 'EC2 Fleet'] },
    ],
  },
  {
    group: 'GitOps',
    items: [
      { path: '/knowledge/argocd',        Icon: GitPullRequest, title: 'ArgoCD',        desc: 'ApplicationSets, sync strategies, secrets management, multi-cluster.', topics: ['GitOps', 'AppSets', 'Sync Waves', 'Multi-cluster'] },
      { path: '/knowledge/argo-rollouts', Icon: GitMerge,       title: 'Argo Rollouts', desc: 'Canary, blue-green, automated analysis — progressive delivery.', topics: ['Canary', 'Blue-Green', 'Analysis', 'Rollback'] },
    ],
  },
  {
    group: 'AWS',
    items: [
      { path: '/knowledge/aws-networking', Icon: Network, title: 'Networking',    desc: 'VPC design, subnet strategy, routing, TGW, security group patterns.', topics: ['VPC', 'Subnets', 'TGW', 'Security Groups'] },
      { path: '/knowledge/aws-eks',        Icon: Cloud,   title: 'EKS',           desc: 'Managed K8s on AWS — node groups, add-ons, access entries, upgrades.', topics: ['Node Groups', 'Add-ons', 'Access Entries', 'Upgrades'] },
      { path: '/knowledge/aws-iam',        Icon: Shield,  title: 'IAM & Security', desc: 'IAM roles, policies, IRSA, SCPs, cross-account access patterns.', topics: ['Roles', 'Policies', 'IRSA', 'SCP'] },
    ],
  },
  {
    group: 'System Internals',
    items: [
      { path: '/knowledge/request-flow',  Icon: ArrowRightLeft, title: 'Request Flow',  desc: 'DNS → CDN → ALB → Ingress → Service → Pod → response. Every layer.', topics: ['DNS', 'CDN', 'ALB', 'Ingress'] },
      { path: '/knowledge/eks-internals', Icon: Microscope,     title: 'EKS Internals', desc: 'Control plane vs data plane, VPC CNI, what happens on every kubectl apply.', topics: ['etcd', 'VPC CNI', 'kubelet', 'kubectl'] },
    ],
  },
  {
    group: 'Security',
    items: [
      { path: '/knowledge/secrets', Icon: KeyRound, title: 'Secrets Management', desc: 'ESO, IRSA, Vault, AWS SM — secrets reaching pods without touching Git.', topics: ['ESO', 'IRSA', 'Vault', 'Dynamic Secrets'] },
    ],
  },
  {
    group: 'Observability',
    items: [
      { path: '/knowledge/observability', Icon: BarChart2, title: 'Prometheus & Grafana', desc: 'Metrics, dashboards, log aggregation, alerting, and PromQL.', topics: ['Prometheus', 'Grafana', 'Loki', 'PromQL'] },
    ],
  },
  {
    group: 'CI/CD',
    items: [
      { path: '/knowledge/cicd', Icon: Workflow, title: 'CI/CD Pipelines', desc: 'GitHub Actions, pipeline stages, OIDC auth to AWS, GitOps vs push-based CD.', topics: ['GitHub Actions', 'OIDC', 'Stages', 'GitOps CD'] },
    ],
  },
  {
    group: 'Containers',
    items: [
      { path: '/knowledge/docker', Icon: Box, title: 'Docker & Containers', desc: 'Multi-stage builds, layer caching, image security, scanning with Trivy.', topics: ['Multi-stage', 'Layer Cache', 'Trivy', 'Distroless'] },
    ],
  },
  {
    group: 'Cost & Efficiency',
    items: [
      { path: '/knowledge/cost', Icon: TrendingDown, title: 'Cost Optimization', desc: 'Spot instances, right-sizing, scale-to-zero with KEDA, Savings Plans.', topics: ['Spot', 'Right-sizing', 'KEDA', 'NTH'] },
    ],
  },
  {
    group: 'Advanced Topics',
    items: [
      { path: '/knowledge/incident',   Icon: AlertTriangle, title: 'Incident Response',     desc: 'On-call runbooks, 5-whys RCA, postmortem format, debugging crashes.', topics: ['Runbook', 'RCA', 'Postmortem', 'Debugging'] },
      { path: '/knowledge/sre',        Icon: Target,        title: 'SRE Concepts',          desc: 'SLI/SLO/SLA, error budgets, toil reduction, reliability engineering.', topics: ['SLO/SLA', 'Error Budgets', 'Toil', 'Reliability'] },
      { path: '/knowledge/linux',      Icon: Terminal,      title: 'Linux & OS',            desc: 'Cgroups, namespaces, iptables, file descriptors — container primitives.', topics: ['cgroups', 'Namespaces', 'iptables', 'File Descriptors'] },
      { path: '/knowledge/networking', Icon: Globe,         title: 'Networking Deep Dive',  desc: 'DNS resolution, TCP handshake, TLS setup, CDN mechanics.', topics: ['DNS', 'TCP/IP', 'TLS', 'CDN'] },
    ],
  },
];

const totalSections = SECTIONS.reduce((acc, s) => acc + s.items.length, 0);

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="kb-home">
      <div className="kb-hero">
        <h1>DevOps Knowledge Base</h1>
        <p>Deep reference across the full DevOps stack — the why, not just the what.</p>
        <div className="kb-hero-meta">
          <span className="kb-hero-stat">{totalSections} sections</span>
          <span className="kb-hero-stat">{SECTIONS.length} categories</span>
        </div>
      </div>

      {SECTIONS.map(({ group, items }) => (
        <div key={group} className="kb-section">
          <div className="kb-section-header">
            <span className="kb-section-title">{group}</span>
            <span className="kb-section-count">{items.length}</span>
          </div>
          <div className={`kb-cards kb-cards--${items.length === 1 ? 'single' : items.length === 3 ? 'three' : 'two'}`}>
            {items.map(({ path, Icon, title, desc, topics }) => (
              <button
                key={path}
                className="kb-card"
                onClick={() => navigate(path)}
                type="button"
              >
                <div className="kb-card-top">
                  <div className="kb-card-icon">
                    <Icon size={18} strokeWidth={1.75} />
                  </div>
                  <div className="kb-card-title-row">
                    <span className="kb-card-title">{title}</span>
                    <ChevronRight size={14} className="kb-card-arrow" />
                  </div>
                </div>
                <p className="kb-card-desc">{desc}</p>
                <div className="kb-card-topics">
                  {topics.map(t => <span key={t} className="kb-topic">{t}</span>)}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
