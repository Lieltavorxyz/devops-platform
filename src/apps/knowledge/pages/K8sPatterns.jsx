import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import HighlightBox from '../components/HighlightBox';
import CodeBlock from '../components/CodeBlock';
import CompareTable from '../components/CompareTable';
import { Layers, Network, Shield, Lock, Server, Settings } from 'lucide-react';

export default function K8sPatterns() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">Kubernetes</div>
        <h1>Kubernetes — Patterns and Design</h1>
        <p>Multi-tenancy, network isolation, pod security, and the operational decisions that separate a hobby cluster from a production platform.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'The Multi-Tenancy Problem',
          body: 'A single EKS cluster serving 20 teams is operationally efficient but a blast radius nightmare. One team with no resource limits can starve others. One misconfigured pod can reach across namespaces. Getting isolation right requires NetworkPolicy, RBAC, ResourceQuota, and Pod Security Standards all working together.'
        },
        {
          title: 'Isolation is Layered',
          body: 'No single Kubernetes primitive provides complete isolation. NetworkPolicy controls traffic. RBAC controls API access. ResourceQuota controls resource consumption. Pod Security Standards control what pods can do at the OS level. You need all four. Miss one and the isolation leaks.'
        }
      ]} />

      <Accordion title="Namespace Strategy — How to Slice a Cluster" icon={Layers} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The namespace strategy you choose must reflect your blast radius tolerance, team ownership model, and cost of operating multiple clusters. There is no universally right answer.
        </p>
        <CompareTable
          headers={['Strategy', 'Structure', 'Best For', 'Production Gotcha']}
          rows={[
            ['Per-environment', 'ns: dev, staging, prod', 'Tiny teams, fewer than 5 services', 'Dev and prod share a cluster — any cluster-level issue (etcd pressure, control plane incidents) affects prod'],
            ['Per-team', 'ns: team-payments, team-auth', 'Internal platform, homogeneous envs', 'Team-a prod and team-a dev coexist — no environment isolation'],
            ['Per-team-per-env', 'ns: payments-prod, payments-staging', 'Mid-size orgs, 5-20 teams', 'Namespace sprawl becomes hard to manage above 100 namespaces without HNC or a namespace controller'],
            ['Per-service', 'ns: payments, auth, gateway', 'Strict security domain separation', 'RBAC and NetworkPolicy explosion; management overhead scales with service count'],
          ]}
        />
        <HighlightBox type="tip">Per-team-per-env with a naming convention like <code>team-env</code> is the most common pattern at growth-stage companies. Enforce the convention in Terraform. Platform team owns a separate <code>platform</code> namespace. Use Hierarchical Namespace Controller (HNC) if namespace sprawl becomes a problem — it lets you create sub-namespaces that inherit policies from a parent.</HighlightBox>
        <CodeBlock language="yaml">
{`# Namespace with labels used by NetworkPolicy and Pod Security Standards
apiVersion: v1
kind: Namespace
metadata:
  name: payments-prod
  labels:
    team: payments
    environment: prod
    # Pod Security Standards enforcement at namespace level
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/audit: restricted
    # Used by NetworkPolicy selectors
    kubernetes.io/metadata.name: payments-prod`}
        </CodeBlock>
      </Accordion>

      <Accordion title="NetworkPolicy — Default-Deny and Surgical Allow" icon={Network}>
        <HighlightBox type="warn">Default Kubernetes behavior: all pods can communicate with all pods in the cluster, across any namespace. No NetworkPolicy means a fully open mesh. This is acceptable for development but a security violation in production.</HighlightBox>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          NetworkPolicy is enforced by the CNI plugin, not kube-proxy. On EKS with VPC CNI, you must enable network policy support explicitly — it is disabled by default. Confirm with <code>kubectl get networkpolicy -A</code> and check if CNI has the network policy feature gate enabled.
        </p>
        <CodeBlock language="yaml">
{`# Step 1: Default deny-all in the namespace (essential baseline)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: payments-prod
spec:
  podSelector: {}       # matches ALL pods in namespace
  policyTypes:
    - Ingress
    - Egress
---
# Step 2: Allow payments API to receive from ingress-nginx only
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-nginx
  namespace: payments-prod
spec:
  podSelector:
    matchLabels:
      app: payments-api
  policyTypes: [Ingress]
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8080
---
# Step 3: Allow payments API to call auth service in auth-prod namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-call-auth
  namespace: payments-prod
spec:
  podSelector:
    matchLabels:
      app: payments-api
  policyTypes: [Egress]
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: auth-prod
          podSelector:
            matchLabels:
              app: auth-service
      ports:
        - protocol: TCP
          port: 8080
---
# Step 4: Allow DNS — never forget this or nothing resolves
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
  namespace: payments-prod
spec:
  podSelector: {}
  policyTypes: [Egress]
  egress:
    - ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53`}
        </CodeBlock>
        <HighlightBox type="warn">The single most common NetworkPolicy mistake: applying default-deny and forgetting the DNS allow rule. Every pod immediately stops resolving any hostname. The error looks like a network timeout or connection refused, not a DNS error. Always add the DNS egress policy when applying default-deny.</HighlightBox>
        <HighlightBox type="tip">Use <code>namespaceSelector</code> with label-based matching rather than hardcoding namespace names. This makes policies portable across environments where namespace names may differ. The label <code>kubernetes.io/metadata.name</code> is automatically set by Kubernetes on every namespace and is immutable.</HighlightBox>
      </Accordion>

      <Accordion title="ResourceQuota and LimitRange" icon={Settings}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          ResourceQuota caps the total resource consumption of a namespace. LimitRange sets per-container defaults and maximums. Both are needed — one without the other leaves gaps.
        </p>
        <CodeBlock language="yaml">
{`# ResourceQuota: total namespace resource cap
apiVersion: v1
kind: ResourceQuota
metadata:
  name: payments-quota
  namespace: payments-prod
spec:
  hard:
    requests.cpu: "16"
    requests.memory: 32Gi
    limits.cpu: "32"
    limits.memory: 64Gi
    pods: "50"
    services: "20"
    persistentvolumeclaims: "10"
---
# LimitRange: per-container defaults and bounds
apiVersion: v1
kind: LimitRange
metadata:
  name: payments-limits
  namespace: payments-prod
spec:
  limits:
    - type: Container
      default:           # applied when container has no limits set
        cpu: 500m
        memory: 512Mi
      defaultRequest:    # applied when container has no requests set
        cpu: 100m
        memory: 128Mi
      max:               # containers cannot exceed this
        cpu: "4"
        memory: 4Gi
      min:               # containers must request at least this
        cpu: 50m
        memory: 64Mi`}
        </CodeBlock>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">ResourceQuota + LimitRange interaction:</span> If you have a ResourceQuota but no LimitRange, pods without explicit resource requests are rejected by the quota controller because it cannot account for their usage. LimitRange fills in defaults so pods without specs still get admitted and counted correctly.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Quota exhaustion debugging:</span> When a pod fails to create with "exceeded quota", check <code>kubectl describe resourcequota -n namespace</code>. It shows current usage vs hard limit for every resource type. Common triggers: someone scaled a deployment to many replicas, or a long-running batch job claimed all PVCs.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Object count quotas:</span> Beyond CPU and memory, you can quota the number of pods, services, configmaps, secrets, and PVCs. Useful for preventing teams from creating hundreds of secrets or services that degrade the API server's etcd performance.</div>
          </li>
        </ul>
      </Accordion>

      <Accordion title="Pod Security Standards — Replacing PSP" icon={Lock}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          PodSecurityPolicy (PSP) was deprecated in 1.21 and removed in 1.25. Pod Security Standards (PSS) replaced it with a simpler, three-level, namespace-scoped model. The levels are additive restrictions from least to most secure.
        </p>
        <CompareTable
          headers={['Level', 'What It Allows', 'Blocks', 'Use Case']}
          rows={[
            ['<strong>Privileged</strong>', 'Unrestricted — anything goes', 'Nothing', 'CNI plugins (Cilium, aws-node), node agents (Datadog, Falco)'],
            ['<strong>Baseline</strong>', 'Most workloads — blocks known privilege escalation paths', 'hostPath volumes, hostNetwork, hostPID, privileged containers', 'Default for application namespaces'],
            ['<strong>Restricted</strong>', 'Hardened security posture', 'Everything in Baseline plus: must run as non-root, must drop all capabilities, seccompProfile required', 'Payment services, anything handling sensitive data, compliance environments'],
          ]}
        />
        <CodeBlock language="yaml">
{`# Apply PSS to a namespace via labels
apiVersion: v1
kind: Namespace
metadata:
  name: payments-prod
  labels:
    # enforce: reject pods that violate the policy
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: latest
    # warn: admit but display warning (useful during migration)
    pod-security.kubernetes.io/warn: restricted
    # audit: admit and log violation (useful for discovery)
    pod-security.kubernetes.io/audit: restricted`}
        </CodeBlock>
        <HighlightBox type="tip">Migration from PSP: (1) Add warn and audit labels to namespaces — pods are admitted but violations are logged and warned. (2) Use the audit logs to find violating workloads. (3) Fix security contexts in Helm chart values or pod specs. (4) Once violations are resolved, switch to enforce. Jumping straight to enforce on a live namespace is how you cause an outage.</HighlightBox>
        <HighlightBox type="warn">Restricted level breaks many community Helm charts out of the box. Common issues: chart runs as root by default, missing seccompProfile, capabilities not dropped. Always check chart values for <code>securityContext</code> overrides before applying Restricted. Most charts support it via values — look for <code>podSecurityContext</code> and <code>containerSecurityContext</code> fields.</HighlightBox>
        <CodeBlock language="yaml">
{`# Pod spec that satisfies Restricted level
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    runAsGroup: 1000
    fsGroup: 1000
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: app
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop: ["ALL"]`}
        </CodeBlock>
      </Accordion>

      <Accordion title="Sidecar Patterns and Init Containers" icon={Server}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Kubernetes pods can run multiple containers. The patterns for how those containers collaborate fall into well-established categories with distinct use cases.
        </p>
        <CompareTable
          headers={['Pattern', 'What It Does', 'Real Example', 'Gotcha']}
          rows={[
            ['<strong>Init Container</strong>', 'Runs to completion before app containers start. Sequential.', 'Wait for DB migration to finish; download config files; wait for dependency service', 'Init containers must complete successfully or pod is stuck. A slow DB migration blocks every pod restart.'],
            ['<strong>Sidecar</strong>', 'Runs alongside app, shared network and volume', 'Log shipper (Fluent Bit), service mesh proxy (Envoy), secret injector (Vault agent)', 'Sidecar resource usage counts against pod total. A leaky sidecar can OOMKill the pod.'],
            ['<strong>Ambassador</strong>', 'Proxy that provides local access to external service', 'Memcached proxy that handles connection pooling; local Redis proxy', 'Adds latency if proxy is on the critical path'],
            ['<strong>Adapter</strong>', 'Transforms app output to standard format', 'Prometheus exporter for an app that does not natively expose metrics', 'Tight coupling — adapter must understand app internals'],
          ]}
        />
        <HighlightBox>In Kubernetes 1.29+, sidecar containers are first-class: you can mark a container as a sidecar using <code>restartPolicy: Always</code> inside an init container spec. This gives it init-container ordering guarantees (starts before app containers) but stays running like a regular container. The previous pattern of using a regular init container for sequencing and a sidecar for co-location is now cleaner with this feature.</HighlightBox>
      </Accordion>

      <Accordion title="Multi-Cluster vs Single Cluster Tradeoffs" icon={Shield}>
        <CompareTable
          headers={['Consideration', 'Single Cluster (Namespaces)', 'Multiple Clusters']}
          rows={[
            ['Isolation', 'Namespace + NetworkPolicy + PSS (soft isolation)', 'Hard isolation — separate API server, etcd, network', 'Compliance (PCI, HIPAA) often requires hard isolation'],
            ['Cost', 'One control plane ($0.10/hr on EKS)', 'N control planes — at 10 clusters: $720/month just for control planes', ''],
            ['Blast radius', 'Control plane outage affects all teams', 'Outage affects only that cluster\'s workloads', ''],
            ['Operational overhead', 'Low — one cluster to upgrade, monitor, manage', 'High — each cluster needs its own upgrades, addons, monitoring', ''],
            ['K8s version diversity', 'All teams on same version', 'Teams can run different versions for compatibility', ''],
          ]}
        />
        <HighlightBox type="tip">The practical answer at most companies: one cluster per environment (dev, staging, prod) rather than one per team. This gives you environment isolation at the cluster level while keeping team isolation at the namespace level. The prod cluster gets the most hardened settings. Dev and staging share a cluster to reduce cost.</HighlightBox>
      </Accordion>
    </div>
  );
}
