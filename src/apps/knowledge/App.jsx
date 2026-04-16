import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
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
import MyNotes from './pages/MyNotes';
import RequestFlow from './pages/RequestFlow';
import EksInternals from './pages/EksInternals';
import Secrets from './pages/Secrets';
import SystemDesign from './pages/SystemDesign';

const NAV = [
  { group: 'Overview', items: [{ path: '/knowledge', label: 'Home', icon: '\uD83C\uDFE0' }] },
  { group: 'Infrastructure as Code', items: [
    { path: '/knowledge/terraform', label: 'Terraform', icon: '\uD83C\uDFD7\uFE0F', badge: 'Core' },
    { path: '/knowledge/terragrunt', label: 'Terragrunt', icon: '\uD83C\uDF3F', badge: 'Core' },
  ]},
  { group: 'Kubernetes', items: [
    { path: '/knowledge/k8s-core', label: 'Core Concepts', icon: '\u2638\uFE0F', badge: 'Core' },
    { path: '/knowledge/k8s-patterns', label: 'Patterns & Design', icon: '\uD83D\uDCD0' },
    { path: '/knowledge/helm', label: 'Helm', icon: '\u26F5' },
    { path: '/knowledge/karpenter', label: 'Karpenter', icon: '\uD83C\uDFAF' },
  ]},
  { group: 'GitOps', items: [
    { path: '/knowledge/argocd', label: 'ArgoCD', icon: '\uD83D\uDC19', badge: 'Core' },
    { path: '/knowledge/argo-rollouts', label: 'Argo Rollouts', icon: '\uD83D\uDE80' },
  ]},
  { group: 'AWS', items: [
    { path: '/knowledge/aws-networking', label: 'Networking', icon: '\uD83C\uDF10', badge: 'Core' },
    { path: '/knowledge/aws-eks', label: 'EKS', icon: '\uD83D\uDEA2' },
    { path: '/knowledge/aws-iam', label: 'IAM & Security', icon: '\uD83D\uDD10' },
  ]},
  { group: 'System Internals', items: [
    { path: '/knowledge/request-flow', label: 'Request Flow', icon: '\uD83D\uDD01' },
    { path: '/knowledge/eks-internals', label: 'EKS Internals', icon: '\uD83D\uDD2C' },
  ]},
  { group: 'Security', items: [
    { path: '/knowledge/secrets', label: 'Secrets Management', icon: '\uD83D\uDD11' },
  ]},
  { group: 'Observability', items: [
    { path: '/knowledge/observability', label: 'Prometheus & Grafana', icon: '\uD83D\uDCCA' },
  ]},
  { group: 'CI/CD', items: [
    { path: '/knowledge/cicd', label: 'CI/CD Pipelines', icon: '\u2699\uFE0F' },
  ]},
  { group: 'Containers', items: [
    { path: '/knowledge/docker', label: 'Docker & Images', icon: '\uD83D\uDC33' },
  ]},
  { group: 'Cost & Efficiency', items: [
    { path: '/knowledge/cost', label: 'Cost Optimization', icon: '\uD83D\uDCB0' },
  ]},
  { group: 'Advanced Topics', items: [
    { path: '/knowledge/incident', label: 'Incident Response', icon: '\uD83D\uDEA8' },
    { path: '/knowledge/sre', label: 'SRE Concepts', icon: '\uD83D\uDCD0' },
    { path: '/knowledge/linux', label: 'Linux & OS', icon: '\uD83D\uDC27' },
    { path: '/knowledge/networking', label: 'Networking Deep Dive', icon: '\uD83C\uDF0D' },
  ]},
  { group: 'Interview Prep', items: [
    { path: '/knowledge/system-design', label: 'System Design Framework', icon: '\uD83D\uDCCB' },
    { path: '/knowledge/my-notes', label: 'My Notes', icon: '\uD83D\uDCDD' },
  ]},
];

function Sidebar({ isOpen, onClose }) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState({});

  const toggle = (group) => setCollapsed(c => ({...c, [group]: !c[group]}));

  return (
    <nav id="sidebar" className={isOpen ? 'sidebar-open' : undefined}>
      <div id="sidebar-header">
        <a href="/" className="sidebar-portfolio-link">← Portfolio</a>
        <h1>
          <span className="header-dot"></span>
          DevOps KB
        </h1>
        <p>Interview prep & deep reference</p>
      </div>
      <div className="search-wrap">
        <span className="search-icon">{'\uD83D\uDD0D'}</span>
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
                <span className="nav-collapse-arrow" style={{transform: collapsed[group] ? 'rotate(-90deg)' : 'none'}}>{'\u25BC'}</span>
              </span>
            </div>
            {!collapsed[group] && filtered.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                onClick={onClose}
              >
                <span className="nav-icon">{item.icon}</span>
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
            <Route path="my-notes" element={<MyNotes />} />
            <Route path="request-flow" element={<RequestFlow />} />
            <Route path="eks-internals" element={<EksInternals />} />
            <Route path="secrets" element={<Secrets />} />
            <Route path="system-design" element={<SystemDesign />} />
            <Route path="*" element={<div style={{padding:'40px',color:'var(--text-3)'}}>{'\uD83D\uDEA7'} Section coming soon</div>} />
          </Routes>
        </div>
      </main>
    </>
  );
}

export default function App() {
  return <AppInner />;
}
