import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  Home as HomeIcon, Layers, FolderTree, Ship, Layout, Package, Cpu,
  GitPullRequest, GitMerge, Network, Cloud, Shield,
  ArrowRightLeft, Microscope, KeyRound, BarChart2,
  Workflow, Box, TrendingDown, AlertTriangle, Target,
  Terminal, Globe, Search,
} from 'lucide-react';
import { URLS } from '../../config';
import './styles/index.css';
import Home from './pages/Home';
import Terraform from './pages/Terraform';
import Terragrunt from './pages/Terragrunt';
import K8sCore from './pages/K8sCore';
import K8sPatterns from './pages/K8sPatterns';
import ArgoCD from './pages/ArgoCD';
import ArgoRollouts from './pages/ArgoRollouts';
import AwsNetworking from './pages/AwsNetworking';
import AwsEks from './pages/AwsEks';
import AwsIam from './pages/AwsIam';
import Helm from './pages/Helm';
import Karpenter from './pages/Karpenter';
import Observability from './pages/Observability';
import CiCd from './pages/CiCd';
import Docker from './pages/Docker';
import Cost from './pages/Cost';
import Incident from './pages/Incident';
import Sre from './pages/Sre';
import Linux from './pages/Linux';
import Networking from './pages/Networking';
import RequestFlow from './pages/RequestFlow';
import EksInternals from './pages/EksInternals';
import Secrets from './pages/Secrets';

const NAV = [
  { group: 'Overview', items: [
    { path: '/knowledge', label: 'Home', Icon: HomeIcon },
  ]},
  { group: 'Infrastructure as Code', items: [
    { path: '/knowledge/terraform',  label: 'Terraform',  Icon: Layers,    badge: 'Core' },
    { path: '/knowledge/terragrunt', label: 'Terragrunt', Icon: FolderTree, badge: 'Core' },
  ]},
  { group: 'Kubernetes', items: [
    { path: '/knowledge/k8s-core',     label: 'Core Concepts',   Icon: Ship,    badge: 'Core' },
    { path: '/knowledge/k8s-patterns', label: 'Patterns & Design', Icon: Layout },
    { path: '/knowledge/helm',         label: 'Helm',            Icon: Package },
    { path: '/knowledge/karpenter',    label: 'Karpenter',       Icon: Cpu },
  ]},
  { group: 'GitOps', items: [
    { path: '/knowledge/argocd',        label: 'ArgoCD',        Icon: GitPullRequest, badge: 'Core' },
    { path: '/knowledge/argo-rollouts', label: 'Argo Rollouts', Icon: GitMerge },
  ]},
  { group: 'AWS', items: [
    { path: '/knowledge/aws-networking', label: 'Networking',    Icon: Network, badge: 'Core' },
    { path: '/knowledge/aws-eks',        label: 'EKS',           Icon: Cloud },
    { path: '/knowledge/aws-iam',        label: 'IAM & Security', Icon: Shield },
  ]},
  { group: 'System Internals', items: [
    { path: '/knowledge/request-flow',   label: 'Request Flow',  Icon: ArrowRightLeft },
    { path: '/knowledge/eks-internals',  label: 'EKS Internals', Icon: Microscope },
  ]},
  { group: 'Security', items: [
    { path: '/knowledge/secrets', label: 'Secrets Management', Icon: KeyRound },
  ]},
  { group: 'Observability', items: [
    { path: '/knowledge/observability', label: 'Prometheus & Grafana', Icon: BarChart2 },
  ]},
  { group: 'CI/CD', items: [
    { path: '/knowledge/cicd', label: 'CI/CD Pipelines', Icon: Workflow },
  ]},
  { group: 'Containers', items: [
    { path: '/knowledge/docker', label: 'Docker & Images', Icon: Box },
  ]},
  { group: 'Cost & Efficiency', items: [
    { path: '/knowledge/cost', label: 'Cost Optimization', Icon: TrendingDown },
  ]},
  { group: 'Advanced Topics', items: [
    { path: '/knowledge/incident',   label: 'Incident Response',    Icon: AlertTriangle },
    { path: '/knowledge/sre',        label: 'SRE Concepts',         Icon: Target },
    { path: '/knowledge/linux',      label: 'Linux & OS',           Icon: Terminal },
    { path: '/knowledge/networking', label: 'Networking Deep Dive', Icon: Globe },
  ]},
];

function Sidebar({ isOpen, onClose }) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState({});

  const toggle = (group) => setCollapsed(c => ({ ...c, [group]: !c[group] }));

  return (
    <nav id="sidebar" className={isOpen ? 'sidebar-open' : undefined}>
      <div id="sidebar-header">
        <a href={URLS.portfolio} className="sidebar-portfolio-link">← Portfolio</a>
        <h1>
          <span className="header-dot"></span>
          DevOps KB
        </h1>
        <p>Deep reference for the full stack</p>
      </div>
      <div className="search-wrap">
        <Search size={13} className="search-icon-svg" />
        <input
          type="text"
          id="search-box"
          placeholder="Search topics..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      {NAV.map(({ group, items }) => {
        const filtered = items.filter(i => !search || i.label.toLowerCase().includes(search.toLowerCase()));
        if (search && filtered.length === 0) return null;
        return (
          <div className="nav-section" key={group}>
            <div className="nav-section-title" onClick={() => toggle(group)}>
              <span>{group}</span>
              <span className="nav-group-meta">
                <span className="nav-count">{items.length}</span>
                <span className="nav-collapse-arrow" style={{ transform: collapsed[group] ? 'rotate(-90deg)' : 'none' }}>▼</span>
              </span>
            </div>
            {!collapsed[group] && filtered.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/knowledge'}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                onClick={onClose}
              >
                <span className="nav-icon"><item.Icon size={14} strokeWidth={1.75} /></span>
                {item.label}
                {item.badge && <span className="progress-badge">{item.badge}</span>}
              </NavLink>
            ))}
          </div>
        );
      })}
    </nav>
  );
}

function AppInner() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <button className="hamburger" onClick={() => setSidebarOpen(o => !o)} aria-label="Menu">
        <span /><span /><span />
      </button>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main id="main">
        <div key={location.pathname} className="page-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="terraform" element={<Terraform />} />
            <Route path="terragrunt" element={<Terragrunt />} />
            <Route path="k8s-core" element={<K8sCore />} />
            <Route path="k8s-patterns" element={<K8sPatterns />} />
            <Route path="argocd" element={<ArgoCD />} />
            <Route path="argo-rollouts" element={<ArgoRollouts />} />
            <Route path="aws-networking" element={<AwsNetworking />} />
            <Route path="aws-eks" element={<AwsEks />} />
            <Route path="aws-iam" element={<AwsIam />} />
            <Route path="helm" element={<Helm />} />
            <Route path="karpenter" element={<Karpenter />} />
            <Route path="observability" element={<Observability />} />
            <Route path="cicd" element={<CiCd />} />
            <Route path="docker" element={<Docker />} />
            <Route path="cost" element={<Cost />} />
            <Route path="incident" element={<Incident />} />
            <Route path="sre" element={<Sre />} />
            <Route path="linux" element={<Linux />} />
            <Route path="networking" element={<Networking />} />
            <Route path="request-flow" element={<RequestFlow />} />
            <Route path="eks-internals" element={<EksInternals />} />
            <Route path="secrets" element={<Secrets />} />
            <Route path="*" element={<div style={{ padding: '40px', color: 'var(--text-3)' }}>Section coming soon</div>} />
          </Routes>
        </div>
      </main>
    </>
  );
}

export default function App() {
  return <AppInner />;
}
