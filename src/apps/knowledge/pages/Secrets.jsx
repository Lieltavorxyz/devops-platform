import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import HighlightBox from '../components/HighlightBox';
import CodeBlock from '../components/CodeBlock';
import CompareTable from '../components/CompareTable';
import { Lock, Key, Shield, Database, RefreshCw } from 'lucide-react';

export default function Secrets() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">Security</div>
        <h1>Secrets Management</h1>
        <p>How to store, inject, rotate, and audit secrets in Kubernetes without committing values to Git — ESO, IRSA, Vault, and what each approach actually does internally.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'The Core Problem',
          body: 'Applications need credentials. Hardcoding them in code or Docker images is a breach waiting to happen. Kubernetes Secrets are only base64-encoded — any engineer with Secret read access sees the value. The question is: who holds the keys, where are secrets stored, how do they reach pods, and how do you rotate them without downtime?'
        },
        {
          title: 'The Design Tradeoff',
          body: 'AWS Secrets Manager is easy to set up but costs $0.40 per secret per month and is AWS-only. HashiCorp Vault is powerful (dynamic secrets, PKI, SSH) but you own the operations. External Secrets Operator (ESO) is a Kubernetes-native sync layer on top of either backend. For most AWS shops, ESO + Secrets Manager is the right starting point.'
        }
      ]} />

      <Accordion title="External Secrets Operator — How It Works" icon={RefreshCw} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          ESO is a Kubernetes operator that syncs secrets from an external backend into native Kubernetes Secrets. Your pods consume a regular K8s Secret — they have no idea ESO exists. ESO reconciles on a schedule and when the source secret changes.
        </p>
        <CodeBlock language="yaml">
{`# ClusterSecretStore — authenticates to the backend (one per cluster)
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
        jwt:                         # IRSA — uses ServiceAccount identity, no static keys
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets
---
# ExternalSecret — what to pull from the backend and where to put it
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: payments-db
  namespace: payments-prod
spec:
  refreshInterval: 1h                # ESO re-syncs every hour
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: payments-db-credentials    # K8s Secret that ESO creates/manages
    creationPolicy: Owner            # ESO owns this Secret — deletes it if ExternalSecret is deleted
  data:
    - secretKey: POSTGRES_HOST       # key name in K8s Secret
      remoteRef:
        key: prod/payments/database  # SM secret name
        property: host               # field inside the JSON blob
    - secretKey: POSTGRES_PASSWORD
      remoteRef:
        key: prod/payments/database
        property: password
  # Alternatively, sync the entire JSON blob as a single key:
  # dataFrom:
  #   - extract:
  #       key: prod/payments/database`}
        </CodeBlock>
        <HighlightBox type="warn">AWS Secrets Manager charges $0.40 per secret per month regardless of access frequency. If you create one SM secret per credential (e.g., separate secrets for DB host, DB port, DB password, DB username), costs scale linearly. The correct pattern: one SM secret per app/env as a JSON blob with multiple key-value pairs. ESO's <code>property</code> field extracts individual keys. 5 credentials in one secret = $0.40, not $2.00.</HighlightBox>
        <CodeBlock language="yaml">
{`# Cost-efficient pattern: one SM secret per service with all credentials
# SM secret name: prod/payments/all
# SM secret value: {
#   "db_host": "...", "db_password": "...", "api_key": "...", "jwt_secret": "..."
# }

apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: payments-all-secrets
  namespace: payments-prod
spec:
  refreshInterval: 30m
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: payments-secrets
  dataFrom:
    - extract:
        key: prod/payments/all   # extracts ALL key-value pairs from this secret`}
        </CodeBlock>
      </Accordion>

      <Accordion title="IRSA for ESO — The Authentication Chain" icon={Key}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          ESO needs AWS credentials to read from Secrets Manager. IRSA is the correct mechanism — ESO's ServiceAccount identity (via OIDC federation) is exchanged with AWS STS for temporary credentials. No static access keys anywhere in the cluster.
        </p>
        <CodeBlock language="hcl">
{`# Terraform: IRSA role for ESO
resource "aws_iam_role" "eso" {
  name = "external-secrets-operator"

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
          "${aws_iam_openid_connect_provider.eks.url}:sub" =
            "system:serviceaccount:external-secrets:external-secrets"
          "${aws_iam_openid_connect_provider.eks.url}:aud" =
            "sts.amazonaws.com"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "eso_sm_access" {
  name = "eso-secrets-manager"
  role = aws_iam_role.eso.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
        "secretsmanager:ListSecretVersionIds"
      ]
      # Scope to specific path — not * on all secrets
      Resource = "arn:aws:secretsmanager:us-east-1:123456789:secret:prod/*"
    }]
  })
}`}
        </CodeBlock>
        <CodeBlock language="yaml">
{`# ESO ServiceAccount with IRSA annotation
apiVersion: v1
kind: ServiceAccount
metadata:
  name: external-secrets
  namespace: external-secrets
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/external-secrets-operator`}
        </CodeBlock>
        <HighlightBox type="warn">Common ESO failures: (1) Trust policy has wrong OIDC URL — copy the exact URL from the EKS cluster's OIDC issuer field. (2) SM secret ARN has a random suffix (e.g., <code>prod/payments/database-AbCdEf</code>). IAM policy with exact ARN fails. Use a wildcard: <code>arn:aws:secretsmanager:us-east-1:123:secret:prod/*</code>. (3) ESO pod not restarted after ServiceAccount annotation update — the pod caches the token, restart it after adding the annotation.</HighlightBox>
      </Accordion>

      <Accordion title="HashiCorp Vault — Architecture and Key Concepts" icon={Lock}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Vault is the most capable open-source secrets platform. It supports dynamic secrets, PKI certificate management, SSH signing, and has a fine-grained audit trail. The operational cost is that you run it.
        </p>
        <CompareTable
          headers={['Vault Concept', 'What It Is', 'Key Detail']}
          rows={[
            ['<strong>Auth Method</strong>', 'How a client proves identity to get a token', 'Kubernetes auth method: pod presents SA JWT, Vault validates against cluster OIDC endpoint, returns Vault token'],
            ['<strong>Secret Engine</strong>', 'Plugin that serves a type of secret', 'KV v2 for static secrets, database engine for dynamic DB creds, PKI for certificates, AWS engine for IAM credentials'],
            ['<strong>Dynamic Secrets</strong>', 'Vault generates unique short-lived credentials on demand', 'Each pod gets its own DB user with a 1-hour TTL — auto-revoked on expiry. No shared long-lived passwords.'],
            ['<strong>Lease</strong>', 'Time-to-live on a secret — Vault tracks all active leases', 'When a pod dies, its lease can be revoked immediately, making the DB user invalid'],
            ['<strong>Policy</strong>', 'HCL rules granting read/write access to specific paths', '"path \\"secret/data/payments/*\\" { capabilities = [\\"read\\"] }"'],
            ['<strong>Seal/Unseal</strong>', 'Master key protection mechanism', 'Use AWS KMS auto-unseal in production — no manual unseal required after pod restarts'],
          ]}
        />
        <CodeBlock language="yaml">
{`# Vault Kubernetes auth method — pods authenticate with their SA token
# vault write auth/kubernetes/config \
#   kubernetes_host="https://kubernetes.default.svc" \
#   kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt

# ESO SecretStore using Vault as backend
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: vault
spec:
  provider:
    vault:
      server: "https://vault.vault.svc.cluster.local:8200"
      path: "secret"        # KV v2 mount path
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "external-secrets"   # Vault role that allows ESO SA
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets`}
        </CodeBlock>
        <HighlightBox type="tip">Vault dynamic secrets for databases: instead of rotating a shared DB password, Vault's database engine creates a unique PostgreSQL user for each requester with a TTL (e.g., 1 hour). When the TTL expires, Vault automatically drops the user. No shared credentials, no rotation ceremony, and leaked credentials expire quickly. This is the gold standard for database access.</HighlightBox>
      </Accordion>

      <Accordion title="Secret Rotation — Zero-Downtime Patterns" icon={RefreshCw}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Rotating a secret without downtime requires the application to handle the transition period where old and new credentials are both valid.
        </p>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">ESO auto-refresh:</span> ESO checks the backend on <code>refreshInterval</code> and updates the K8s Secret when the value changes. But the pod does not automatically reload environment variables when a Secret updates — it still holds the old value in memory. Solutions: (1) Use Secret as a mounted volume (file on disk) — application reads it fresh each time. (2) Use the stakater/reloader operator to trigger rolling restarts when Secrets change. (3) Application-level periodic credential refresh.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">DB password rotation:</span> AWS Secrets Manager can rotate RDS passwords automatically via Lambda. The rotation function creates a new password, updates the DB, tests the new credentials, and then marks the old version deprecated. During the transition window, both old and new are valid. ESO syncs the new value. Applications using connection pools get the new password on reconnect.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">API key rotation:</span> Most external APIs support a transition period where two API keys are valid simultaneously. Create the new key, update SM, let ESO sync, wait for pods to reload (via reloader), then revoke the old key. Never revoke the old key before pods have the new one.</div>
          </li>
        </ul>
        <CodeBlock language="yaml">
{`# stakater/reloader: trigger rolling restart when Secret changes
# Add annotation to Deployment:
metadata:
  annotations:
    secret.reloader.stakater.com/reload: "payments-db-credentials"
    # comma-separated list of secrets that trigger a restart when they change
spec:
  template:
    spec:
      volumes:
        - name: secrets
          secret:
            secretName: payments-db-credentials
      containers:
        - name: app
          volumeMounts:
            - name: secrets
              mountPath: /run/secrets
              readOnly: true
          # Application reads /run/secrets/POSTGRES_PASSWORD at startup
          # When Secret changes, reloader triggers rolling restart`}
        </CodeBlock>
      </Accordion>

      <Accordion title="Comparison — ESO Backends" icon={Database}>
        <CompareTable
          headers={['Backend', 'Strengths', 'Weaknesses', 'Best For']}
          rows={[
            ['<strong>AWS Secrets Manager</strong>', 'Native AWS, easy IRSA auth, rotation Lambda built-in, versioning', '$0.40/secret/month, per-region, AWS lock-in', 'AWS-only shops, straightforward rotation needs'],
            ['<strong>AWS Parameter Store (SSM)</strong>', 'Free for standard params (limit 10KB), IRSA auth, hierarchical paths', 'No automatic rotation, less powerful than SM', 'Configuration values, non-sensitive settings, cost-sensitive'],
            ['<strong>HashiCorp Vault</strong>', 'Dynamic secrets, PKI, SSH, open source, multi-cloud, fine-grained audit', 'You run it — HA setup is complex, upgrades are manual', 'Large orgs, multi-cloud, need dynamic secrets or PKI'],
            ['<strong>GCP Secret Manager</strong>', 'Native GCP, IAM auth, automatic global replication', 'GCP-only, no dynamic secrets', 'GCP shops or multi-cloud with GCP primary'],
            ['<strong>Sealed Secrets</strong>', 'Simple, GitOps-native, free, offline', 'Manual rotation, controller holds master key, no audit trail', 'Small teams, simple setups, strong GitOps requirement'],
          ]}
        />
      </Accordion>

      <Accordion title="Kubernetes Secret Encryption at Rest" icon={Shield}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Kubernetes Secrets are stored in etcd. By default in many Kubernetes distributions, they are stored as base64 — not encrypted. EKS encrypts etcd at rest using AES-256 by default. But you can add application-level envelope encryption for an additional layer.
        </p>
        <CodeBlock language="bash">
{`# Enable EKS envelope encryption for secrets with a KMS key
aws eks create-cluster \
  --name prod-eks \
  --encryption-config '[{
    "provider": {"keyArn": "arn:aws:kms:us-east-1:123456789:key/abc-123"},
    "resources": ["secrets"]
  }]'

# Or update existing cluster
aws eks update-cluster-config \
  --name prod-eks \
  --encryption-config '[{
    "provider": {"keyArn": "arn:aws:kms:us-east-1:123456789:key/abc-123"},
    "resources": ["secrets"]
  }]'`}
        </CodeBlock>
        <HighlightBox>With envelope encryption enabled: the Kubernetes API server generates a data encryption key (DEK) per secret, encrypts the secret with the DEK, then encrypts the DEK with your KMS CMK. The secret in etcd is encrypted with a key that only KMS can decrypt. Even if someone extracts the etcd data files, secrets are unreadable without KMS access. EKS CloudTrail logs every KMS Decrypt call — full auditability of who accessed which secret.</HighlightBox>
        <HighlightBox type="warn">Adding envelope encryption to an existing cluster with many Secrets triggers a re-encryption of every Secret in etcd. This puts load on the API server and KMS. Do this during a maintenance window for large clusters. Also: the KMS key rotation and key policy must be carefully managed — lose access to the KMS key and you cannot read any K8s Secrets.</HighlightBox>
      </Accordion>
    </div>
  );
}
