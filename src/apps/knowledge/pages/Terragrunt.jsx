import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import NotesBox from '../components/NotesBox';
import HighlightBox from '../components/HighlightBox';
import CodeBlock from '../components/CodeBlock';

export default function Terragrunt() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">{'\uD83C\uDF3F'} Infrastructure as Code</div>
        <h1>Terragrunt</h1>
        <p>The why behind Terragrunt — what pain it solves, how folder structure works, and how to talk about it confidently even if you didn't design it.</p>
      </div>

      <HighlightBox type="info">
        <strong>Key interview insight:</strong> Terragrunt exists primarily to solve one problem — DRY backend configuration across many Terraform modules. If an interviewer asks "why Terragrunt?", lead with this.
      </HighlightBox>

      <ReasoningMap cards={[
        {
          title: 'The Problem Without Terragrunt',
          body: "In vanilla Terraform, every environment needs its own backend config block — same S3 bucket, same DynamoDB table name, just different keys. Copy-paste across 10 environments × 20 modules = 200 places to keep in sync. One typo = state corruption."
        },
        {
          title: 'What Terragrunt Adds',
          body: 'A root terragrunt.hcl defines the backend config once. Child configs inherit it via find_in_parent_folders(). Add dependency management, run-all for orchestration, and generate blocks for code injection.'
        }
      ]} />

      <Accordion title="Typical Folder Structure" icon={'\uD83D\uDCC1'} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The standard pattern mirrors your account/region/service hierarchy. Be ready to draw or describe this.
        </p>
        <CodeBlock>{`# live/ — your actual deployed infra
live/
├── terragrunt.hcl            # root config: backend, provider defaults
├── prod/
│   ├── env.hcl               # env-level vars (account_id, etc.)
│   └── us-east-1/
│       ├── region.hcl        # region-level vars
│       ├── eks/
│       │   └── terragrunt.hcl
│       ├── rds/
│       │   └── terragrunt.hcl
│       └── vpc/
│           └── terragrunt.hcl
└── staging/
    └── us-east-1/
        └── ...

# modules/ — reusable Terraform modules
modules/
├── eks/
├── rds/
└── vpc/`}</CodeBlock>
        <HighlightBox type="tip">
          Each leaf <code>terragrunt.hcl</code> points to a module source and passes environment-specific values. The backend key is derived automatically from the path.
        </HighlightBox>
        <NotesBox id="terragrunt-folder-structure" placeholder="Describe or paste your actual folder structure here. What layers did you have? Was it per-account, per-region, per-service?" />
      </Accordion>

      <Accordion title="DRY Backend Configuration" icon={'\uD83D\uDD04'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The primary reason Terragrunt exists. Understand this deeply.
        </p>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Root config:</span> A single <code>terragrunt.hcl</code> at the repo root defines the S3 backend, DynamoDB lock table, and region. Every child module inherits this via <code>include</code> + <code>find_in_parent_folders()</code>.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Path-based key:</span> The state file key is automatically derived from the folder path (e.g., <code>prod/us-east-1/eks/terraform.tfstate</code>). No manual key management needed.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Generate blocks:</span> Terragrunt can generate provider blocks, backend blocks, or any .tf file on the fly. Useful for injecting a standard provider config across all modules.</div>
          </li>
        </ul>
        <NotesBox id="terragrunt-backends" placeholder="How was backend configuration managed in your team? Did you use generate blocks for providers?" />
      </Accordion>

      <Accordion title="Dependencies & run-all" icon={'\uD83D\uDD17'}>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">dependency blocks:</span> Declare explicit dependencies between modules. Terragrunt runs them in the right order and lets you read outputs. E.g., EKS depends on VPC — read the VPC's subnet IDs as outputs.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">run-all apply:</span> Runs <code>terragrunt apply</code> across all child modules in parallel (respecting dependencies). Dangerous without --terragrunt-non-interactive in prod — always review plan first.</div>
          </li>
          <li>
            <span className="bullet">{'\u2192'}</span>
            <div><span className="label">Mock outputs:</span> For CI or first-time applies where a dependency doesn't exist yet, <code>mock_outputs</code> let you run plan without the real dependency being deployed.</div>
          </li>
        </ul>
        <NotesBox id="terragrunt-dependencies" placeholder="How did your team handle dependencies? Did you use run-all? Any gotchas you hit with dependency ordering?" />
      </Accordion>

      <Accordion title="Common Interview Questions" icon={'\u26A1'}>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2753'}</span>
            <div><span className="label">"Why Terragrunt over Terraform workspaces?"</span> — Workspaces share code but separate state. Good for small config differences. Terragrunt separates both code paths AND state, and handles cross-module dependencies. More overhead but more control at scale.</div>
          </li>
          <li>
            <span className="bullet">{'\u2753'}</span>
            <div><span className="label">"How do you promote changes across environments?"</span> — You change the module version reference in staging's terragrunt.hcl, apply, validate, then update prod's terragrunt.hcl. No copy-paste, just a version bump.</div>
          </li>
          <li>
            <span className="bullet">{'\u2753'}</span>
            <div><span className="label">"What's the hardest part of Terragrunt at scale?"</span> — run-all performance with many modules. Also: debugging when inheritance goes wrong — which terragrunt.hcl is actually being used? Use <code>terragrunt render-json</code> to debug.</div>
          </li>
        </ul>
      </Accordion>
    </div>
  );
}
