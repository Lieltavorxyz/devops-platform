import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import HighlightBox from '../components/HighlightBox';
import CodeBlock from '../components/CodeBlock';
import CompareTable from '../components/CompareTable';
import { Network, Globe, Shield, TrendingDown, ArrowRightLeft } from 'lucide-react';

export default function AwsNetworking() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">AWS</div>
        <h1>AWS Networking</h1>
        <p>VPC design decisions, subnet sizing for EKS, multi-VPC connectivity patterns, and the routing and security controls that underpin every production workload.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Why Network Design Matters',
          body: 'Every AWS resource lives inside a VPC. Wrong subnet sizing causes IP exhaustion — pods cannot start. Wrong connectivity causes latency spikes and unexpected data transfer charges. Security group misconfigurations are the most common cause of "it works in dev, not in prod" incidents. Getting VPC design right from the start saves months of rework.'
        },
        {
          title: 'The Core Decisions',
          body: 'CIDR sizing (especially for EKS pod networking), public vs private subnet split, multi-AZ placement, and how VPCs connect to each other and to on-premises. These decisions are hard to change later — subnets cannot be resized, and VPC peering topologies have scaling limits.'
        }
      ]} />

      <Accordion title="VPC and Subnet Design" icon={Network} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The standard three-tier VPC model: public subnets for load balancers, private subnets for compute, isolated subnets for data. Each tier in separate subnets, controlled by security groups.
        </p>
        <CodeBlock language="hcl">
{`# Production VPC — sized for EKS growth
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "prod-vpc"
  cidr = "10.0.0.0/16"    # 65,536 IPs — plenty of room

  azs = ["us-east-1a", "us-east-1b", "us-east-1c"]

  # Public subnets — ALB/NLB only, no workloads
  public_subnets = [
    "10.0.0.0/24",    # 254 IPs per AZ — fine for LBs
    "10.0.1.0/24",
    "10.0.2.0/24"
  ]

  # Private subnets — EKS nodes + pods (VPC CNI uses real IPs)
  private_subnets = [
    "10.0.16.0/20",   # 4,094 IPs per AZ — sized for pod density
    "10.0.32.0/20",
    "10.0.48.0/20"
  ]

  # Data subnets — RDS, ElastiCache (no internet access at all)
  database_subnets = [
    "10.0.64.0/24",
    "10.0.65.0/24",
    "10.0.66.0/24"
  ]

  enable_nat_gateway   = true
  single_nat_gateway   = false   # one per AZ for HA (3x cost, but required for prod)
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Tags required by EKS and Karpenter for subnet discovery
  public_subnet_tags = {
    "kubernetes.io/role/elb"                    = "1"
    "kubernetes.io/cluster/prod-eks"            = "shared"
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"           = "1"
    "kubernetes.io/cluster/prod-eks"            = "shared"
    "karpenter.sh/discovery"                    = "prod-eks"
  }
}`}
        </CodeBlock>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">EKS IP exhaustion — the most common VPC mistake:</span> With VPC CNI (the EKS default), every pod gets a real VPC IP from your subnet. A node running 30 pods consumes 30 IPs (plus 1 for the node itself). A cluster with 50 nodes at 30 pods each needs 1,550+ IPs. A /24 subnet has 254 usable IPs. Size private subnets to at least /20 (4,094 IPs) per AZ for any non-trivial EKS cluster.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Prefix delegation:</span> Instead of one IP per pod, prefix delegation assigns a /28 block (16 IPs) per secondary ENI attachment. This dramatically increases pod density per node without consuming more subnets. Enable with VPC CNI environment variable <code>ENABLE_PREFIX_DELEGATION=true</code>.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Subnet tagging for EKS:</span> ALBs provisioned by the AWS Load Balancer Controller use tags to discover public subnets (<code>kubernetes.io/role/elb: 1</code>) and private subnets (<code>kubernetes.io/role/internal-elb: 1</code>). Missing these tags means load balancers fail to provision.</div>
          </li>
        </ul>
        <HighlightBox type="warn">Never use 172.16.0.0/12 or 192.168.0.0/16 as your VPC CIDR if you plan to connect to on-premises networks via VPN or Direct Connect. These RFC 1918 ranges are commonly used on-premises and will conflict, causing routing failures. Use 10.0.0.0/8 ranges and carve out non-overlapping /16 blocks per VPC.</HighlightBox>
      </Accordion>

      <Accordion title="Security Groups vs NACLs" icon={Shield}>
        <CompareTable
          headers={['Feature', 'Security Group', 'Network ACL']}
          rows={[
            ['Scope', 'ENI (elastic network interface) — per resource', 'Subnet — affects all resources in subnet'],
            ['State', 'Stateful — return traffic automatically allowed', 'Stateless — must explicitly allow return traffic (ephemeral ports 1024-65535)'],
            ['Rule types', 'Allow only — no deny rules', 'Allow and Deny — evaluated in order by rule number'],
            ['Evaluation', 'All rules evaluated, most permissive wins', 'Lowest numbered rule that matches wins (stop on first match)'],
            ['Default inbound', 'Deny all', 'Allow all'],
            ['Default outbound', 'Allow all', 'Allow all'],
          ]}
        />
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Practical rule:</span> Use security groups for all fine-grained access control. Reference other SGs rather than IP addresses — <code>source: sg-payments-api</code> instead of CIDR ranges. This is more maintainable as IPs change.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">When to use NACLs:</span> Blocking a specific CIDR range at the subnet level (known malicious IP, emergency block during an attack). NACLs also provide a defense-in-depth layer — a misconfigured SG that allows too much can be partially compensated by NACLs.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">NACL ephemeral port gotcha:</span> Because NACLs are stateless, you must allow inbound AND outbound ephemeral ports (1024-65535) for any TCP service. Forgetting outbound ephemeral ports causes connections to fail silently — the request goes in but the response is dropped.</div>
          </li>
        </ul>
        <CodeBlock language="hcl">
{`# Security group pattern: reference other SGs instead of CIDRs
resource "aws_security_group_rule" "payments_from_alb" {
  type                     = "ingress"
  security_group_id        = aws_security_group.payments_api.id
  source_security_group_id = aws_security_group.alb.id  # only from ALB
  protocol                 = "tcp"
  from_port                = 8080
  to_port                  = 8080
  description              = "Allow traffic from ALB"
}

resource "aws_security_group_rule" "payments_to_rds" {
  type                     = "egress"
  security_group_id        = aws_security_group.payments_api.id
  destination_security_group_id = aws_security_group.rds.id
  protocol                 = "tcp"
  from_port                = 5432
  to_port                  = 5432
  description              = "Payments API to PostgreSQL"
}`}
        </CodeBlock>
      </Accordion>

      <Accordion title="Multi-VPC Connectivity Patterns" icon={ArrowRightLeft}>
        <CompareTable
          headers={['Option', 'Use Case', 'Transitive Routing', 'Max VPCs', 'Cost']}
          rows={[
            ['<strong>VPC Peering</strong>', 'Direct 1:1 connection between two VPCs', 'No — VPC A → B → C does not work, need A → C peering separately', 'Becomes unmanageable above ~10 VPCs (n*(n-1)/2 connections)', 'No hourly cost, data transfer charges apply'],
            ['<strong>Transit Gateway (TGW)</strong>', 'Hub-and-spoke for many VPCs, plus VPN/Direct Connect', 'Yes — TGW routes between any attached VPC', 'Thousands of VPCs and VPN connections', '$0.05/hr per attachment + data transfer'],
            ['<strong>PrivateLink</strong>', 'Expose one specific service endpoint privately across accounts/VPCs', 'N/A — service-specific, not VPC routing', 'Any scale', '$0.01/hr per endpoint + data transfer'],
            ['<strong>VPN + TGW</strong>', 'Connect on-premises to AWS', 'Yes via TGW', 'Depends on VPN bandwidth', '$0.05/hr per VPN connection'],
          ]}
        />
        <HighlightBox type="tip">At fewer than 5-7 VPCs, VPC peering is simpler and cheaper. Once you have more VPCs, Transit Gateway pays for itself in reduced management overhead. The key limitation of peering is no transitive routing — every VPC pair that needs to communicate requires its own peering connection, which grows as O(n^2).</HighlightBox>
        <CodeBlock language="hcl">
{`# Transit Gateway — central hub for all VPC connections
resource "aws_ec2_transit_gateway" "main" {
  description                     = "org-transit-gateway"
  auto_accept_shared_attachments  = "enable"
  default_route_table_association = "enable"
  default_route_table_propagation = "enable"
  tags = { Name = "org-tgw" }
}

# Attach a VPC to TGW
resource "aws_ec2_transit_gateway_vpc_attachment" "prod" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = module.prod_vpc.vpc_id
  subnet_ids         = module.prod_vpc.private_subnets
}

# Add route in VPC route table pointing to TGW
resource "aws_route" "prod_to_tgw" {
  route_table_id         = module.prod_vpc.private_route_table_ids[0]
  destination_cidr_block = "10.0.0.0/8"   # all org traffic through TGW
  transit_gateway_id     = aws_ec2_transit_gateway.main.id
}`}
        </CodeBlock>
      </Accordion>

      <Accordion title="NAT Gateway and Data Transfer Costs" icon={TrendingDown}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          NAT Gateway enables private subnet resources to initiate outbound internet connections (pulling container images, calling external APIs) without having public IP addresses. It is often the second or third largest AWS billing line item in EKS clusters.
        </p>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Cost structure:</span> $0.045/hour per NAT Gateway + $0.045/GB processed. With three AZs and 1TB of monthly outbound traffic: ~$100/month in NAT Gateway fees, not counting EC2 data transfer charges. At scale, this is significant.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">VPC Gateway Endpoints (free):</span> S3 and DynamoDB traffic can be routed through Gateway Endpoints, which route through the AWS backbone and bypass NAT Gateway entirely. This is free and should always be enabled. In an EKS cluster that downloads large artifacts from S3, this can eliminate significant NAT costs.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">ECR VPC Interface Endpoint:</span> EKS nodes pulling container images from ECR go through NAT Gateway by default (ECR uses HTTPS over the internet). A VPC Interface Endpoint for ECR routes this traffic through the AWS network, avoiding NAT Gateway processing charges. At scale with large images, this pays for itself quickly.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Cross-AZ data transfer:</span> Traffic between resources in different AZs within the same region costs $0.01/GB each direction. In EKS, pod-to-pod traffic across AZs is common. Topology-aware routing (enabled by the EKS topology-aware hints feature) routes pod traffic preferentially to same-AZ endpoints, reducing cross-AZ transfer charges.</div>
          </li>
        </ul>
        <CodeBlock language="hcl">
{`# VPC Gateway Endpoints — free, always enable
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = module.vpc.vpc_id
  service_name = "com.amazonaws.us-east-1.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids = concat(
    module.vpc.private_route_table_ids,
    module.vpc.public_route_table_ids
  )
}

resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id       = module.vpc.vpc_id
  service_name = "com.amazonaws.us-east-1.dynamodb"
  vpc_endpoint_type = "Gateway"
  route_table_ids = module.vpc.private_route_table_ids
}

# ECR Interface Endpoints (paid, but saves NAT costs for large image pulls)
resource "aws_vpc_endpoint" "ecr_api" {
  vpc_id              = module.vpc.vpc_id
  service_name        = "com.amazonaws.us-east-1.ecr.api"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = module.vpc.private_subnets
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}

resource "aws_vpc_endpoint" "ecr_dkr" {
  vpc_id              = module.vpc.vpc_id
  service_name        = "com.amazonaws.us-east-1.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = module.vpc.private_subnets
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}`}
        </CodeBlock>
      </Accordion>

      <Accordion title="DNS Resolution — Route53 and Split-Horizon" icon={Globe}>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Private hosted zones:</span> Route53 private hosted zones resolve internal service names to private IPs within the VPC. <code>payments.internal.mycompany.com</code> resolves to the internal ALB IP when queried from within the VPC, and does not resolve at all from the internet.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Split-horizon DNS:</span> The same domain resolves to different IPs depending on where the query originates. External users hitting <code>api.mycompany.com</code> get the public ALB IP. Internal services hitting the same name get the private IP, skipping the internet and CDN. Implemented with a private hosted zone that overrides the public zone.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Route53 health checks and failover:</span> Route53 can monitor endpoints and automatically change DNS records when health checks fail. Weighted routing, latency-based routing, and failover routing enable multi-region active-passive and active-active architectures at the DNS layer.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">VPC resolver rules:</span> For hybrid connectivity (on-premises + AWS), Route53 Resolver rules forward specific DNS queries to on-premises DNS servers. Inbound resolvers let on-premises resources resolve AWS private hosted zones.</div>
          </li>
        </ul>
        <HighlightBox type="warn">TTL and incident response: if an ALB DNS name is cached with a high TTL during a failure event, Route53 health-check-based failover cannot help — clients keep using the cached IP. Design for low TTL on critical endpoints (60-300 seconds) to allow fast DNS-based failover.</HighlightBox>
      </Accordion>
    </div>
  );
}
