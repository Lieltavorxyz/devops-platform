import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { URLS } from '../../config'
import './styles/index.css'
import Home from './pages/Home'
import Terraform from './pages/Terraform'
import Terragrunt from './pages/Terragrunt'
import K8sCore from './pages/K8sCore'
import K8sPatterns from './pages/K8sPatterns'
import ArgoCD from './pages/ArgoCD'
import ArgoRollouts from './pages/ArgoRollouts'
import AwsNetworking from './pages/AwsNetworking'
import AwsEks from './pages/AwsEks'
import AwsIam from './pages/AwsIam'
import Helm from './pages/Helm'
import Karpenter from './pages/Karpenter'
import Observability from './pages/Observability'
import CiCd from './pages/CiCd'
import Docker from './pages/Docker'
import Cost from './pages/Cost'
import Incident from './pages/Incident'
import Sre from './pages/Sre'
import Linux from './pages/Linux'
import Networking from './pages/Networking'
import MyNotes from './pages/MyNotes'
import RequestFlow from './pages/RequestFlow'
import EksInternals from './pages/EksInternals'
import Secrets from './pages/Secrets'
import SystemDesign from './pages/SystemDesign'

const NAV = [
  { group: 'Overview', items: [{ path: '/knowledge', label: 'Home', icon: '🏠' }] },
  { group: 'Infrastructure as Code', items: [
    { path: '/knowledge/terraform',  label: 'Terraform',  icon: '🏗️', badge: 'Core' },
    { path: '/knowledge/terragrunt', label: 'Terragrunt', icon: '🌿', badge: 'Core' },
  ]},
  { group: 'Kubernetes', items: [
    { path: '/knowledge/k8s-core',     label: 'Core Concepts',   icon: '⚙️', badge: 'Core' },
    { path: '/knowledge/k8s-patterns', label: 'Patterns & Design', icon: '📐' },
    { path: '/knowledge/helm',         label: 'Helm',             icon: '⛵' },
    { path: '/knowledge/karpenter',    label: 'Karpenter',        icon: '🎯' },
  ]},
  { group: 'GitOps', items: [
    { path: '/knowledge/argocd',        label: 'ArgoCD',        icon: '🐙', badge: 'Core' },
    { path: '/knowledge/argo-rollouts', label: 'Argo Rollouts', icon: '🚀' },
  ]},
  { group: 'AWS', items: [
    { path: '/knowledge/aws-networking', label: 'Networking',    icon: '🌐', badge: 'Core' },
    { path: '/knowledge/aws-eks',        label: 'EKS',          icon: '🚢' },
    { path: '/knowledge/aws-iam',        label: 'IAM & Security', icon: '🔐' },
  ]},
  { group: 'System Internals', items: [
    { path: '/knowledge/request-flow',  label: 'Request Flow',  icon: '🔁' },
    { path: '/knowledge/eks-internals', label: 'EKS Internals', icon: '🔬' },
  ]},
  { group: 'Security', items: [
    { path: '/knowledge/secrets', label: 'Secrets Management', icon: '🔑' },
  ]},
  { group: 'Observability', items: [
    { path: '/knowledge/observability', label: 'Prometheus & Grafana', icon: '📊' },
  ]},
  { group: 'CI/CD', items: [
    { path: '/knowledge/cicd', label: 'CI/CD Pipelines', icon: '⚙️' },
  ]},
  { group: 'Containers', items: [
    { path: '/knowledge/docker', label: 'Docker & Images', icon: '🐳' },
  ]},
  { group: 'Cost & Efficiency', items: [
    { path: '/knowledge/cost', label: 'Cost Optimization', icon: '💰' },
  ]},
  { group: 'Advanced Topics', items: [
    { path: '/knowledge/incident',   label: 'Incident Response',   icon: '🚨' },
    { path: '/knowledge/sre',        label: 'SRE Concepts',        icon: '📐' },
    { path: '/knowledge/linux',      label: 'Linux & OS',          icon: '🐧' },
    { path: '/knowledge/networking', label: 'Networking Deep Dive', icon: '🌍' },
  ]},
  { group: 'Interview Prep', items: [
    { path: '/knowledge/system-design', label: 'System Design Framework', icon: '📋' },
    { path: '/knowledge/my-notes',      label: 'My Notes',               icon: '📝' },
  ]},
]

function Sidebar({ isOpen, onClose }) {
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState({})

  const toggle = (group) => setCollapsed(c => ({ ...c, [group]: !c[group] }))

  return (
    <nav
      className={[
        'fixed left-0 top-12 z-40 flex h-[calc(100vh-3rem)] w-[272px] flex-col overflow-y-auto border-r transition-transform duration-200',
        'border-white/[0.07] bg-[#0f0f12]',
        'translate-x-0 lg:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ].join(' ')}
    >
      {/* Header */}
      <div className="border-b border-white/[0.06] px-4 pt-5 pb-4">
        <a
          href={URLS.portfolio}
          className="sidebar-portfolio-link hidden"
        >
          ← Portfolio
        </a>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
          <h1 className="text-[15px] font-bold text-zinc-100">DevOps KB</h1>
        </div>
        <p className="mt-0.5 text-[11px] text-zinc-600">Interview prep & deep reference</p>
      </div>

      {/* Search */}
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-zinc-900/60 px-3 py-2">
          <span className="text-sm text-zinc-600">🔍</span>
          <input
            type="text"
            placeholder="Search topics..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-zinc-300 outline-none placeholder:text-zinc-600"
          />
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto pb-6">
        {NAV.map(({ group, items }) => {
          const filtered = items.filter(i => !search || i.label.toLowerCase().includes(search.toLowerCase()))
          if (search && filtered.length === 0) return null
          return (
            <div key={group} className="mt-1">
              <button
                type="button"
                onClick={() => toggle(group)}
                className="flex w-full items-center justify-between px-4 py-1.5 text-left"
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-600">
                  {group}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-700">{items.length}</span>
                  <span
                    className={[
                      'text-[8px] text-zinc-700 transition-transform duration-150',
                      collapsed[group] ? '-rotate-90' : '',
                    ].join(' ')}
                  >
                    ▼
                  </span>
                </div>
              </button>
              {!collapsed[group] && filtered.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/knowledge'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    [
                      'mx-2 my-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors duration-100',
                      isActive
                        ? 'border-l-2 border-blue-500 bg-blue-950/50 text-blue-300 pl-[10px]'
                        : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200',
                    ].join(' ')
                  }
                >
                  <span className="text-sm leading-none">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="rounded-full bg-blue-950/60 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          )
        })}
      </div>
    </nav>
  )
}

function AppInner() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="flex min-h-screen bg-[#09090b]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(o => !o)}
        aria-label="Menu"
        className="fixed left-4 top-3 z-50 flex h-8 w-8 flex-col items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-zinc-900/80 lg:hidden"
        style={{ top: 'calc(0.75rem + 48px)' }}
      >
        <span className="h-px w-4 bg-zinc-400 transition-transform duration-150" />
        <span className="h-px w-4 bg-zinc-400 transition-opacity duration-150" />
        <span className="h-px w-4 bg-zinc-400 transition-transform duration-150" />
      </button>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <main className="min-h-screen flex-1 pt-12 lg:ml-[272px]">
        <div key={location.pathname} className="page-content animate-fade-in">
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
            <Route path="*" element={
              <div className="px-10 py-10 text-zinc-600">🚧 Section coming soon</div>
            } />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return <AppInner />
}
