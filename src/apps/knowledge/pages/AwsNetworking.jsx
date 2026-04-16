import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import NotesBox from '../components/NotesBox';
import HighlightBox from '../components/HighlightBox';
import CompareTable from '../components/CompareTable';

export default function AwsNetworking() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">{'\uD83C\uDF10'} AWS</div>
        <h1>AWS Networking</h1>
        <p>VPC design, subnet strategy, routing decisions — the foundation of everything else in AWS.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Why Networking Matters',
          body: "Every AWS resource lives inside a VPC. If the network design is wrong, you'll hit IP exhaustion, connectivity issues, and security gaps that are painful to fix later. Getting VPC design right from the start saves months of rework."
        },
        {
          title: 'The Core Design Decision',
          body: 'Public vs private subnets, CIDR sizing for growth (especially with EKS pod networking), and multi-AZ for availability. These three decisions shape everything else — security groups, routing, and cross-VPC connectivity.'
        }
      ]} />

      <Accordion title="VPC & Subnet Design" icon={'\uD83C\uDFD7\uFE0F'} defaultOpen={true}>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Public vs Private subnets:</span> Public = has a route to Internet Gateway, resources get public IPs. Private = no direct internet access, uses NAT Gateway for outbound. Default: everything in private subnets, only load balancers in public.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">3-tier model:</span> Public (ALB/NLB) {'\u2192'} Private app (EKS nodes, EC2) {'\u2192'} Private data (RDS, ElastiCache). Each tier in its own subnet, security groups enforce the flow between tiers.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">CIDR sizing:</span> Plan for growth. /16 VPC gives 65K IPs. EKS especially consumes IPs fast — each pod gets its own IP from the VPC CIDR (with VPC CNI). Under-sizing = IP exhaustion = pods can't start.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Multi-AZ:</span> Always deploy subnets across {'\u2265'}2 AZs (ideally 3). If one AZ goes down, your service stays up. This means your NAT Gateway cost triples — but it's a hard requirement for production.</div>
          </li>
        </ul>
        <HighlightBox type="tip">A common EKS gotcha: with VPC CNI, each pod consumes a real VPC IP. A cluster with 500 pods can easily exhaust a /24 subnet (254 IPs). Size your subnets to at least /19 for EKS workloads.</HighlightBox>
        <NotesBox id="aws-vpc-design" placeholder="How was your VPC structured? How many AZs? Any IP exhaustion issues? How were subnets sized for EKS?" />
      </Accordion>

      <Accordion title="Multi-VPC Connectivity" icon={'\uD83D\uDD17'}>
        <CompareTable
          headers={['Option', 'Use Case', 'Trade-off']}
          rows={[
            ['<strong>VPC Peering</strong>', 'Simple, direct 1:1 connection between 2 VPCs', "Doesn't scale past ~10 VPCs. No transitive routing."],
            ['<strong>Transit Gateway (TGW)</strong>', 'Hub-and-spoke for many VPCs (10+). Central routing table.', '<span class="tag green">Preferred at scale</span> — also connects on-prem via VPN/DX'],
            ['<strong>PrivateLink</strong>', 'Expose a specific service endpoint privately across accounts/VPCs', 'More secure, service-specific. Good for SaaS or internal platform teams.'],
          ]}
        />
        <NotesBox id="aws-multi-vpc" placeholder="Did your org use TGW or VPC peering? How many VPCs? Cross-account patterns?" />
      </Accordion>

      <Accordion title="Security Groups vs NACLs" icon={'\uD83D\uDEE1\uFE0F'}>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Security Groups:</span> Stateful, attached to ENIs (instances/pods). Default: deny all inbound, allow all outbound. Preferred for most access control — rules reference other SGs, not just IPs.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">NACLs:</span> Stateless, applied at subnet level. Must define inbound AND outbound rules (ephemeral ports!). Use for broad subnet-level blocking, rarely for fine-grained control.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Practical rule:</span> Do everything in security groups. Use NACLs only if you need to block specific CIDR ranges at the subnet level (e.g., blocking a known malicious range).</div>
          </li>
        </ul>
        <CompareTable
          headers={['Feature', 'Security Group', 'NACL']}
          rows={[
            ['Scope', 'ENI (instance/pod)', 'Subnet'],
            ['Stateful', 'Yes — return traffic auto-allowed', 'No — must explicitly allow return traffic'],
            ['Rule type', 'Allow only', 'Allow and Deny'],
            ['Evaluation', 'All rules evaluated', 'Rules evaluated in order (lowest number first)'],
            ['Default', 'Deny inbound, allow outbound', 'Allow all inbound and outbound'],
          ]}
        />
        <NotesBox id="aws-sg-nacl" placeholder="How did your team manage security groups? Per-service? Any automation for SG rules? Did you ever use NACLs?" />
      </Accordion>

      <Accordion title="NAT Gateway & Routing" icon={'\uD83D\uDEA6'}>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">NAT Gateway:</span> Allows private subnet resources to reach the internet (e.g., pull container images, call external APIs) without being reachable from the internet. Deployed in public subnets, referenced by private subnet route tables.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Cost consideration:</span> NAT Gateway charges per hour + per GB processed. At scale, this is one of the biggest line items on the AWS bill. One NAT GW per AZ for HA = 3x the cost. Use VPC endpoints (Gateway type) for S3 and DynamoDB to avoid NAT charges for AWS service traffic.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">VPC Endpoints:</span> Gateway endpoints (S3, DynamoDB) are free and route through route tables. Interface endpoints (everything else) use ENIs and cost money, but keep traffic off the public internet.</div>
          </li>
        </ul>
        <HighlightBox type="warn">A common cost surprise: EKS nodes pulling container images from ECR go through NAT Gateway by default. Setting up a VPC endpoint for ECR can save significant data transfer costs in large clusters.</HighlightBox>
      </Accordion>

      <Accordion title="Common Interview Questions" icon={'\u26A1'}>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2753'}</span>
            <div><span className="label">"How would you design a VPC for a production EKS cluster?"</span> — "I'd use a /16 VPC with at least 3 AZs. Public subnets (/24) for ALBs only. Private subnets (/19 minimum) for EKS nodes — oversized because VPC CNI assigns a pod-per-IP. Separate private subnets for data tier (RDS, ElastiCache). NAT Gateway per AZ for HA. VPC endpoints for S3, ECR, and DynamoDB to reduce NAT costs."</div>
          </li>
          <li>
            <span className="bullet">{'\u2753'}</span>
            <div><span className="label">"VPC Peering vs Transit Gateway?"</span> — "Peering for simple 1:1 connections — it's free for same-region and low latency. But it doesn't support transitive routing, so with 10+ VPCs it becomes unmanageable (n*(n-1)/2 connections). TGW is hub-and-spoke — one central router, scales to hundreds of VPCs, also connects on-prem via VPN or Direct Connect."</div>
          </li>
          <li>
            <span className="bullet">{'\u2753'}</span>
            <div><span className="label">"What's the difference between Security Groups and NACLs?"</span> — "Security groups are stateful (return traffic auto-allowed), operate at the ENI level, and only have allow rules. NACLs are stateless (must allow return traffic explicitly), operate at the subnet level, and support deny rules. In practice, I do 99% of access control with security groups and only use NACLs for broad subnet-level blocking."</div>
          </li>
        </ul>
      </Accordion>
    </div>
  );
}
