import { Layers, Ship, Cloud, GitBranch, LayoutGrid, Activity } from 'lucide-react';

const ICONS = {
  terraform:    Layers,
  kubernetes:   Ship,
  'eks-aws':    Cloud,
  'cicd-gitops': GitBranch,
  architecture: LayoutGrid,
  observability: Activity,
};

export default function CategoryIcon({ id, size = 18 }) {
  const Icon = ICONS[id];
  if (!Icon) return null;
  return <Icon size={size} strokeWidth={1.75} />;
}
