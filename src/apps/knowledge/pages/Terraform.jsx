import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import HighlightBox from '../components/HighlightBox';
import CodeBlock from '../components/CodeBlock';
import CompareTable from '../components/CompareTable';
import { Database, Package, RefreshCw, AlertTriangle, FolderTree, Shield, Terminal } from 'lucide-react';

export default function Terraform() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">Infrastructure as Code</div>
        <h1>Terraform</h1>
        <p>How Terraform works under the hood — state internals, the plan/apply cycle, module design, and production patterns that actually matter.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Problem It Solves',
          body: 'Manual cloud resource creation cannot be reviewed, versioned, or reliably reproduced across environments. Terraform gives you declarative, idempotent infrastructure where every change is a diff you can read before it runs.'
        },
        {
          title: 'The Plan/Apply Cycle',
          body: 'Terraform compares desired state (your HCL) against current state (the state file) and against real-world state (via provider API calls). The result is a diff showing creates, updates, and destroys. You approve the plan before anything changes. This is the core safety mechanism.'
        },
        {
          title: 'When Terraform Fits',
          body: 'Long-lived infrastructure (VPCs, EKS clusters, IAM roles, databases). Not a good fit for frequently-changing application config or ephemeral resources — use Helm or Kubernetes operators for that layer.'
        }
      ]} />

      <Accordion title="How State Works Internally" icon={Database} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The state file is a JSON document that maps your HCL resource blocks to real cloud resource IDs. Terraform uses it to detect drift, build dependency graphs, and compute diffs without reading the entire provider API on every run.
        </p>
        <CodeBlock language="json">
{`// terraform.tfstate — simplified example
{
  "version": 4,
  "terraform_version": "1.7.0",
  "resources": [
    {
      "type": "aws_vpc",
      "name": "main",
      "instances": [{
        "schema_version": 1,
        "attributes": {
          "id": "vpc-0a1b2c3d4e5f",
          "cidr_block": "10.0.0.0/16",
          "tags": { "Name": "prod-vpc" }
        }
      }]
    }
  ]
}`}
        </CodeBlock>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Remote state (S3 + DynamoDB):</span> Local state works for solo learning. In any team context, two engineers applying simultaneously will corrupt a local state file. S3 stores the state, DynamoDB provides a lock table. The lock prevents concurrent applies. If the lock gets stuck after a crash, verify the apply actually stopped before running <code>terraform force-unlock</code>.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">State granularity:</span> One state file per environment per service layer is the right level. A single state for an entire platform means a blast radius that includes every resource if you need to do state surgery. One state per resource is overhead without benefit. The sweet spot is "blast radius you can live with."</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Secrets in state:</span> Resources like <code>aws_db_instance</code> write the database password into the state file in plaintext — even if you marked the variable <code>sensitive = true</code>. State files must be encrypted at rest (S3 SSE is free), and access should be restricted to least-privilege. Never commit state to Git.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">State file surgery:</span> <code>terraform state mv</code> renames resources without recreating them. <code>terraform state rm</code> removes a resource from state without destroying it. <code>terraform import</code> brings existing resources under Terraform management. These are the escape hatches when reality diverges from state.</div>
          </li>
        </ul>
        <CodeBlock language="hcl">
{`# Remote backend configuration — belongs in a root main.tf or backend.tf
terraform {
  backend "s3" {
    bucket         = "my-org-terraform-state"
    key            = "prod/eks/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

# Initialize with the backend
# terraform init
# terraform init -reconfigure   # use when changing backend config`}
        </CodeBlock>
        <HighlightBox type="warn">The most painful state incident: someone edits a resource manually in the AWS console, then the next <code>terraform apply</code> reverts or conflicts with the manual change. Set up drift detection (plan on a schedule in CI) and treat manual console changes as forbidden in environments managed by Terraform.</HighlightBox>
      </Accordion>

      <Accordion title="Dependency Graph and Apply Order" icon={RefreshCw}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Terraform builds a directed acyclic graph (DAG) of all resources and their dependencies. Resources that reference each other are automatically ordered. This is why you can write resources in any order in your HCL files.
        </p>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Implicit dependencies:</span> When one resource references another via <code>resource_type.name.attribute</code>, Terraform automatically infers the dependency. The VPC must exist before subnets. The subnet must exist before EC2 instances. No explicit declaration needed.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Explicit dependencies (depends_on):</span> Use when Terraform cannot infer the dependency from attribute references — for example, when a resource depends on an IAM policy attachment that has no direct attribute reference. Overusing <code>depends_on</code> is a code smell that usually means missing output wiring.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Parallelism:</span> Terraform applies up to 10 resources in parallel by default (those without mutual dependencies). Increase with <code>-parallelism=N</code> for large stacks. Too high can hit provider API rate limits.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Destroy order:</span> On destroy, the graph is traversed in reverse. Terraform destroys dependents before dependencies — pods before nodes, nodes before VPC. If a destroy fails midway, you may need to handle orphaned resources manually.</div>
          </li>
        </ul>
      </Accordion>

      <Accordion title="Module Design and Versioning" icon={Package}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Modules are the unit of reuse in Terraform. A well-designed module has a stable interface (inputs/outputs), a single responsibility, and pinned version references. A bad module is a catch-all that does too many things and is impossible to update without breaking callers.
        </p>
        <CodeBlock language="hcl">
{`# Calling a module with a pinned version
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.1"   # always pin — never use "~> latest"

  name = "prod-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = false   # one per AZ for HA
}

# Consuming module outputs
resource "aws_eks_cluster" "main" {
  name = "prod-cluster"

  vpc_config {
    subnet_ids = module.vpc.private_subnets   # output from the module
  }
}`}
        </CodeBlock>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">When to modularize:</span> Two or more callers, or the resource group is complex enough that a flat file becomes unreadable. A module used exactly once adds abstraction without reuse benefit — it just moves code around.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Version pinning:</span> <code>?ref=main</code> in a git module source means your infrastructure can change without a commit in your repo — a module maintainer pushes to main and your next apply is different. Pin to a tag. Pin to a commit SHA for critical modules.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Module outputs:</span> Design outputs to expose what callers need (IDs, ARNs, names). Do not expose implementation details. A caller that references internal resource attributes directly is tightly coupled and breaks on module refactors.</div>
          </li>
        </ul>
        <CompareTable
          headers={['Approach', 'When to Use', 'Risk']}
          rows={[
            ['Registry module (terraform-aws-modules)', 'Standard resources (VPC, EKS, RDS)', 'Less control, but well-tested and opinionated defaults'],
            ['Internal module in same repo', 'Company-specific patterns, multi-resource combos', 'You own maintenance; keep interface stable'],
            ['Inline resources (no module)', 'Single-use, simple resources', 'Fine until you have 500 lines in one file'],
          ]}
        />
      </Accordion>

      <Accordion title="Workspaces vs Separate State Files" icon={FolderTree}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Terraform workspaces let you have multiple state files sharing the same backend config and code. They look appealing but create subtle problems at scale. Most mature teams prefer separate directories with separate state keys.
        </p>
        <CompareTable
          headers={['Approach', 'How It Works', 'Failure Mode']}
          rows={[
            ['<strong>Workspaces</strong>', 'Single codebase, multiple state files keyed by workspace name', 'Workspace name leaks into config logic (terraform.workspace). Sharing code means you cannot diverge per-env without conditionals — messy at scale.'],
            ['<strong>Separate directories</strong>', 'One directory per environment, same module source', 'More files, but each env is fully independent. No accidental cross-env blast radius.'],
            ['<strong>Terragrunt</strong>', 'Single module source, DRY backend config, per-env override files', 'Additional tooling layer, but handles the directory approach elegantly.'],
          ]}
        />
        <HighlightBox type="tip">Use workspaces only when environments are nearly identical (e.g., feature branch previews). For dev/staging/prod with different VPC sizes, instance counts, and feature flags, separate directories are cleaner and safer.</HighlightBox>
      </Accordion>

      <Accordion title="Drift Detection and CI Integration" icon={Shield}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Drift happens when someone changes a resource outside Terraform (AWS console, AWS CLI, another tool). Terraform has no automatic drift alerting — you have to build it.
        </p>
        <CodeBlock language="yaml">
{`# GitHub Actions: run terraform plan on a schedule to detect drift
name: Drift Detection
on:
  schedule:
    - cron: '0 8 * * 1-5'   # weekdays at 8am UTC

jobs:
  drift-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.0"

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/terraform-ro-role
          aws-region: us-east-1

      - name: Terraform plan
        id: plan
        run: |
          cd environments/prod
          terraform init -backend-config=backend.hcl
          terraform plan -detailed-exitcode -out=tfplan
        continue-on-error: true

      # Exit code 2 = drift detected (plan has changes)
      # Exit code 0 = no drift
      # Exit code 1 = error
      - name: Notify on drift
        if: steps.plan.outputs.exitcode == '2'
        run: |
          echo "Drift detected in prod environment"
          # Send to Slack, PagerDuty, etc.`}
        </CodeBlock>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Plan on every PR:</span> CI runs <code>terraform plan</code> and posts the output as a PR comment. Reviewers see exactly what infrastructure changes before approving. This is table stakes for any team using Terraform.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Plan-then-apply gate:</span> Store the plan file (<code>-out=tfplan</code>) and apply only that exact plan (<code>terraform apply tfplan</code>). This prevents the race condition where the plan is approved but resources change before apply runs.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Policy as code:</span> Checkov, tfsec, and terraform-compliance scan plans for security misconfigurations before apply. Example: flag any S3 bucket without versioning enabled, or any security group with 0.0.0.0/0 inbound on port 22.</div>
          </li>
        </ul>
      </Accordion>

      <Accordion title="Common Production Gotchas" icon={AlertTriangle}>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Resource replacement on rename:</span> Renaming a Terraform resource block (not the AWS resource) causes Terraform to plan a destroy + create. If you rename <code>resource "aws_rds_instance" "old_name"</code> to <code>resource "aws_rds_instance" "new_name"</code>, Terraform plans to delete the database. Use <code>terraform state mv</code> to rename without destroy.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">for_each over sensitive values:</span> Using <code>for_each</code> with a map that includes secret values causes Terraform to error because it cannot evaluate the keys during plan. This requires a two-step apply or restructuring the resource.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Provider version constraints:</span> <code>~&gt; 5.0</code> allows patch and minor updates but not major. If you don't pin providers, a major version bump can change resource schema and break your code on init. Always pin in <code>required_providers</code>.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Null resource abuse:</span> <code>null_resource</code> with <code>local-exec</code> is a trap. It runs shell commands during apply but has unreliable triggers and no idempotency. Prefer a proper provider resource or a separate script invoked outside Terraform.</div>
          </li>
        </ul>
        <CodeBlock language="hcl">
{`# terraform.tf — lock provider versions
terraform {
  required_version = ">= 1.6, < 2.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"   # allows 5.x but not 6.x
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}`}
        </CodeBlock>
        <HighlightBox type="warn">Always run <code>terraform plan</code> before <code>terraform apply</code> in production, even when you think the change is trivial. The number of "I just added a tag" applies that triggered an unexpected replacement is nonzero across every team that skips this step.</HighlightBox>
      </Accordion>

      <Accordion title="Testing and Validation" icon={Terminal}>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">terraform validate:</span> Checks syntax and internal consistency. Does not call any APIs. Fast — run this in pre-commit hooks.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">terraform plan:</span> The primary validation tool. Shows exactly what will change. Catches most real-world errors (missing permissions, resource conflicts, missing variables).</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Terratest:</span> Go library for writing integration tests that apply real Terraform, make assertions against the created resources, then destroy. Slow (real cloud resources) but provides high confidence. Use for module testing, not every PR.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">terraform test (native, 1.6+):</span> Write HCL-based tests that can run <code>apply</code> and assert outputs. Lighter than Terratest, no Go required. Good for unit-level module validation.</div>
          </li>
        </ul>
        <CodeBlock language="hcl">
{`# tests/vpc_test.tftest.hcl (native terraform test)
run "vpc_creates_correct_cidr" {
  command = plan   # or apply for real resources

  variables {
    cidr_block = "10.1.0.0/16"
    environment = "test"
  }

  assert {
    condition     = aws_vpc.main.cidr_block == "10.1.0.0/16"
    error_message = "VPC CIDR does not match expected value"
  }
}`}
        </CodeBlock>
      </Accordion>
    </div>
  );
}
