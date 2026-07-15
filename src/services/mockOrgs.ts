// Mock organizations for development
export const mockOrgs = [
  {
    id: 'org-demo-studio',
    name: 'Demo Studio',
    brandName: 'Demo Creative Agency',
    logoUrl: null,
    primaryColor: '#7C5CFF',
    accentColor: '#26F4D2',
  },
  {
    id: 'org-nonprofit-mx',
    name: 'Fundación México',
    brandName: 'Fundación para el Desarrollo de México',
    logoUrl: null,
    primaryColor: '#E63946',
    accentColor: '#F1FAEE',
  },
  {
    id: 'org-local-business',
    name: 'Local Business',
    brandName: 'Mi Negocio Local',
    logoUrl: null,
    primaryColor: '#2A9D8F',
    accentColor: '#E9C46A',
  },
];

export function getMockOrg(orgId: string) {
  return mockOrgs.find(org => org.id === orgId) || mockOrgs[0];
}
