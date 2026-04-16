import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import NotesBox from '../components/NotesBox';
import HighlightBox from '../components/HighlightBox';
import CompareTable from '../components/CompareTable';
import CodeBlock from '../components/CodeBlock';

export default function AwsEks() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">{'\uD83D\uDEA2'} AWS EKS</div>
        <h1>Amazon EKS</h1>
        <p>EKS-specific patterns, node group strategy, add-ons, and operational decisions.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Control Plane',
          body: 'AWS manages the control plane (API server, etcd, scheduler, controller manager). You pay $0.10/hr per cluster. You own the data plane \u2014 nodes, networking, and add-ons. The boundary matters: control plane outages are AWS\'s problem, node failures are yours.'
        },
        {
          title: 'Data Plane Choices',
          body: 'Managed node groups (AWS handles node lifecycle), self-managed (you control AMIs and launch templates), or Fargate (serverless pods, no nodes to manage). Each has different cost, control, and operational tradeoffs \u2014 pick based on your team\'s capacity to operate infra.'
        },
        {
          title: 'Add-ons',
          body: 'EKS ships with managed add-ons (VPC CNI, CoreDNS, kube-proxy, EBS CSI). These are upgradeable independently of the cluster version. Add-on version lag is a real operational risk \u2014 if your VPC CNI is too old for your K8s version, pod networking breaks silently.'
        }
      ]} />

      <Accordion title="Cluster Creation — eksctl vs Terraform vs Console" icon={'\uD83C\uDFD7\uFE0F'} defaultOpen={true}>
        <CompareTable
          headers={['Tool', 'Pros', 'Cons', 'When to Use']}
          rows={[
            ['<strong>Console / AWS CLI</strong>', 'Fast, no tooling setup', 'Not reproducible, no drift detection', 'Learning, quick PoC'],
            ['<strong>eksctl</strong>', 'Purpose-built for EKS, simple YAML config, good defaults', 'Limited Terraform integration, less control', 'Individual teams, quick cluster standup'],
            ['<strong>Terraform (aws_eks_cluster)</strong>', 'Full infra-as-code, integrates with VPC/IAM Terraform', 'More boilerplate, need to manage node group IAM roles separately', 'Production clusters in a multi-account org'],
            ['<strong>Terraform + EKS Blueprints</strong>', 'Opinionated, handles add-ons, IRSA, managed node groups', 'Customising outside the blueprint is friction', 'Standardised platform team deployments'],
          ]}
        />
        <HighlightBox type="tip">Production recommendation: Terraform for cluster + VPC. eksctl for ad-hoc operations. The EKS Terraform module from the community (terraform-aws-modules/eks/aws) is battle-tested and handles most of the boilerplate.</HighlightBox>
        <CodeBlock>{`# Minimal EKS cluster with Terraform (community module)
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = local.cluster_name
  cluster_version = "1.30"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  # Enable IRSA (OIDC provider)
  enable_irsa = true

  # EKS managed add-ons
  cluster_addons = {
    coredns    = { most_recent = true }
    kube-proxy = { most_recent = true }
    vpc-cni    = { most_recent = true }
    aws-ebs-csi-driver = {
      most_recent              = true
      service_account_role_arn = module.ebs_csi_irsa.iam_role_arn
    }
  }

  eks_managed_node_groups = {
    main = {
      instance_types = ["m6i.xlarge"]
      min_size       = 2
      max_size       = 10
      desired_size   = 3
    }
  }
}`}</CodeBlock>
        <NotesBox id="eks-creation" placeholder="How did your team create EKS clusters? Terraform module? Any lessons from cluster bootstrapping or add-on management?" />
      </Accordion>

      <Accordion title="Node Groups — Managed vs Self-Managed vs Fargate" icon={'\uD83D\uDDA5\uFE0F'}>
        <CompareTable
          headers={['Type', 'AWS Manages', 'You Control', 'Use When']}
          rows={[
            ['<strong>Managed Node Groups</strong>', 'Node provisioning, AMI updates, drain on upgrade', 'Instance type, launch template customisation, IAM role', 'Most production workloads \u2014 least toil'],
            ['<strong>Self-Managed</strong>', 'Nothing', 'AMI, bootstrap script, Auto Scaling Group, draining', 'Custom AMIs, Windows nodes, ARM experiments'],
            ['<strong>Fargate</strong>', 'Node provisioning and lifecycle entirely', 'Pod specs, resource requests', 'Batch jobs, infrequent bursty workloads, no node ops budget'],
            ['<strong>Karpenter</strong>', 'Nothing \u2014 it runs on your cluster', 'NodePool config, instance family preferences', 'Cost-optimised, mixed spot/on-demand, diverse instance types'],
          ]}
        />
        <HighlightBox>Fargate limitations: No DaemonSets (sidecars must be injected). No GPU. No privileged containers. Volumes only via EFS (no EBS \u2014 Fargate nodes are ephemeral). Storage-intensive or daemonset-heavy workloads don't belong on Fargate.</HighlightBox>
        <HighlightBox type="warn">Managed node group upgrade gotcha: When you upgrade the node group AMI, EKS drains one node at a time. If your PodDisruptionBudgets are too strict or terminationGracePeriodSeconds {'>'} 15 min, the node drain can time out and the upgrade stalls. Always test your PDB config before an upgrade window.</HighlightBox>
      </Accordion>

      <Accordion title="EKS Add-ons — What Each Does and Upgrade Gotchas" icon={'\uD83D\uDD0C'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          EKS managed add-ons are deployed via the EKS API. Each has a compatibility matrix with the cluster version. Running outdated add-ons after a cluster upgrade is a common source of production issues.
        </p>
        <CompareTable
          headers={['Add-on', 'What It Does', 'Critical Upgrade Note']}
          rows={[
            ['<strong>VPC CNI (aws-node)</strong>', 'Assigns VPC IPs to pods. Each pod gets a real VPC IP. Runs as a DaemonSet.', 'Must be compatible with K8s version. After cluster upgrade, update VPC CNI first. Old CNI + new API server = pod creation failures.'],
            ['<strong>CoreDNS</strong>', 'Cluster DNS \u2014 resolves Service names to ClusterIPs.', 'Scaling CoreDNS is often forgotten. At 100+ nodes, default 2 replicas is a bottleneck. Scale to at least 1 replica per 100 nodes.'],
            ['<strong>kube-proxy</strong>', 'Maintains iptables/IPVS rules for Service routing. Runs on every node.', 'Version must match cluster version. Drift causes Service routing inconsistencies.'],
            ['<strong>EBS CSI Driver</strong>', 'Provisions EBS volumes for PVCs. Required for StatefulSets using block storage.', 'Needs its own IRSA role. If IRSA is missing, PVC provisioning silently fails \u2014 pod stays in Pending.'],
          ]}
        />
        <CodeBlock>{`# Check add-on version vs what's available for your cluster version
aws eks describe-addon-versions \\
  --kubernetes-version 1.30 \\
  --addon-name vpc-cni \\
  --query 'addons[].addonVersions[].addonVersion'

# Update an add-on (managed)
aws eks update-addon \\
  --cluster-name my-cluster \\
  --addon-name vpc-cni \\
  --addon-version v1.18.1-eksbuild.1 \\
  --resolve-conflicts OVERWRITE   # or PRESERVE to keep your custom config`}</CodeBlock>
        <HighlightBox type="warn">OVERWRITE vs PRESERVE: If you customise add-on ConfigMaps (e.g., VPC CNI env vars for prefix delegation), use PRESERVE or your customisations get wiped. If unsure, OVERWRITE restores the add-on to a known-good state.</HighlightBox>
        <NotesBox id="eks-addons" placeholder="Which add-ons did your team manage? Did you use EKS managed add-ons or self-managed (Helm)? Any add-on upgrade failures?" />
      </Accordion>

      <Accordion title="EKS Access — aws-auth vs Access Entries" icon={'\uD83D\uDD11'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          There are two ways to grant IAM identities access to an EKS cluster. The old way (aws-auth ConfigMap) is fragile. The new way (EKS Access Entries, GA in 2024) is the correct path forward.
        </p>
        <HighlightBox type="warn">aws-auth gotcha: The aws-auth ConfigMap in kube-system is the single point of failure for cluster access. A typo in its YAML can lock everyone out {'\u2014'} including you. No backup = impersonating the cluster-creator IAM role or restoring via AWS Console.</HighlightBox>
        <CodeBlock>{`# OLD WAY — aws-auth ConfigMap (fragile, avoid in new clusters)
apiVersion: v1
kind: ConfigMap
metadata:
  name: aws-auth
  namespace: kube-system
data:
  mapRoles: |
    - rolearn: arn:aws:iam::123456789:role/eks-node-role
      username: system:node:{{EC2PrivateDNSName}}
      groups: [system:bootstrappers, system:nodes]
    - rolearn: arn:aws:iam::123456789:role/devops-team
      username: devops
      groups: [system:masters]   # cluster-admin equivalent
---
# NEW WAY — EKS Access Entries (API-driven, no ConfigMap to break)
aws eks create-access-entry \\
  --cluster-name my-cluster \\
  --principal-arn arn:aws:iam::123456789:role/devops-team \\
  --type STANDARD

aws eks associate-access-policy \\
  --cluster-name my-cluster \\
  --principal-arn arn:aws:iam::123456789:role/devops-team \\
  --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy \\
  --access-scope '{"type": "cluster"}'`}</CodeBlock>
        <HighlightBox type="tip">Migration path: Set authenticationMode: API_AND_CONFIG_MAP (supports both simultaneously). Create Access Entries for all teams. Validate access. Then switch to authenticationMode: API to retire the ConfigMap. This is a one-way migration.</HighlightBox>
      </Accordion>

      <Accordion title="Architecture Interview Q&A" icon={'\uD83C\uDFAF'}>
        <HighlightBox>
          <strong>Q: You need to upgrade EKS from 1.27 to 1.30 in production. Walk me through your process.</strong><br/><br/>
          K8s only supports one minor version upgrade at a time: 1.27 {'\u2192'} 1.28 {'\u2192'} 1.29 {'\u2192'} 1.30. Three upgrade windows. Pre-upgrade: check for deprecated API versions with kubectl convert. Check add-on compatibility matrix for each target version. Process per version: (1) Upgrade the control plane first (aws eks update-cluster-version). Wait for Active (~15 min). (2) Upgrade managed add-ons {'\u2014'} VPC CNI, CoreDNS, kube-proxy, EBS CSI {'\u2014'} to compatible versions. (3) Upgrade node groups {'\u2014'} EKS drains one node at a time, replaces with new AMI. (4) Validate: all system pods running, app pods healthy, CoreDNS resolving, PVCs mounting. Risk mitigations: do upgrades in staging first. Keep old node groups running in parallel during upgrade {'\u2014'} only terminate after validation.
        </HighlightBox>
        <HighlightBox>
          <strong>Q: Your EKS pods are stuck in Pending after a cluster upgrade. What do you check?</strong><br/><br/>
          kubectl describe pod {'\u2014'} look at Events. Common causes post-upgrade: (1) VPC CNI not upgraded {'\u2014'} pod IP assignment fails, event says "failed to assign IP". Fix: upgrade vpc-cni add-on. (2) Node group still on old AMI {'\u2014'} new pods may not schedule. (3) Karpenter or CA not recognising new nodes {'\u2014'} check if autoscaler uses the right AMI parameter. (4) ResourceQuota exhausted because new system pods consumed namespace resources. (5) PodSecurityAdmission rejections {'\u2014'} check for "forbidden: violates PodSecurity" events.
        </HighlightBox>
        <HighlightBox>
          <strong>Q: When would you use Fargate instead of EC2 node groups on EKS?</strong><br/><br/>
          Fargate makes sense for: batch jobs (run-to-completion, no persistent state), infrequent bursty workloads that would leave EC2 nodes idle, and teams with no capacity to operate nodes. Wrong choice when: you need DaemonSets, use EBS volumes (EFS only on Fargate), have GPU workloads, or have high-throughput services where cold start matters. In practice, most production EKS clusters use EC2 managed node groups for main workloads and optionally Fargate profiles for specific batch job namespaces.
        </HighlightBox>
      </Accordion>
    </div>
  );
}
