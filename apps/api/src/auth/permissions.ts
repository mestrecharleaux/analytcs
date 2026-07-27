export const permissions = [
  "*",
  "sites:view",
  "sites:manage",
  "analytics:view",
  "recordings:view",
  "recordings:manage",
  "campaigns:view",
  "campaigns:manage",
  "integration:view",
  "users:view",
  "users:manage",
  "groups:view",
  "groups:manage",
  "administration:access",
  "profile:manage"
] as const;

export type Permission = (typeof permissions)[number];

export const permissionLabels: Record<Permission, string> = {
  "*": "Todas",
  "sites:view": "Visualizar sites",
  "sites:manage": "Gerenciar sites",
  "analytics:view": "Visualizar análises",
  "recordings:view": "Visualizar gravações",
  "recordings:manage": "Gerenciar gravações",
  "campaigns:view": "Visualizar campanhas",
  "campaigns:manage": "Gerenciar campanhas",
  "integration:view": "Visualizar integrações",
  "users:view": "Visualizar usuários",
  "users:manage": "Gerenciar usuários",
  "groups:view": "Visualizar grupos",
  "groups:manage": "Gerenciar grupos",
  "administration:access": "Acessar administração",
  "profile:manage": "Gerenciar próprio perfil"
};
