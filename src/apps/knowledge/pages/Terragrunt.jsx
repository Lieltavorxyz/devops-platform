import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import HighlightBox from '../components/HighlightBox';
import CodeBlock from '../components/CodeBlock';
import CompareTable from '../components/CompareTable';
import { FolderTree, RefreshCw, GitMerge, Terminal, Settings, AlertTriangle } from 'lucide-react';

export default function Terragrunt() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">Infrastructure as Code</div>
        <h1>Terragrunt</h1>
        <p>How Terragrunt solves backend configuration duplication, dependency ordering, and multi-environment orchestration at scale.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'The Problem Without Terragrunt',
          body: 'In vanilla Terraform, every environment needs its own backend config block with the same S3 bucket, DynamoDB table, and region — just a different key. Across 20 modules times 3 environments, that is 60 places to keep in sync. One typo creates a state collision.'
        },
        {
          title: 'What Terragrunt Adds',
          body: 'A root terragrunt.hcl defines the backend config once. Child configs inherit via find_in_parent_folders(). State file keys are derived automatically from the folder path. You also get dependency management between modules and run-all for orchestrating applies across the whole directory tree.'
        }
      ]} />

      <Accordion title="Folder Structure — The Standard Layout" icon={FolderTree} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The folder hierarchy mirrors your account/region/service topology. Terragrunt reads up the directory tree to find parent configs and inherits from them.
        </p>
        <CodeBlock language="bash">
{`live/
├── terragrunt.hcl              # root: backend S3 bucket, DynamoDB, region
├── prod/
│   ├── env.hcl                 # env-level vars: account_id, environment name
│   └── us-east-1/
│       ├── region.hcl          # region-level vars
│       ├── vpc/
│       │   └── terragrunt.hcl  # leaf: points to vpc module, passes vars
│       ├── eks/
│       │   └── terragrunt.hcl  # depends on vpc outputs
│       └── rds/
│           └── terragrunt.hcl  # depends on vpc outputs
└── staging/
    └── us-east-1/
        ├── vpc/
        │   └── terragrunt.hcl  # same module source, staging-sized vars
        └── eks/
            └── terragrunt.hcl

modules/                        # reusable Terraform modules (not terragrunt)
├── vpc/
├── eks/
└── rds/`}
        </CodeBlock>
        <HighlightBox type="tip">The state file key for <code>live/prod/us-east-1/eks/terragrunt.hcl</code> is automatically set to <code>prod/us-east-1/eks/terraform.tfstate</code> using the path relative to the root. No manual key management — the folder IS the key.</HighlightBox>
      </Accordion>

      <Accordion title="DRY Backend Configuration" icon={RefreshCw}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The root terragrunt.hcl is where you define the backend once. All child configs inherit it with a single line. This is the primary reason Terragrunt exists.
        </p>
        <CodeBlock language="hcl">
{`# live/terragrunt.hcl — the root config (defined once)
locals {
  account_id = get_aws_account_id()
  region     = "us-east-1"
}

remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
  config = {
    bucket         = "my-org-terraform-state-\${local.account_id}"
    key            = "\${path_relative_to_include()}/terraform.tfstate"
    region         = local.region
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}`}
        </CodeBlock>
        <CodeBlock language="hcl">
{`# live/prod/us-east-1/eks/terragrunt.hcl — a leaf config
include "root" {
  path = find_in_parent_folders()   # walks up tree to find root config
}

# Read env-level vars without duplication
locals {
  env_vars    = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  region_vars = read_terragrunt_config(find_in_parent_folders("region.hcl"))

  account_id  = local.env_vars.locals.account_id
  environment = local.env_vars.locals.environment
}

terraform {
  source = "../../../../modules/eks"   # or a versioned registry source
}

inputs = {
  cluster_name    = "prod-eks"
  cluster_version = "1.30"
  environment     = local.environment
  vpc_id          = dependency.vpc.outputs.vpc_id
  subnet_ids      = dependency.vpc.outputs.private_subnets
}

dependency "vpc" {
  config_path = "../vpc"
}`}
        </CodeBlock>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">generate blocks:</span> Instead of writing a <code>backend.tf</code> file manually, the root config uses <code>generate</code> to create it on the fly during <code>terragrunt init</code>. This means your module directory stays clean — no generated files committed to the repo.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">path_relative_to_include():</span> This function computes the path of the leaf config relative to the root config. It is what makes the state key auto-derive from folder structure. If you move a module to a different folder, the state key changes — which means a destroy + re-create. Plan carefully before reorganizing.</div>
          </li>
        </ul>
      </Accordion>

      <Accordion title="Dependency Management" icon={GitMerge}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Terragrunt's <code>dependency</code> blocks let you reference outputs from other modules in the same live tree. This replaces data sources that reach across state files and makes the dependency explicit and readable.
        </p>
        <CodeBlock language="hcl">
{`# eks/terragrunt.hcl — depends on vpc
dependency "vpc" {
  config_path = "../vpc"

  # Mock outputs for CI (plan only) when vpc doesn't exist yet
  mock_outputs = {
    vpc_id          = "vpc-00000000000000000"
    private_subnets = ["subnet-00000000000000001", "subnet-00000000000000002"]
  }
  mock_outputs_allowed_terraform_commands = ["plan", "validate"]
}

dependency "iam" {
  config_path = "../../global/iam"
}`}
        </CodeBlock>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Dependency ordering:</span> When you run <code>terragrunt run-all apply</code>, Terragrunt reads all dependency blocks across every leaf config and builds a DAG. Modules are applied in dependency order — VPC before EKS, not alphabetically. This is the key operational win over running each module manually in the right order.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Mock outputs:</span> When a dependency module hasn't been deployed yet (first-time apply, CI plan), the dependency's outputs do not exist. Mock outputs let you run <code>plan</code> anyway with fake values. Only valid for plan — apply requires real outputs.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Cross-account dependencies:</span> If the dependency is in a different AWS account, you cannot use <code>dependency</code> directly — the backend creds differ. Instead, use a data source that reads the remote state from the other account's S3 bucket with cross-account read access.</div>
          </li>
        </ul>
      </Accordion>

      <Accordion title="run-all — Orchestrating the Entire Tree" icon={Terminal}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          <code>terragrunt run-all apply</code> applies every module in the directory tree in dependency order, in parallel where possible. It is powerful and dangerous — use it correctly.
        </p>
        <CodeBlock language="bash">
{`# Plan all modules under prod/ in dependency order
terragrunt run-all plan --terragrunt-working-dir live/prod

# Apply with confirmation prompt for each module
terragrunt run-all apply --terragrunt-working-dir live/prod

# Apply non-interactively (CI/CD)
terragrunt run-all apply \
  --terragrunt-non-interactive \
  --terragrunt-working-dir live/prod

# Apply a single module and its dependencies
terragrunt apply --terragrunt-working-dir live/prod/us-east-1/eks

# Exclude specific modules from run-all
terragrunt run-all plan \
  --terragrunt-exclude-dir live/prod/us-east-1/rds`}
        </CodeBlock>
        <HighlightBox type="warn">Never run <code>run-all apply</code> without first running <code>run-all plan</code> and reviewing the output. A single misconfigured module in the tree can cascade failures across dependent modules. In production, apply modules individually after reviewing their specific plan.</HighlightBox>
        <CompareTable
          headers={['Command', 'What it Does', 'Safe for Prod?']}
          rows={[
            ['run-all plan', 'Plans all modules, shows full diff', 'Yes — read-only'],
            ['run-all apply (interactive)', 'Prompts for approval per module', 'Use carefully — review each plan'],
            ['run-all apply --non-interactive', 'Applies everything without prompts', 'Only in CI with mandatory plan review gate'],
            ['run-all destroy', 'Destroys everything in reverse dependency order', 'Never without explicit intent and backups'],
          ]}
        />
      </Accordion>

      <Accordion title="Debugging and Troubleshooting" icon={AlertTriangle}>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Render the final config:</span> <code>terragrunt render-json</code> shows the fully-resolved config after all inheritance and locals are evaluated. When you cannot figure out why a variable has the wrong value, this is the first command to run.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Stale cache:</span> Terragrunt caches the <code>.terragrunt-cache</code> directory. If modules are not updating after source changes, delete the cache: <code>find . -type d -name ".terragrunt-cache" -exec rm -rf {} +</code>.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">find_in_parent_folders failure:</span> If Terragrunt cannot find the root config, it fails with a cryptic error about not finding the parent. This usually means the leaf config is outside the expected directory tree, or the root config filename differs from what is being searched for. Pass an explicit name: <code>find_in_parent_folders("root.hcl")</code>.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Module version drift:</span> Terragrunt does not automatically upgrade module sources. If you update the source version in one leaf config and forget others, different environments run different module versions. Use a variable for the module version defined in a shared locals file.</div>
          </li>
        </ul>
        <CodeBlock language="bash">
{`# Debug: show the fully-resolved config for a single module
terragrunt render-json --terragrunt-working-dir live/prod/us-east-1/eks

# Enable verbose logging
TERRAGRUNT_LOG_LEVEL=debug terragrunt plan

# Clear cache for all modules
find live/ -type d -name ".terragrunt-cache" -exec rm -rf {} +`}
        </CodeBlock>
      </Accordion>

      <Accordion title="Environment Promotion Pattern" icon={Settings}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The standard workflow for promoting changes from staging to production without copy-pasting configuration.
        </p>
        <CodeBlock language="hcl">
{`# modules/eks/versions.tf — bump the module version here
terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
  }
}

# live/_common/eks_version.hcl — shared version reference
locals {
  eks_module_version = "v3.2.1"   # bump here to update all envs
}

# live/staging/us-east-1/eks/terragrunt.hcl
locals {
  common = read_terragrunt_config(find_in_parent_folders("_common/eks_version.hcl"))
}

terraform {
  source = "git::https://github.com/my-org/terraform-modules.git//eks?ref=\${local.common.locals.eks_module_version}"
}`}
        </CodeBlock>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Promote by version bump:</span> Update the module version in a shared file, apply to staging, validate, then change the version reference for prod. The folder structure and inputs stay identical — only the module source version changes. This is the cleanest promotion workflow.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Environment-specific overrides:</span> Values that legitimately differ between environments (instance sizes, replica counts, feature flags) live in each environment's leaf <code>terragrunt.hcl</code> as inputs. Values that are identical (VPC CIDR strategy, tagging scheme) go in shared locals files.</div>
          </li>
        </ul>
      </Accordion>
    </div>
  );
}
