import { createContext, useContext, useState, ReactNode } from 'react';
import { mockOrgs } from '@/services/mockOrgs';

interface OrgContextType {
  currentOrgId: string;
  currentOrg: typeof mockOrgs[0];
  setCurrentOrgId: (orgId: string) => void;
  allOrgs: typeof mockOrgs;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function OrgProvider({ children }: { children: ReactNode }) {
  const [currentOrgId, setCurrentOrgId] = useState(mockOrgs[0].id);
  
  const currentOrg = mockOrgs.find(org => org.id === currentOrgId) || mockOrgs[0];

  return (
    <OrgContext.Provider value={{ currentOrgId, currentOrg, setCurrentOrgId, allOrgs: mockOrgs }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error('useOrg must be used within OrgProvider');
  }
  return context;
}
