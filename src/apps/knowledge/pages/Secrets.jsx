import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import NotesBox from '../components/NotesBox';
import HighlightBox from '../components/HighlightBox';
import CompareTable from '../components/CompareTable';
import CodeBlock from '../components/CodeBlock';

export default function Secrets() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">{'\uD83D\uDD11'} Security</div>
        <h1>Secrets Management</h1>
        <p>How to store, inject, rotate, and audit secrets across Kubernetes clusters and cloud accounts — without committing anything to Git.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'The Problem',
          body: "Apps need credentials (DB passwords, API keys, TLS certs). Hardcoding them in code or config files is a breach waiting to happen. Even base64 in a K8s Secret is not encrypted \u2014 it's just encoded. The question is: who holds the keys, where are secrets stored, and how do they reach the pod?"
        },
        {
          title: 'The Core Tradeoff',
          body: "More security control = more operational complexity. AWS Secrets Manager is easy but expensive at scale. Vault is powerful but you own the ops. GCP/Azure have their own native stores. ESO gives you a Kubernetes-native sync layer on top of any backend."
        }
      ]} />

      <Accordion title="ESO (External Secrets Operator) \u2014 How It Actually Works" icon={'\uD83C\uDFD7\uFE0F'} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          ESO is a Kubernetes operator that syncs secrets from an external backend (AWS SM, Vault, GCP Secret Manager, Azure Key Vault) into native K8s Secrets. Your pods just consume a regular K8s Secret — they don't know ESO exists.
        </p>
        <HighlightBox type="tip">Real flow: SecretStore (auth config) + ExternalSecret (what to sync) {'\u2192'} ESO operator calls backend API {'\u2192'} creates/updates K8s Secret {'\u2192'} pod mounts it as env or volume</HighlightBox>
        <CodeBlock>{`# ClusterSecretStore — auth config (one per cluster, all namespaces)
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-secrets-manager
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:                        # IRSA — pod identity, not static keys
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets
---
# ExternalSecret — what to pull and where to put it
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: datadog-keys
  namespace: monitoring
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: datadog-keys           # K8s Secret name created
    creationPolicy: Owner
  data:
    - secretKey: api-key          # key in the K8s Secret
      remoteRef:
        key: prod/datadog          # SM secret name
        property: api_key          # field inside the JSON secret`}</CodeBlock>
        <HighlightBox type="warn">Real gotcha: SM charges per secret per month (~$0.40). If you create one K8s ExternalSecret per app credential, costs explode. Pattern: one SM secret per app/env with multiple key-value fields. ESO's <code>property</code> field lets you extract individual keys from the JSON blob.</HighlightBox>
        <NotesBox id="secrets-eso" placeholder="How did you set up ESO? Which auth method? What naming convention for SM secrets? Any cost or permission issues?" />
      </Accordion>

      <Accordion title="IRSA for ESO \u2014 The Auth Chain" icon={'\uD83D\uDD10'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          ESO needs AWS credentials to read from Secrets Manager. IRSA (IAM Roles for Service Accounts) is the right pattern — no static keys, uses the pod's identity via OIDC.
        </p>
        <HighlightBox>The chain: EKS OIDC provider {'\u2192'} IAM role trust policy allows the ESO ServiceAccount {'\u2192'} ESO pod gets temp AWS creds via STS {'\u2192'} calls secretsmanager:GetSecretValue</HighlightBox>
        <CodeBlock>{`// IAM policy on the IRSA role (scoped to specific secrets)
{
  "Effect": "Allow",
  "Action": [
    "secretsmanager:GetSecretValue",
    "secretsmanager:DescribeSecret"
  ],
  "Resource": "arn:aws:secretsmanager:us-east-1:123456789:secret:prod/*"
}`}</CodeBlock>
        <CodeBlock>{`# ESO ServiceAccount with IRSA annotation
apiVersion: v1
kind: ServiceAccount
metadata:
  name: external-secrets
  namespace: external-secrets
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/eso-role`}</CodeBlock>
        <HighlightBox type="warn">Common failures: (1) Trust policy has wrong OIDC provider URL — copy from EKS console exactly. (2) IAM policy uses secret name not ARN — SM ARN has a random suffix, use wildcard suffix or full ARN. (3) ESO pods not restarted after annotation change — pods cache the OIDC token, restart them.</HighlightBox>
      </Accordion>

      <Accordion title="HashiCorp Vault \u2014 Architecture & Key Concepts" icon={'\uD83C\uDF10'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Vault is the most powerful self-hosted secrets platform. You own the ops, but you get fine-grained auth methods, dynamic secrets, PKI, SSH signing, and a full audit trail.
        </p>
        <HighlightBox type="tip">Key concept: Vault's seal/unseal mechanism protects the master key. In production, use auto-unseal with AWS KMS so pods don't need to manually unseal after a restart. Raft storage backend eliminates Consul as a dependency.</HighlightBox>
        <CompareTable
          headers={['Concept', 'What It Is', 'Analogy']}
          rows={[
            ['<strong>Auth Method</strong>', 'How a client proves identity — Kubernetes (JWT), AWS IAM, OIDC, AppRole. Vault validates and returns a token.', 'The login screen \u2014 verify who you are before you get a key'],
            ['<strong>Secret Engine</strong>', 'Plugins that serve different secret types: KV (static), database (dynamic), AWS (IAM creds), PKI (certs).', 'Different vending machines, each stocked with a different type of credential'],
            ['<strong>Dynamic Secrets</strong>', 'Vault creates unique short-lived credentials on-demand (DB user, AWS access key) with a TTL. Auto-revoked at expiry.', 'Hotel room keycard \u2014 valid for your stay, useless after checkout'],
            ['<strong>Policies</strong>', 'HCL rules that grant read/write access to specific secret paths. Attached to tokens/roles.', 'IAM policy but for vault paths instead of AWS resources'],
          ]}
        />
        <HighlightBox type="warn">Migration pattern from AWS SM to Vault: (1) Deploy Vault HA cluster with Raft + KMS auto-unseal. (2) Configure K8s auth method per cluster. (3) Import existing SM secrets into Vault KV. (4) Update ExternalSecret CRs to use Vault provider. (5) Run both in parallel for one sprint to verify. (6) Remove SM IAM access.</HighlightBox>
      </Accordion>

      <Accordion title="Comparison: ESO Backends" icon={'\uD83D\uDCCA'}>
        <CompareTable
          headers={['Backend', 'Strengths', 'Weaknesses', 'Best For']}
          rows={[
            ['<strong>AWS Secrets Manager</strong>', 'Native AWS, easy IRSA auth, rotation built-in', '$0.40/secret/month, per-region, AWS-only', 'AWS-only shops, small-medium secret count'],
            ['<strong>HashiCorp Vault</strong>', 'Powerful dynamic secrets, PKI, SSH, open source', 'You run it \u2014 HA setup is complex, you own the ops', 'Large orgs, multi-cloud, need dynamic secrets'],
            ['<strong>GCP Secret Manager</strong>', 'Native GCP, easy IAM auth, automatic replication, low cost', 'GCP-only, less powerful than Vault, no dynamic secrets', 'GCP-native shops or multi-cloud with GCP as primary'],
            ['<strong>Sealed Secrets</strong>', 'Simple, GitOps-native, free, works offline', 'No rotation, controller holds master key, no audit trail', 'Small teams, simple GitOps setups'],
          ]}
        />
      </Accordion>

      <Accordion title="Interview Q&A" icon={'\uD83D\uDCAC'}>
        <ul className="item-list">
          <li>
            <span className="bullet">{'\u2753'}</span>
            <div><span className="label">"You can't commit secrets to Git. How do you handle secrets in a GitOps workflow?"</span> — "We commit ExternalSecret CRs to Git — they reference secrets by path, not by value. ESO operator reads the CR, calls AWS Secrets Manager using IRSA, and creates the K8s Secret in-cluster. The actual values never touch Git. For bootstrapping ESO itself, we had a manual step to seed the initial IRSA role and ESO install — that's an inherent chicken-and-egg in GitOps."</div>
          </li>
          <li>
            <span className="bullet">{'\u2753'}</span>
            <div><span className="label">"What's the difference between static and dynamic secrets?"</span> — "Static secrets are fixed values stored somewhere — you create them once, store them, and rotate manually or on a schedule. Dynamic secrets are generated fresh on-demand with a short TTL — the platform creates a unique DB user or AWS key for each requester, then auto-revokes it. Dynamic secrets eliminate long-lived credentials entirely, which is the gold standard for high-security environments."</div>
          </li>
          <li>
            <span className="bullet">{'\u2753'}</span>
            <div><span className="label">"How would you migrate from AWS SM to HashiCorp Vault across 3 accounts?"</span> — "Deploy Vault HA (3 nodes, Raft backend, KMS auto-unseal) in a shared-services account. Configure the Kubernetes auth method per cluster — ESO presents the ServiceAccount JWT, Vault validates against the cluster's OIDC endpoint. Import existing SM secrets into Vault KV. Update ExternalSecret CRs to use the Vault ESO provider. Run both in parallel for a sprint, then cut over and remove SM IAM access from the ESO roles."</div>
          </li>
        </ul>
      </Accordion>
    </div>
  );
}
