import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import NotesBox from '../components/NotesBox';
import HighlightBox from '../components/HighlightBox';
import CompareTable from '../components/CompareTable';

export default function EksInternals() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">{'\uD83D\uDD2C'} System Internals</div>
        <h1>EKS Internals</h1>
        <p>How EKS actually works under the hood — control plane, data plane, VPC CNI networking, and what happens when you run kubectl.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Control Plane \u2014 AWS Managed',
          body: "Lives in AWS-managed accounts, not yours. AWS runs etcd, the API server, scheduler, and controller manager. You never SSH into it. The only access is through the API server endpoint EKS exposes. AWS handles HA, patching, and scaling."
        },
        {
          title: 'Data Plane \u2014 You Own',
          body: "Your EC2 worker nodes in your VPC. You pay for them, manage the AMI updates, and decide the sizing. The bridge between the two worlds is an ENI EKS injects into your VPC \u2014 worker nodes talk to the API server through it, not the public internet (unless you enabled public endpoint)."
        }
      ]} />

      <Accordion title="Control Plane Components" icon={'\uD83E\uDDE0'} defaultOpen={true}>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">API Server:</span> The single entry point for everything. Every kubectl command, every controller, every kubelet talks to it. It's stateless — all state lives in etcd — so AWS can run multiple replicas behind a load balancer. Handles authn, authz, and admission control before anything touches etcd.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">etcd:</span> Distributed key-value store. Holds the entire desired state of the cluster as JSON — every Deployment, Service, ConfigMap, Secret. If etcd goes down, no new changes can be made (existing running pods keep running). AWS backs it up automatically in EKS.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Scheduler:</span> Watches for pods with no node assigned and decides placement. Considers resource requests, taints/tolerations, affinity rules, topology spread. It only writes the node assignment — it doesn't start anything.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Controller Manager:</span> Runs all the reconciliation loops. The Deployment controller creates ReplicaSets. The ReplicaSet controller ensures the right pod count. Node controller monitors health. Every K8s "automation" is a controller watching etcd for changes and acting on them.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Cloud Controller Manager:</span> The bridge between Kubernetes and AWS APIs. When you create a Service type: LoadBalancer, this calls AWS to provision the ALB/NLB. Same for EBS PersistentVolumes.</div>
          </li>
        </ul>
        <HighlightBox type="tip">Key insight: Kubernetes is event-driven, not request-response. When you apply a manifest, you're writing desired state to etcd. Each component independently watches for changes and reconciles. This is why K8s is resilient — each component can restart without losing state.</HighlightBox>
      </Accordion>

      <Accordion title="Node Components (Data Plane)" icon={'\u2699\uFE0F'}>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">kubelet:</span> The node agent. Watches the API server for pods assigned to its node, tells containerd to pull images and start containers, runs liveness/readiness probes, and reports status back to the API server. The kubelet is what actually makes things run.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">kube-proxy:</span> Runs on every node. Maintains iptables (or IPVS) rules that implement Kubernetes Services. When you create a ClusterIP Service, kube-proxy writes rules so traffic to the virtual ClusterIP gets DNAT'd to a real pod IP. It's not a proxy — it programs kernel networking.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">containerd:</span> The container runtime. kubelet tells it what to do, it manages the actual container lifecycle — image pulls, container start/stop, namespace isolation.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">aws-node (VPC CNI):</span> DaemonSet on every node. Manages pod IP assignment from the VPC. Pre-warms a pool of IPs before they're needed so pod startup isn't delayed by ENI attachment.</div>
          </li>
        </ul>
      </Accordion>

      <Accordion title="VPC CNI Networking \u2014 What Makes EKS Different" icon={'\uD83C\uDF10'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          In most K8s setups (Flannel, Calico), pods get IPs from a private overlay network — separate from the underlying VPC. EKS does something fundamentally different.
        </p>
        <HighlightBox type="warn">In EKS, pods get real VPC IPs. Each pod is a first-class VPC citizen — routable, visible in flow logs, targetable by security groups.</HighlightBox>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">How it works:</span> Each EC2 node has a primary ENI + can attach additional ENIs. Each ENI supports multiple secondary IPs. aws-node pre-warms these IPs. When a pod is scheduled, it gets a pre-warmed IP and a virtual ethernet pair (veth) connecting pod namespace to the node.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">No overlay network:</span> Pod-to-pod traffic is just VPC routing. No VXLAN tunnel overhead. Fast, and every packet is visible in VPC flow logs — useful for compliance and debugging.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Security Groups for Pods:</span> Because pods have VPC IPs, you can attach SGs directly to pods (not just nodes). Fine-grained access control without needing network policies.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">IP exhaustion risk:</span> Pod IPs come from your VPC CIDR. A node with 30 pods needs 30 IPs from your subnet. Under-sizing subnets = pods can't start. This is a common and painful production issue.</div>
          </li>
        </ul>
        <CompareTable
          headers={['Approach', 'Pod IPs', 'Overhead', 'Flow Logs']}
          rows={[
            ['<strong>AWS VPC CNI (EKS default)</strong>', 'Real VPC IPs', 'None', 'Full visibility'],
            ['<strong>Overlay (Flannel/Calico)</strong>', 'Private overlay CIDR', 'VXLAN encap', 'Node level only'],
          ]}
        />
        <NotesBox id="eks-internals-cni" placeholder="Did you hit IP exhaustion? How were subnets sized for EKS? Did you use prefix delegation (assign /28 blocks instead of individual IPs)?" />
      </Accordion>

      <Accordion title="What Happens When You Run kubectl apply" icon={'\u26A1'}>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Step 1 — Authentication:</span> kubectl reads kubeconfig, calls <code>aws eks get-token</code> to get a short-lived pre-signed STS URL. This token is sent as a Bearer token to the API server. API server validates it by calling AWS STS and maps the IAM identity to a K8s user via aws-auth ConfigMap (or access entries in newer EKS).</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Step 2 — Authorization (RBAC):</span> API server checks whether this identity is allowed to perform this operation on this resource. No matching RoleBinding = 403 Forbidden.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Step 3 — Admission Controllers:</span> Mutating webhooks run first (can modify the object — e.g. inject sidecars, add default limits). Then validating webhooks (can reject — e.g. OPA/Kyverno policies). Rejection here = your apply fails with a policy error.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Step 4 — Persisted to etcd:</span> Object is written. kubectl gets 200/201 back. Terminal shows "created". Scheduling hasn't happened yet.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Step 5 — Controllers react:</span> Deployment controller creates a ReplicaSet. ReplicaSet controller creates Pod objects in etcd with no node assigned.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Step 6 — Scheduler picks up unscheduled pods:</span> Runs its algorithm (resources, taints, affinity), writes spec.nodeName into the pod object.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Step 7 — kubelet on the chosen node:</span> Sees the pod assigned to it. Calls VPC CNI to assign an IP. Tells containerd to pull the image and start containers. Runs init containers in order, then main containers.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Step 8 — Status flows back:</span> kubelet updates pod status (ContainerCreating {'\u2192'} Running) in etcd. Deployment status updates. <code>kubectl get pods</code> shows Running.</div>
          </li>
        </ul>
      </Accordion>

      <Accordion title="Interview Questions" icon={'\uD83D\uDCAC'}>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2753'}</span>
            <div><span className="label">"What's the difference between the control plane and data plane in EKS?"</span> — Control plane is AWS-managed (etcd, API server, scheduler, controllers) in a separate VPC. Data plane is your EC2 nodes. They communicate via an ENI injected into your VPC.</div>
          </li>
          <li>
            <span className="bullet">{'\u2753'}</span>
            <div><span className="label">"How does pod networking work in EKS?"</span> — VPC CNI assigns real VPC IPs to pods via secondary IPs on node ENIs. No overlay network. Pod-to-pod is plain VPC routing. This is why subnet sizing matters — each pod consumes a VPC IP.</div>
          </li>
          <li>
            <span className="bullet">{'\u2753'}</span>
            <div><span className="label">"What happens if the API server is down?"</span> — Running pods keep running (kubelet handles them locally). But nothing new can be scheduled, no new configs applied, no autoscaling decisions. etcd is the real risk — if etcd loses quorum, the cluster is effectively read-only.</div>
          </li>
          <li>
            <span className="bullet">{'\u2753'}</span>
            <div><span className="label">"How does kubectl authenticate to EKS?"</span> — IAM-based. <code>aws eks get-token</code> generates a pre-signed STS URL. API server calls STS to validate it, maps the IAM ARN to a K8s identity via aws-auth ConfigMap.</div>
          </li>
        </ul>
      </Accordion>
    </div>
  );
}
