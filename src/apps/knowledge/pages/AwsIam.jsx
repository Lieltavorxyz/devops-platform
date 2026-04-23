import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import HighlightBox from '../components/HighlightBox';
import CodeBlock from '../components/CodeBlock';
import CompareTable from '../components/CompareTable';
import { Shield, Lock, Key, ArrowRightLeft, Globe, AlertTriangle } from 'lucide-react';

export default function AwsIam() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">AWS IAM</div>
        <h1>IAM and Security</h1>
        <p>How IAM authorization is evaluated across layers, cross-account role assumption, permission boundaries, SCPs, and IRSA internals.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'The Layered Authorization Model',
          body: 'AWS IAM evaluates authorization across multiple layers in order: SCPs (org-wide ceiling that cannot be overridden) → Permission Boundaries (cap on what an identity can ever do) → Identity Policies (what is explicitly allowed) → Resource Policies (what the resource allows). An explicit deny at any layer wins. Understanding which layer to use for which control is what separates good IAM design from security theater.'
        },
        {
          title: 'The Least Privilege Problem',
          body: 'Least privilege is obvious in principle but hard at scale — across 3+ accounts, dozens of services, and CI/CD pipelines running automatically. The failure mode is over-permission: wildcards in actions, wildcards in resources, no conditions. The cost is discovered only when a compromise happens.'
        }
      ]} />

      <Accordion title="Cross-Account Role Assumption" icon={ArrowRightLeft} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Cross-account access is the foundation of multi-account AWS architectures. An IAM role in Account B has a trust policy that allows Account A to assume it. Entities in Account A call STS AssumeRole to get temporary credentials for Account B.
        </p>
        <CodeBlock language="json">
{`// Trust policy on the role in Account B (prod)
// Only allows a specific CI role from Account A (tooling) to assume it
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::111111111111:role/github-actions-ci-role"
    },
    "Action": "sts:AssumeRole",
    "Condition": {
      "StringEquals": {
        "sts:ExternalId": "prod-deploy-abc123"
      },
      "StringLike": {
        "aws:RequestedRegion": "us-east-1"
      }
    }
  }]
}`}
        </CodeBlock>
        <CodeBlock language="bash">
{`# Assuming the cross-account role from the tooling account
aws sts assume-role \
  --role-arn arn:aws:iam::999999999999:role/prod-deploy-role \
  --role-session-name github-actions-deploy-${GITHUB_RUN_ID} \
  --external-id prod-deploy-abc123 \
  --duration-seconds 3600 \
  --tags Key=Environment,Value=prod Key=Requester,Value=github-actions

# Parse credentials from the response
export AWS_ACCESS_KEY_ID=$(...)
export AWS_SECRET_ACCESS_KEY=$(...)
export AWS_SESSION_TOKEN=(...)`}
        </CodeBlock>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">ExternalId — confused deputy protection:</span> Without ExternalId, any entity in Account A that is allowed to call STS could be tricked into assuming your prod role by a malicious third party. ExternalId is a shared secret — only your legitimate CI system knows it. Required when the role is assumed by third-party services (Datadog, Terraform Cloud, external CICD).</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Session naming:</span> Set the session name to something auditable: the GitHub run ID, the pipeline name, the committer's username. This appears in CloudTrail logs as the username, making it easy to trace which pipeline run made which API call.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Session duration:</span> The default is 1 hour. Maximum is 12 hours (set on the role's MaxSessionDuration). For long-running pipelines, either extend the duration or implement token refresh logic. A deploy that exceeds the session duration will fail with an ExpiredTokenException mid-run.</div>
          </li>
        </ul>
        <HighlightBox type="tip">GitHub Actions OIDC federation eliminates the need for static AWS credentials stored as GitHub secrets. The workflow exchanges a GitHub OIDC token directly for AWS credentials via a trust policy. No aws-actions/configure-aws-credentials with stored keys — just role assumption via OIDC. This is the current best practice for CI/CD accessing AWS.</HighlightBox>
      </Accordion>

      <Accordion title="IRSA — Full OIDC Federation Flow" icon={Key}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          IRSA (IAM Roles for Service Accounts) lets Kubernetes pods assume AWS IAM roles without static credentials. The mechanism is OIDC federation: the EKS cluster is an OIDC provider, the pod presents a signed JWT, STS validates it and returns temporary credentials.
        </p>
        <CodeBlock language="hcl">
{`# Step 1: Create the OIDC provider for the cluster
data "tls_certificate" "eks" {
  url = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks" {
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks.certificates[0].sha1_fingerprint]
}

# Step 2: Create the IAM role with a trust policy scoped to a specific ServiceAccount
resource "aws_iam_role" "payments_api" {
  name = "eks-payments-api-prod"

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
          # Must match: system:serviceaccount:<namespace>:<serviceaccount-name>
          "${aws_iam_openid_connect_provider.eks.url}:sub" =
            "system:serviceaccount:payments-prod:payments-api"
          # Prevents tokens meant for other audiences
          "${aws_iam_openid_connect_provider.eks.url}:aud" =
            "sts.amazonaws.com"
        }
      }
    }]
  })
}

# Attach the minimal required policy
resource "aws_iam_role_policy" "payments_api_s3" {
  name = "payments-api-s3-access"
  role = aws_iam_role.payments_api.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject", "s3:PutObject"]
      Resource = "arn:aws:s3:::payments-receipts-prod/*"
    }]
  })
}`}
        </CodeBlock>
        <CodeBlock language="yaml">
{`# Step 3: Annotate the ServiceAccount
apiVersion: v1
kind: ServiceAccount
metadata:
  name: payments-api
  namespace: payments-prod
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/eks-payments-api-prod
    eks.amazonaws.com/token-expiration: "86400"   # 24hr token (default 1hr)`}
        </CodeBlock>
        <HighlightBox type="warn">Top 3 IRSA failures: (1) Trust policy :sub condition does not match exactly — it is case-sensitive and must be <code>system:serviceaccount:NAMESPACE:SA-NAME</code>. (2) Deployment does not set <code>serviceAccountName</code> — pod uses the default SA and gets no AWS credentials. (3) OIDC provider thumbprint is wrong after an AWS certificate rotation — breaks all IRSA in the cluster. Regenerate the thumbprint and update the OIDC provider resource.</HighlightBox>
      </Accordion>

      <Accordion title="Permission Boundaries — Delegating IAM Without Escalation" icon={Shield}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Permission boundaries set the maximum permissions an IAM identity can have, regardless of what policies are attached. They do not grant permissions — they only cap them. Both the boundary and the identity policy must allow an action for it to succeed.
        </p>
        <CodeBlock language="json">
{`// Boundary policy: teams can create roles for their Lambda functions,
// but those roles cannot have IAM permissions or access other teams' resources
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowApplicationServices",
      "Effect": "Allow",
      "Action": [
        "s3:*",
        "dynamodb:*",
        "sqs:*",
        "sns:*",
        "logs:*",
        "cloudwatch:*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "DenyIAMEscalation",
      "Effect": "Deny",
      "Action": [
        "iam:CreateRole",
        "iam:AttachRolePolicy",
        "iam:PutRolePolicy",
        "iam:PassRole"
      ],
      "Resource": "*"
    },
    {
      "Sid": "DenyOtherTeamsResources",
      "Effect": "Deny",
      "Action": "*",
      "Resource": [
        "arn:aws:s3:::other-team-*",
        "arn:aws:dynamodb:*:*:table/other-team-*"
      ]
    }
  ]
}`}
        </CodeBlock>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Enforcement pattern:</span> Require teams to attach a specific permission boundary when creating IAM roles. Enforce this via an SCP: "You can only create IAM roles if you attach the <code>standard-developer-boundary</code> permission boundary." Without this SCP, the boundary is voluntary and ineffective.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">The common misconception:</span> Many engineers think attaching a boundary grants permissions. It does not. If the boundary allows S3 but the identity policy does not, S3 is denied. Both must allow. The boundary is a ceiling, not a floor.</div>
          </li>
        </ul>
      </Accordion>

      <Accordion title="Service Control Policies — Org-Level Guardrails" icon={Globe}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          SCPs are attached to AWS Organizations OUs or accounts. They define the maximum permissions for everything in that scope — including the root user of the account. An SCP deny cannot be overridden by any identity or resource policy in a child account.
        </p>
        <CompareTable
          headers={['Layer', 'Scope', 'Can Override?', 'Typical Owner']}
          rows={[
            ['<strong>SCP</strong>', 'Entire account or OU', 'Cannot be overridden by anything in child account', 'Platform/security team in management account'],
            ['<strong>Permission Boundary</strong>', 'Single IAM identity', 'Overridden by SCP denies', 'Account admin or Terraform automation'],
            ['<strong>IAM Identity Policy</strong>', 'Single IAM user/role', 'Constrained by SCP and boundary', 'Team / service Terraform'],
            ['<strong>Resource Policy</strong>', 'Single resource (S3, KMS, Lambda)', 'Constrained by SCP', 'Resource owner'],
          ]}
        />
        <CodeBlock language="json">
{`// SCP: Deny resource creation outside approved regions
// Apply to all workload OUs — management account is exempt from SCPs
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyNonApprovedRegions",
      "Effect": "Deny",
      "NotAction": [
        "iam:*",
        "sts:*",
        "support:*",
        "route53:*",
        "cloudfront:*",
        "waf:*"
      ],
      "Resource": "*",
      "Condition": {
        "StringNotIn": {
          "aws:RequestedRegion": ["eu-west-1", "us-east-1"]
        }
      }
    },
    {
      "Sid": "DenyDisablingSecurityServices",
      "Effect": "Deny",
      "Action": [
        "guardduty:DeleteDetector",
        "guardduty:DisassociateFromMasterAccount",
        "cloudtrail:DeleteTrail",
        "cloudtrail:StopLogging",
        "config:DeleteDeliveryChannel",
        "securityhub:DisableSecurityHub"
      ],
      "Resource": "*"
    },
    {
      "Sid": "DenyLeavingOrganization",
      "Effect": "Deny",
      "Action": "organizations:LeaveOrganization",
      "Resource": "*"
    }
  ]
}`}
        </CodeBlock>
        <HighlightBox type="warn">SCPs do not apply to the AWS Organizations management account. This is why you should run no workloads in the management account — only org management tasks. If your prod workloads run in the management account, SCPs provide zero protection. All workloads belong in member accounts.</HighlightBox>
      </Accordion>

      <Accordion title="IAM Policy Evaluation Logic" icon={Lock}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          When AWS receives an API call, it evaluates a set of policies in a specific order. Understanding this order is essential for debugging AccessDenied errors and for designing effective security controls.
        </p>
        <CodeBlock language="bash">
{`# IAM evaluation order (simplified):
# 1. Explicit deny in ANY policy? → DENY immediately
# 2. Is it allowed by an SCP? → if SCP doesn't allow, DENY
# 3. Is it allowed by a Permission Boundary? → if boundary doesn't allow, DENY
# 4. Is it allowed by an identity policy (IAM role/user policy)? → if not, DENY
# 5. Is there a resource policy? → must allow or must allow the account
# 6. All layers pass → ALLOW

# Debugging AccessDenied — the checklist
# Step 1: Who is the caller?
aws sts get-caller-identity

# Step 2: What does the SCP say?
# Check in AWS Organizations console — SCPs for the account

# Step 3: Does the identity policy allow it?
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::123456789:role/payments-api-role \
  --action-names s3:GetObject \
  --resource-arns arn:aws:s3:::my-bucket/my-object

# Step 4: Does the resource policy (S3 bucket policy) deny it?
aws s3api get-bucket-policy --bucket my-bucket | jq '.Policy | fromjson'

# Step 5: Is there a permission boundary?
aws iam get-role --role-name payments-api-role \
  --query 'Role.PermissionsBoundary'`}
        </CodeBlock>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Explicit deny always wins:</span> A single explicit deny in any policy layer overrides all allows. This is why you can use SCPs and resource policies to add immovable guardrails — even an account admin cannot override an explicit SCP deny.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">The absent policy default:</span> If no policy grants an action, it is denied by default. AWS is deny-by-default. You do not need an explicit deny to block something — just the absence of an allow is sufficient. Explicit denies are needed only when you want to override an allow.</div>
          </li>
        </ul>
      </Accordion>

      <Accordion title="Production IAM Patterns — Multi-Account Architecture" icon={AlertTriangle}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The standard multi-account pattern: a tooling account for CI/CD, separate accounts for dev/staging/prod, and a management account for org management only.
        </p>
        <CodeBlock language="hcl">
{`# GitHub Actions OIDC → tooling account role → assume prod role
# In the prod account: role that CI can assume
resource "aws_iam_role" "ci_deploy_prod" {
  name = "github-actions-deploy-prod"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = "arn:aws:iam::111111111111:oidc-provider/token.actions.githubusercontent.com"
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          # Only the specific repo, only on pushes to main
          "token.actions.githubusercontent.com:sub" =
            "repo:myorg/my-service:ref:refs/heads/main"
        }
      }
    }]
  })
}

# Policy: only what the CI pipeline needs
resource "aws_iam_role_policy" "ci_deploy_prod_policy" {
  name = "ci-deploy-policy"
  role = aws_iam_role.ci_deploy_prod.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken", "ecr:BatchGetImage",
                    "ecr:InitiateLayerUpload", "ecr:UploadLayerPart",
                    "ecr:CompleteLayerUpload", "ecr:PutImage"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["eks:DescribeCluster"]
        Resource = "arn:aws:eks:us-east-1:999999999999:cluster/prod-eks"
      }
    ]
  })
}`}
        </CodeBlock>
        <HighlightBox type="tip">Scope CI/CD IAM permissions as tightly as possible. A deploy role should have ECR push access, EKS describe access, and nothing else. The Kubernetes RBAC layer (inside the cluster) restricts what the pipeline can do within EKS. Two layers of access control — IAM at the AWS level, RBAC at the Kubernetes level.</HighlightBox>
      </Accordion>
    </div>
  );
}
