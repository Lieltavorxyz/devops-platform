import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import HighlightBox from '../components/HighlightBox';
import CodeBlock from '../components/CodeBlock';
import CompareTable from '../components/CompareTable';
import { Network, Server, Zap, Database, Settings } from 'lucide-react';

export default function EksInternals() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">System Internals</div>
        <h1>EKS Internals</h1>
        <p>What actually runs in the EKS control plane, how VPC CNI networking works at the packet level, and the full sequence from kubectl apply to running pod.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Control Plane — AWS Managed',
          body: 'The EKS control plane lives in AWS-managed VPCs, not yours. AWS runs etcd, the API server, scheduler, and controller manager as a highly-available service. You never SSH into it. You pay $0.10/hr. AWS handles upgrades, patching, and HA. Your only access is through the API server endpoint.'
        },
        {
          title: 'Data Plane — You Own',
          body: 'EC2 worker nodes in your VPC. You pay for them, manage AMI updates, configure networking, and size them. The bridge between planes: ENIs injected into your VPC allow worker nodes to reach the API server privately, without going through the public internet (when private endpoint is enabled).'
        }
      ]} />

      <Accordion title="Control Plane Components" icon={Database} defaultOpen={true}>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">API Server:</span> The single front door for everything. Every kubectl command, every kubelet status update, every controller action goes through the API server. It handles authentication (IAM via STS token), authorization (RBAC), and admission control (mutating and validating webhooks). It is stateless — state lives in etcd — so AWS can run multiple replicas behind a load balancer for HA.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">etcd:</span> Distributed key-value store that holds the entire cluster state as serialized protobuf — every Deployment, Service, ConfigMap, Secret, and custom resource. Backed by Raft consensus. If etcd loses quorum, the cluster is read-only (running pods keep running, but nothing new can be scheduled or configured). AWS backs up EKS etcd automatically every hour.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Scheduler:</span> Watches etcd for pods with no <code>spec.nodeName</code> set. For each unscheduled pod, runs filter then score algorithms across all nodes. Writes the chosen node name to the pod object in etcd. That is all it does — it does not start anything. The kubelet on the chosen node does the actual work.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Controller Manager:</span> Runs all the reconciliation control loops. The Deployment controller creates ReplicaSets. The ReplicaSet controller creates Pods. The Node controller monitors node health and taints unresponsive nodes. Every Kubernetes automation is a controller watching etcd for changes and taking corrective action.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Cloud Controller Manager:</span> The bridge between Kubernetes and AWS APIs. When you create a Service of type LoadBalancer, this calls the AWS ELB API to provision an ALB or NLB. When you create a PVC with a StorageClass, this triggers EBS volume creation. This is separate from the main controller manager so cloud-specific code does not pollute the core.</div>
          </li>
        </ul>
        <HighlightBox type="tip">The key insight: Kubernetes is event-driven, not request-response. Applying a Deployment writes desired state to etcd. Each component independently watches for changes and reconciles. If the scheduler crashes and restarts, it picks up unscheduled pods from etcd and continues. If the kubelet crashes, running containers keep running — kubelet reconciles container state against pod specs when it restarts. This is why Kubernetes is self-healing at every layer.</HighlightBox>
      </Accordion>

      <Accordion title="Data Plane — Node Components" icon={Server}>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">kubelet:</span> The node agent. Watches the API server for pods assigned to its node. Calls the container runtime (containerd) to pull images and start containers. Runs liveness and readiness probes. Reports pod and node status back to the API server. The kubelet is the component that makes things actually run — everything else is coordination.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">kube-proxy:</span> Runs on every node. Watches the API server for Service and Endpoints changes. Programs iptables (or IPVS) rules so that traffic to a ClusterIP gets DNAT'd to a healthy pod IP. It is not a proxy in the traditional sense — it programs the kernel network stack and then gets out of the way. No traffic passes through kube-proxy at runtime.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">containerd:</span> The container runtime. kubelet instructs it to pull images (from ECR or other registries), create container namespaces, mount volumes, set up networking (via CNI plugins), and manage the container lifecycle. In EKS, containerd replaced Docker as the runtime in Kubernetes 1.24+.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">aws-node (VPC CNI DaemonSet):</span> Manages pod IP assignment. On startup, it pre-warms a pool of secondary IPs by attaching ENIs to the node. When a pod is scheduled, it assigns one of the pre-warmed IPs to the pod, creating a veth pair between the pod's network namespace and the node's. This pre-warming means pod startup is not delayed by ENI attachment latency.</div>
          </li>
        </ul>
      </Accordion>

      <Accordion title="VPC CNI — Why EKS Pod Networking is Different" icon={Network}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Most Kubernetes distributions use an overlay network: pods get private IPs from a separate CIDR, and traffic between nodes is encapsulated (VXLAN). EKS with VPC CNI is fundamentally different — pods get real VPC IPs.
        </p>
        <CompareTable
          headers={['Approach', 'Pod IPs', 'Node-to-Node', 'VPC Flow Logs', 'IP Consumption']}
          rows={[
            ['<strong>AWS VPC CNI (EKS default)</strong>', 'Real VPC IPs from subnet CIDR', 'Direct VPC routing — no encapsulation', 'Full visibility per pod', 'High — 1 VPC IP per pod'],
            ['<strong>Overlay (Flannel, Calico VXLAN)</strong>', 'Private overlay CIDR (e.g., 10.244.0.0/16)', 'VXLAN encapsulation — adds overhead', 'Node level only', 'Low — pods share node IPs'],
            ['<strong>Cilium eBPF</strong>', 'Can use native routing (no overlay) or overlay', 'Native routing or GENEVE tunnel', 'Full visibility with eBPF', 'Low with overlay, high with native routing'],
          ]}
        />
        <CodeBlock language="bash">
{`# How VPC CNI assigns IPs — the mechanism

# Each EC2 node has:
# - 1 primary ENI (the node's main network interface)
# - Up to N secondary ENIs (depending on instance type)
# - Each ENI has 1 primary IP + up to M secondary IPs

# For example, m5.xlarge:
# - Max ENIs: 4
# - Max IPs per ENI: 15
# - Max pods: (4-1) * 15 = 45 pods (minus system pods)

# With prefix delegation (ENABLE_PREFIX_DELEGATION=true):
# Each secondary ENI gets a /28 prefix (16 IPs)
# m5.xlarge: (4-1) * 16 = 48 pods possible

# Check node IP capacity
kubectl get nodes -o json | jq '.items[] | {
  name: .metadata.name,
  max_pods: .status.allocatable["pods"],
  instance_type: .metadata.labels["node.kubernetes.io/instance-type"]
}'

# Check VPC CNI pool on a node
kubectl exec -n kube-system aws-node-XXXXX -- \
  /app/aws-cni-support.sh 2>/dev/null | head -50`}
        </CodeBlock>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Security Groups for Pods:</span> Because pods have real VPC IPs, you can attach security groups directly to pods (not just to nodes). The <code>SecurityGroupPolicy</code> CRD from VPC CNI enables this. Fine-grained access control for specific pods to reach specific RDS instances — without network policies.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Flow log visibility:</span> Every pod-to-pod packet appears in VPC flow logs with the source and destination pod IP. This is invaluable for security auditing and compliance — you can see exactly which pod called which external IP, without needing a service mesh.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">IP exhaustion — the production incident pattern:</span> Subnet has /20 = 4,094 IPs. Cluster has 50 nodes running 30 pods each = 1,500 pod IPs consumed + 50 node IPs. Fine. Then Karpenter scales to 120 nodes at peak load: 3,600 pod IPs + 120 node IPs = 3,720 IPs. Subnet is nearly exhausted. New pods fail to start with "failed to assign an IP address to container." Size private subnets to at least /19 per AZ for production EKS.</div>
          </li>
        </ul>
        <HighlightBox type="warn">IP exhaustion is silent until it causes failures. There is no alert by default. Add a Prometheus alert on VPC CNI's metric <code>awscni_assigned_ip_addresses</code> compared to the subnet's available IP count. Alert when available IPs drop below 20% of subnet capacity.</HighlightBox>
      </Accordion>

      <Accordion title="What Happens When You Run kubectl apply" icon={Zap}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Understanding this sequence is what makes you effective at debugging why a deployment is stuck. Each step can fail for different reasons.
        </p>
        <CodeBlock language="bash">
{`# The full sequence: kubectl apply -f deployment.yaml

# Step 1: Authentication
# kubectl reads kubeconfig, calls aws eks get-token to get a pre-signed STS URL
# This is sent as a Bearer token to the API server
# API server calls STS to validate: who is this IAM identity?
# IAM identity mapped to K8s user via aws-auth ConfigMap or Access Entries

# Step 2: Authorization (RBAC)
# API server checks: does this K8s user have permission to create/update
# Deployments in this namespace?
# No matching RoleBinding = 403 Forbidden

# Step 3: Admission Controllers
# Mutating webhooks run first (can modify the object):
#   - cert-manager injects CA bundle annotations
#   - Kyverno adds default labels
#   - Pod Security Admission validates against PSS level
# Then Validating webhooks (can reject):
#   - OPA/Gatekeeper policy checks (e.g., require resource limits)
#   - Kyverno validation rules
#   - PSS enforcing level violations
# Any rejection here = apply fails with a policy error

# Step 4: Persisted to etcd
# Object written to etcd. API server returns 201 Created.
# Your terminal shows: deployment.apps/payments-api created
# Nothing has been scheduled yet.

# Step 5: Controller reacts
# Deployment controller sees new Deployment, creates a ReplicaSet
# ReplicaSet controller creates N Pod objects in etcd with no node assigned

# Step 6: Scheduler
# Scheduler sees Pods with no spec.nodeName
# Runs filter (which nodes have enough resources, tolerate taints, match affinity?)
# Runs score (which node is best?)
# Writes chosen node name to Pod.spec.nodeName in etcd

# Step 7: kubelet on chosen node
# kubelet sees new pod assigned to it
# Calls VPC CNI to assign IP (from pre-warmed pool)
# Calls containerd to pull image (from ECR) if not cached
# Runs init containers in order, waits for each to complete
# Starts main container(s)
# Starts running liveness/readiness probes

# Step 8: Status propagates
# kubelet updates pod status: ContainerCreating → Running
# Deployment status updates: replicas, readyReplicas, availableReplicas`}
        </CodeBlock>
        <HighlightBox type="tip">When a pod is stuck in ContainerCreating: the image pull may be failing (wrong tag, ECR auth), the VPC CNI IP pool may be exhausted, or a volume mount may be failing. Check <code>kubectl describe pod</code> — the Events section at the bottom shows exactly what step failed and why.</HighlightBox>
      </Accordion>

      <Accordion title="Authentication Flow — How kubectl Reaches EKS" icon={Settings}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          EKS uses IAM-based authentication, which is different from most Kubernetes distributions. The token is not a static JWT — it is a pre-signed STS URL that the API server validates in real time.
        </p>
        <CodeBlock language="bash">
{`# Add cluster to kubeconfig
aws eks update-kubeconfig \
  --name prod-eks \
  --region us-east-1 \
  --role-arn arn:aws:iam::123456789:role/eks-admin  # assume this role for access

# What happens when kubectl runs a command:
# 1. kubectl reads kubeconfig — sees an exec authenticator calling aws eks get-token
# 2. aws eks get-token calls STS CreatePresignedUrl (pre-signs a GetCallerIdentity call)
# 3. This URL is base64-encoded and sent as Bearer token to the API server
# 4. API server calls that STS URL — AWS STS returns the IAM identity
# 5. API server maps IAM ARN to K8s user via Access Entries or aws-auth ConfigMap
# 6. RBAC authorization proceeds with the mapped K8s identity

# The token expires after 15 minutes — kubectl automatically refreshes
# This means no static credentials stored anywhere for human access

# Debug: see what identity kubectl is using
kubectl auth whoami

# See what actions you can perform
kubectl auth can-i --list --namespace payments-prod`}
        </CodeBlock>
        <CompareTable
          headers={['Scenario', 'What to Check']}
          rows={[
            ['kubectl returns "Unauthorized"', 'aws sts get-caller-identity — are you assuming the right role? Is the role in aws-auth or Access Entries?'],
            ['kubectl returns "Forbidden"', 'kubectl auth can-i — check RBAC bindings for your identity in the target namespace'],
            ['kubectl hangs with no response', 'Is the API server endpoint reachable? Check cluster endpoint access mode. Is your IP in the allowlist for public access?'],
            ['Token expired mid-operation', 'kubectl auto-refreshes tokens — if it fails, check aws credentials expiry (STS session duration)'],
          ]}
        />
      </Accordion>
    </div>
  );
}
