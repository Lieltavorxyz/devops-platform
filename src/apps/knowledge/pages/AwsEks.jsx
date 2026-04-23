import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import HighlightBox from '../components/HighlightBox';
import CodeBlock from '../components/CodeBlock';
import CompareTable from '../components/CompareTable';
import { Server, Settings, RefreshCw, Key, Shield } from 'lucide-react';

export default function AwsEks() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">AWS EKS</div>
        <h1>Amazon EKS</h1>
        <p>EKS architecture decisions, node group types, add-on management, cluster access patterns, and how to safely upgrade across minor versions.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Control Plane vs Data Plane',
          body: 'AWS manages the control plane (API server, etcd, scheduler, controller manager) in a separate VPC. You pay $0.10/hr per cluster. You own the data plane — EC2 worker nodes, networking add-ons, and cluster add-ons. Control plane outages are AWS\'s problem; node failures, add-on bugs, and networking issues are yours.'
        },
        {
          title: 'Data Plane Choices',
          body: 'Managed node groups (AWS handles node lifecycle), self-managed (you control AMIs and ASGs), Fargate (serverless — no nodes to manage), or Karpenter (direct EC2 provisioning). Each trades control for operational overhead. Pick based on your team\'s capacity and workload requirements.'
        }
      ]} />

      <Accordion title="Cluster Creation — Terraform Module Pattern" icon={Settings} defaultOpen={true}>
        <CodeBlock language="hcl">
{`# terraform-aws-modules/eks is the battle-tested community module
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "prod-eks"
  cluster_version = "1.30"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets    # nodes in private subnets

  # Enable OIDC provider for IRSA
  enable_irsa = true

  # Cluster endpoint access
  cluster_endpoint_private_access = true    # nodes use private endpoint
  cluster_endpoint_public_access  = true    # ops team can kubectl from laptop
  cluster_endpoint_public_access_cidrs = [
    "203.0.113.0/24"    # restrict to office/VPN IPs only
  ]

  # EKS managed add-ons
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent    = true
      before_compute = true   # VPC CNI must be ready before nodes can join
      configuration_values = jsonencode({
        env = {
          ENABLE_PREFIX_DELEGATION = "true"    # assign /28 blocks per ENI
          WARM_PREFIX_TARGET       = "1"
        }
      })
    }
    aws-ebs-csi-driver = {
      most_recent              = true
      service_account_role_arn = module.ebs_csi_irsa.iam_role_arn  # IRSA required
    }
  }

  eks_managed_node_groups = {
    general = {
      instance_types = ["m6i.xlarge", "m6a.xlarge", "m5.xlarge"]
      capacity_type  = "ON_DEMAND"
      min_size       = 3
      max_size       = 10
      desired_size   = 3

      # EKS optimized AL2023 AMI (auto-updated by managed node group)
      ami_type = "AL2023_x86_64_STANDARD"

      labels = {
        role = "general"
      }
    }
  }
}`}
        </CodeBlock>
        <CompareTable
          headers={['Creation Tool', 'Best For', 'Limitation']}
          rows={[
            ['<strong>Terraform + community module</strong>', 'Production clusters in multi-account orgs — full IaC, integrates with VPC and IAM Terraform', 'More boilerplate than eksctl; need to manage add-on IRSA roles separately'],
            ['<strong>eksctl</strong>', 'Quick cluster standup, individual teams, CLI-driven ops', 'Less integration with existing Terraform state; limited multi-account patterns'],
            ['<strong>AWS Console</strong>', 'Learning, one-off exploration', 'Not reproducible, no drift detection, manual error-prone'],
            ['<strong>CDK (Cloud Development Kit)</strong>', 'Teams already using CDK for all infra', 'Different mental model from Terraform; less community EKS content'],
          ]}
        />
      </Accordion>

      <Accordion title="Node Group Types — Tradeoffs in Practice" icon={Server}>
        <CompareTable
          headers={['Type', 'AWS Manages', 'You Control', 'Use When']}
          rows={[
            ['<strong>Managed Node Groups</strong>', 'Node provisioning, AMI updates, drain on upgrade', 'Instance type, launch template, IAM role, labels/taints', 'Default choice — least toil, handles rolling upgrades automatically'],
            ['<strong>Self-Managed (ASG)</strong>', 'Nothing — you own the ASG, AMI, and bootstrap script', 'Everything — AMI, userdata, drain logic, upgrade process', 'Custom AMIs, Windows nodes, specific bootstrap requirements, existing ASGs to migrate'],
            ['<strong>Fargate</strong>', 'Node provisioning, lifecycle, patching', 'Pod spec and resource requests (no node concept)', 'Batch jobs, infrequent bursty workloads, teams with no node ops budget'],
            ['<strong>Karpenter</strong>', 'Nothing — it runs as a pod in your cluster', 'NodePool config, EC2NodeClass, disruption policy', 'Cost-optimized mixed spot/on-demand, diverse instance types, need sub-60s provisioning'],
          ]}
        />
        <HighlightBox type="warn">Fargate limitations that matter in production: no DaemonSets (log shippers, node agents like Datadog must be injected as sidecars), no GPU support, no EBS volumes (EFS only — Fargate nodes are ephemeral), cold start latency for new pods. Any workload that requires DaemonSets, GPU, or EBS volumes cannot run on Fargate.</HighlightBox>
        <HighlightBox>Managed node group upgrade behavior: when you update the AMI version, EKS cordons and drains one node at a time. If your PDB is too strict (e.g., <code>minAvailable: N</code> equals your total replicas) or <code>terminationGracePeriodSeconds</code> is very long, the drain may timeout and the upgrade stalls. Always test your PDB and grace period configuration before a planned upgrade window.</HighlightBox>
      </Accordion>

      <Accordion title="Add-on Management — Compatibility and Upgrade Order" icon={RefreshCw}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          EKS managed add-ons are versioned independently of the cluster version. After each Kubernetes minor version upgrade, you must also upgrade add-ons to compatible versions. Running outdated add-ons after a cluster upgrade is the most common source of post-upgrade incidents.
        </p>
        <CompareTable
          headers={['Add-on', 'What It Does', 'Upgrade Priority', 'Key Gotcha']}
          rows={[
            ['<strong>VPC CNI (aws-node)</strong>', 'Assigns VPC IPs to pods via ENI secondary IPs. Runs as DaemonSet.', 'FIRST — upgrade before nodes', 'Old CNI + new API server = pod IP assignment failures. Nodes join but pods cannot get IPs.'],
            ['<strong>CoreDNS</strong>', 'Cluster DNS — resolves Service names to ClusterIPs', 'Second', 'Default 2 replicas. At 100+ nodes, 2 CoreDNS pods become a bottleneck. Scale to at least 1 per 100 nodes.'],
            ['<strong>kube-proxy</strong>', 'Manages iptables/IPVS rules for Service routing. Runs on every node.', 'Third', 'Version must match cluster version. Drift causes Service routing inconsistencies.'],
            ['<strong>EBS CSI Driver</strong>', 'Provisions EBS volumes for PersistentVolumeClaims', 'After cluster upgrade', 'Requires its own IRSA role. Without IRSA, PVC provisioning silently fails — pods stay Pending.'],
          ]}
        />
        <CodeBlock language="bash">
{`# Check current add-on version and available versions for your cluster version
aws eks describe-addon-versions \
  --kubernetes-version 1.30 \
  --addon-name vpc-cni \
  --query 'addons[0].addonVersions[].addonVersion' \
  --output table

# Update an add-on to latest compatible version
aws eks update-addon \
  --cluster-name prod-eks \
  --addon-name vpc-cni \
  --addon-version v1.18.1-eksbuild.1 \
  --resolve-conflicts PRESERVE   # keep existing custom config (e.g., prefix delegation env vars)

# Wait for update to complete
aws eks wait addon-active \
  --cluster-name prod-eks \
  --addon-name vpc-cni

# Check add-on status
aws eks describe-addon \
  --cluster-name prod-eks \
  --addon-name vpc-cni \
  --query 'addon.{status:status, version:addonVersion}'`}
        </CodeBlock>
        <HighlightBox type="warn">OVERWRITE vs PRESERVE on add-on updates: if you have customized an add-on's ConfigMap (e.g., VPC CNI environment variables for prefix delegation, CoreDNS custom forwarders), use PRESERVE to retain your customizations. OVERWRITE resets to defaults — you lose your changes. When troubleshooting a broken add-on, OVERWRITE restores a known-good baseline, but document your customizations first.</HighlightBox>
      </Accordion>

      <Accordion title="Cluster Access — aws-auth vs Access Entries" icon={Key}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          There are two mechanisms to grant IAM identities access to an EKS cluster. The legacy way (aws-auth ConfigMap) is fragile. The new way (EKS Access Entries API, GA in 2024) is the correct path forward for all new clusters.
        </p>
        <CodeBlock language="yaml">
{`# OLD WAY — aws-auth ConfigMap in kube-system (avoid in new clusters)
# A single YAML editing mistake can lock out everyone including yourself
apiVersion: v1
kind: ConfigMap
metadata:
  name: aws-auth
  namespace: kube-system
data:
  mapRoles: |
    - rolearn: arn:aws:iam::123456789:role/eks-node-role
      username: system:node:{{EC2PrivateDNSName}}
      groups:
        - system:bootstrappers
        - system:nodes
    - rolearn: arn:aws:iam::123456789:role/devops-team-role
      username: devops-admin
      groups:
        - system:masters   # cluster-admin equivalent`}
        </CodeBlock>
        <CodeBlock language="bash">
{`# NEW WAY — EKS Access Entries (API-driven, no ConfigMap to corrupt)

# Set authentication mode to support Access Entries
aws eks update-cluster-config \
  --name prod-eks \
  --access-config authenticationMode=API_AND_CONFIG_MAP  # supports both during migration

# Create an access entry for an IAM role
aws eks create-access-entry \
  --cluster-name prod-eks \
  --principal-arn arn:aws:iam::123456789:role/devops-team-role \
  --type STANDARD

# Attach a pre-defined access policy
aws eks associate-access-policy \
  --cluster-name prod-eks \
  --principal-arn arn:aws:iam::123456789:role/devops-team-role \
  --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy \
  --access-scope '{"type": "cluster"}'

# Or namespace-scoped access
aws eks associate-access-policy \
  --cluster-name prod-eks \
  --principal-arn arn:aws:iam::123456789:role/payments-team-role \
  --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSEditPolicy \
  --access-scope '{
    "type": "namespace",
    "namespaces": ["payments-prod", "payments-staging"]
  }'`}
        </CodeBlock>
        <HighlightBox type="warn">The aws-auth ConfigMap is a single point of failure. A YAML indentation error (this file is YAML inside a ConfigMap data field, so doubly sensitive) can lock out every human and every CI system from the cluster. Recovery requires assuming the cluster creator's IAM role directly. The Access Entries API eliminates this risk — it is an AWS API call, not a ConfigMap edit.</HighlightBox>
        <HighlightBox type="tip">Migration from aws-auth to Access Entries: (1) Set authenticationMode to API_AND_CONFIG_MAP (supports both simultaneously). (2) Create Access Entries for all roles currently in aws-auth. (3) Validate that access works from each team. (4) Switch authenticationMode to API. (5) Remove aws-auth ConfigMap entries. This is a one-way migration — you cannot go back from API to CONFIG_MAP.</HighlightBox>
      </Accordion>

      <Accordion title="Cluster Upgrade Process — Minor Version by Minor Version" icon={RefreshCw}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Kubernetes only supports one minor version upgrade at a time: 1.27 to 1.28, then 1.28 to 1.29, etc. A three-version upgrade requires three separate upgrade windows.
        </p>
        <CodeBlock language="bash">
{`# Pre-upgrade checklist

# 1. Check for deprecated API versions that will be removed in the target version
kubectl api-resources --verbs=list --namespaced -o name | \
  xargs -n 1 kubectl get --show-kind --ignore-not-found -n default

# Better: use pluto to scan for deprecated API versions
pluto detect-all-in-cluster --target-versions k8s=v1.30.0

# 2. Check add-on compatibility for target version
aws eks describe-addon-versions \
  --kubernetes-version 1.30 \
  --query 'addons[].{name:addonName,version:addonVersions[0].addonVersion}' \
  --output table

# 3. Review release notes for breaking changes
# https://kubernetes.io/docs/reference/using-api/deprecation-guide/

# Upgrade process per minor version:

# Step 1: Upgrade control plane (takes 10-15 minutes, no downtime for running pods)
aws eks update-cluster-version \
  --name prod-eks \
  --kubernetes-version 1.30

# Wait for control plane to be active
aws eks wait cluster-active --name prod-eks

# Step 2: Upgrade add-ons in this order (VPC CNI first)
# vpc-cni, then coredns, then kube-proxy, then ebs-csi-driver
for ADDON in vpc-cni coredns kube-proxy aws-ebs-csi-driver; do
  LATEST=$(aws eks describe-addon-versions \
    --kubernetes-version 1.30 \
    --addon-name $ADDON \
    --query 'addons[0].addonVersions[0].addonVersion' --output text)
  aws eks update-addon \
    --cluster-name prod-eks \
    --addon-name $ADDON \
    --addon-version $LATEST \
    --resolve-conflicts PRESERVE
  aws eks wait addon-active --cluster-name prod-eks --addon-name $ADDON
done

# Step 3: Upgrade managed node groups
# EKS will cordon one node at a time, drain it, replace with new AMI, repeat
aws eks update-nodegroup-version \
  --cluster-name prod-eks \
  --nodegroup-name general

# Step 4: Validate
kubectl get nodes   # all nodes on new version
kubectl get pods -A | grep -v Running   # any pods not healthy?`}
        </CodeBlock>
        <HighlightBox type="warn">Test in staging before prod. The biggest upgrade risk is deprecated API versions — a Helm chart that uses a beta API removed in the target version will fail to deploy after upgrade. pluto and kubepug can scan your cluster before upgrading to identify these before they become incidents.</HighlightBox>
      </Accordion>

      <Accordion title="IRSA — Pod Identity for AWS Access" icon={Shield}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          IRSA (IAM Roles for Service Accounts) uses OIDC federation to give pods AWS credentials without static keys. The EKS cluster has an OIDC provider registered in IAM. Pods exchange a Kubernetes-signed JWT for temporary AWS credentials via STS.
        </p>
        <CodeBlock language="bash">
{`# Create IRSA role for a ServiceAccount (using eksctl for simplicity)
eksctl create iamserviceaccount \
  --cluster prod-eks \
  --namespace payments-prod \
  --name payments-api \
  --role-name payments-api-s3-role \
  --attach-policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess \
  --approve

# Or in Terraform — see AwsIam page for full trust policy pattern

# Debug IRSA: check if pod is getting the right identity
kubectl exec -n payments-prod payments-api-xxx -- \
  aws sts get-caller-identity
# Should return: payments-api-s3-role, not the node's instance role`}
        </CodeBlock>
        <HighlightBox>EKS Pod Identity is the newer alternative to IRSA (GA in 2023). It simplifies the setup — no OIDC provider to manage, no trust policy conditions to get right. It uses a new EKS API to associate IAM roles with ServiceAccounts. For new clusters, Pod Identity is simpler. For existing clusters with IRSA, there is no urgent need to migrate.</HighlightBox>
        <HighlightBox type="warn">Most common IRSA debugging scenario: pod gets AccessDenied. First check is <code>aws sts get-caller-identity</code> from inside the pod. If it returns the node's instance role instead of the IRSA role, the pod is not using the ServiceAccount correctly — either <code>serviceAccountName</code> is not set in the Deployment spec, or the ServiceAccount annotation is missing or wrong.</HighlightBox>
      </Accordion>
    </div>
  );
}
