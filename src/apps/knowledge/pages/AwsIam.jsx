import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import NotesBox from '../components/NotesBox';
import HighlightBox from '../components/HighlightBox';
import CompareTable from '../components/CompareTable';
import CodeBlock from '../components/CodeBlock';

export default function AwsIam() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">{'\uD83D\uDD10'} AWS IAM</div>
        <h1>IAM & Security</h1>
        <p>Least privilege, IRSA, cross-account patterns, and practical IAM design.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'The Problem',
          body: 'AWS IAM is the most powerful attack surface in your infrastructure. A misconfigured role can mean full account compromise. The challenge is enforcing least privilege at scale \u2014 across 3+ accounts, dozens of services, and CI/CD pipelines \u2014 without creating IAM that\'s so restrictive it blocks legitimate work.'
        },
        {
          title: 'The Layered Model',
          body: 'IAM is enforced at multiple layers: SCPs (org-level, can\'t be overridden), Permission Boundaries (account-level cap), IAM Policies (identity-level allow/deny), Resource Policies (resource-level). Understanding which layer to use for which control is the difference between good and bad IAM design.'
        }
      ]} />

      <Accordion title="Cross-Account Role Assumption — Trust Policies & External ID" icon={'\uD83D\uDD04'} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Cross-account access is the foundation of multi-account AWS architectures. A role in Account B trusts Account A to assume it. The calling entity in Account A uses STS AssumeRole to get temporary credentials.
        </p>
        <CodeBlock>{`// Role in prod account (Account B) — trust policy allows tooling account to assume it
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::111111111111:role/ci-deploy-role"
    },                              // only the CI role, not the whole account
    "Action": "sts:AssumeRole",
    "Condition": {
      "StringEquals": {
        "sts:ExternalId": "prod-deploy-2024"   // confused deputy protection
      }
    }
  }]
}`}</CodeBlock>
        <HighlightBox>Confused deputy attack: Without ExternalId, any entity that trusts your tooling account could trick it into assuming your prod role. ExternalId is a shared secret {'\u2014'} only legitimate callers know it. Required when your role is assumed by third-party services (e.g., Datadog, Terraform Cloud, external CI).</HighlightBox>
        <CodeBlock>{`# Assuming the role from the tooling account
aws sts assume-role \\
  --role-arn arn:aws:iam::999999999999:role/prod-deploy-role \\
  --role-session-name ci-deploy-session \\
  --external-id prod-deploy-2024

# Session tags — propagated into CloudTrail, useful for auditability
  --tags Key=Environment,Value=prod Key=Requester,Value=github-actions`}</CodeBlock>
        <HighlightBox type="tip">Session tags for audit: When CI/CD pipelines assume roles, add session tags (--tags) with the pipeline name, environment, and triggering user. These tags appear in CloudTrail logs, making it easy to trace which pipeline deployment touched which resource.</HighlightBox>
        <NotesBox id="iam-cross-account" placeholder="Did your team use cross-account roles? How was the tooling account structured? Any issues with role assumption or session expiry?" />
      </Accordion>

      <Accordion title="Permission Boundaries — Delegating IAM Without Giving Up Control" icon={'\uD83E\uDDF1'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Permission boundaries set the maximum permissions an IAM entity can have, regardless of what policies are attached. They're the tool you use when you want to let teams create their own IAM roles without being able to escalate beyond a defined scope.
        </p>
        <HighlightBox type="warn">Common misconception: Permission boundaries don't grant permissions {'\u2014'} they only limit them. A role needs both: an attached policy that allows something AND a permission boundary that doesn't deny it. If either side blocks, the action is denied.</HighlightBox>
        <CodeBlock>{`// Boundary policy — defines the ceiling for any role created in this account
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowComputeAndStorage",
      "Effect": "Allow",
      "Action": ["ec2:*", "s3:*", "eks:*", "ecr:*"],
      "Resource": "*"
    },
    {
      "Sid": "DenyIAMEscalation",
      "Effect": "Deny",
      "Action": [
        "iam:CreateRole",        // can't create new roles
        "iam:AttachRolePolicy",   // can't attach arbitrary policies
        "iam:PutRolePolicy"       // can't inline policies
      ],
      "Resource": "*"
    }
  ]
}`}</CodeBlock>
        <HighlightBox type="tip">When to use boundaries: (1) You're giving a developer account admin rights but don't want them to create IAM roles with more permissions than they have. (2) A team creates service roles via Terraform but you need to cap what those roles can do. (3) A third-party vendor gets access {'\u2014'} you want them unable to exfiltrate beyond a defined set of services.</HighlightBox>
      </Accordion>

      <Accordion title="SCPs — Org-Level Guardrails That Override Everything" icon={'\uD83C\uDFE2'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Service Control Policies (SCPs) are attached to AWS Organizations OUs or accounts. They define the maximum permissions for everything in that OU {'\u2014'} including the root user. An SCP deny cannot be overridden by any IAM policy in the child account.
        </p>
        <CompareTable
          headers={['Layer', 'Scope', 'Override?', 'Managed By']}
          rows={[
            ['<strong>SCP</strong>', 'Entire account / OU', 'Cannot be overridden', 'Org / Platform team'],
            ['<strong>Permission Boundary</strong>', 'Single IAM entity', 'Overridden by SCP denies', 'Account admin'],
            ['<strong>IAM Policy</strong>', 'Single IAM identity', 'Constrained by SCP + boundary', 'Team / Terraform'],
            ['<strong>Resource Policy</strong>', 'Single resource (S3, KMS)', 'Constrained by SCP', 'Resource owner'],
          ]}
        />
        <CodeBlock>{`// SCP: Deny creation of resources outside approved regions
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyNonApprovedRegions",
    "Effect": "Deny",
    "NotAction": [         // global services exempt from region check
      "iam:*", "sts:*", "support:*", "route53:*", "cloudfront:*"
    ],
    "Resource": "*",
    "Condition": {
      "StringNotIn": {
        "aws:RequestedRegion": ["eu-west-1", "us-east-1"]
      }
    }
  }]
}`}</CodeBlock>
        <HighlightBox type="warn">SCP doesn't apply to management account: The Org root account (management account) is exempt from SCPs. This is why you should use the management account for nothing except org management. All actual workloads go in member accounts.</HighlightBox>
        <NotesBox id="iam-scps" placeholder="Did your org use SCPs? Which guardrails were enforced? Did SCPs ever block legitimate work and cause a debugging session?" />
      </Accordion>

      <Accordion title="IRSA Full Flow — OIDC, Trust Policy, Token Exchange" icon={'\uD83E\uDEAA'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          IRSA (IAM Roles for Service Accounts) lets a Kubernetes pod assume an AWS IAM role without static credentials. The flow uses OIDC federation {'\u2014'} the pod presents a Kubernetes-signed JWT, AWS STS verifies it against the cluster's OIDC provider, and returns temporary AWS credentials.
        </p>
        <HighlightBox>Full IRSA flow: (1) EKS cluster has an OIDC provider registered in IAM. (2) IAM role has a trust policy allowing the ServiceAccount's OIDC identity to assume it. (3) Pod's ServiceAccount is annotated with the IAM role ARN. (4) EKS injects a projected token volume into the pod. (5) AWS SDK calls STS AssumeRoleWithWebIdentity automatically. (6) STS validates the token, returns temp creds (valid 1hr by default).</HighlightBox>
        <CodeBlock>{`# Step 1: OIDC provider (Terraform — usually handled by the EKS module)
data "tls_certificate" "eks" {
  url = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks" {
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks.certificates[0].sha1_fingerprint]
}

# Step 2: IAM role with trust policy for the ServiceAccount
resource "aws_iam_role" "s3_reader" {
  name = "eks-s3-reader"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.eks.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "\${aws_iam_openid_connect_provider.eks.url}:sub" =
            "system:serviceaccount:my-namespace:my-service-account"
          "\${aws_iam_openid_connect_provider.eks.url}:aud" =
            "sts.amazonaws.com"
        }
      }
    }]
  })
}

# Step 3: Kubernetes ServiceAccount annotation
# ---
# apiVersion: v1
# kind: ServiceAccount
# metadata:
#   name: my-service-account
#   namespace: my-namespace
#   annotations:
#     eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/eks-s3-reader`}</CodeBlock>
        <HighlightBox type="warn">Most common IRSA failures: (1) AccessDenied on AssumeRoleWithWebIdentity {'\u2014'} trust policy :sub condition doesn't match namespace+SA name exactly (case-sensitive). (2) Pod uses wrong SA {'\u2014'} always set serviceAccountName in Deployment spec. (3) OIDC provider thumbprint is wrong after cert rotation {'\u2014'} breaks all IRSA in the cluster.</HighlightBox>
        <NotesBox id="iam-irsa" placeholder="How did you set up IRSA? Terraform module or manual? Any debugging sessions for AssumeRoleWithWebIdentity failures?" />
      </Accordion>

      <Accordion title="Architecture Interview Q&A" icon={'\uD83C\uDFAF'}>
        <HighlightBox>
          <strong>Q: Design IAM for 3 AWS accounts (dev/staging/prod) with a shared tooling account running CI/CD.</strong><br/><br/>
          The tooling account hosts CI/CD runners (GitHub Actions OIDC-federated). Each target account has a deploy role that trusts the tooling account's CI role {'\u2014'} with ExternalId for confused deputy protection. In tooling: CI runners have a role with only sts:AssumeRole permissions targeting specific roles in child accounts. No direct service permissions in tooling. In each child account: deploy roles scoped to what the pipeline needs (ecr:*, eks:*, s3:PutObject on deployment bucket only). SCP at OU level: deny region creation outside approved regions, deny disabling GuardDuty/CloudTrail, deny leaving the org. Permission boundaries on all CI-created roles in child accounts. IRSA on EKS workloads: pods get AWS credentials via OIDC federation, no static keys anywhere.
        </HighlightBox>
        <HighlightBox>
          <strong>Q: A developer reports AccessDenied when their pod tries to write to S3. The IAM policy looks correct. What do you check?</strong><br/><br/>
          IAM is evaluated as: SCP {'\u2192'} Permission Boundary {'\u2192'} Identity Policy {'\u2192'} Resource Policy (S3) {'\u2192'} S3 ACL. Check all five. (1) Is the pod assuming the right IAM role? Run <code>aws sts get-caller-identity</code> from inside the pod {'\u2014'} developers often forget to set serviceAccountName, so pod runs with the node role instead of the IRSA role. (2) Is the IRSA trust policy :sub condition correct? (3) Is there an S3 bucket policy explicitly denying this role? Resource policies with explicit deny override identity policies. (4) Is there an SCP restricting S3 in this region? (5) Does the IAM role have a permission boundary that doesn't include s3:PutObject?
        </HighlightBox>
        <HighlightBox>
          <strong>Q: When would you use a permission boundary vs an SCP for restricting what teams can do?</strong><br/><br/>
          SCPs are blunt and account-wide {'\u2014'} best for non-negotiable guardrails (no resources outside approved regions, no disabling security tooling, no leaving the org). Set once at OU level. Permission boundaries are role-specific {'\u2014'} best when delegating IAM self-service to a team but constraining blast radius. Example: letting the payments team create their own Lambda execution roles in Terraform, but those roles can't have IAM permissions, can't access another team's S3 buckets. The boundary is attached when the team creates the role, enforced by an SCP that says "you can only create IAM roles if you attach this specific permission boundary".
        </HighlightBox>
      </Accordion>
    </div>
  );
}
