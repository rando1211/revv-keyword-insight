import { createContext, useContext, useState, ReactNode } from 'react';
import { GoogleAdsAccount } from '@/lib/google-ads-service';

interface AccountContextType {
  selectedAccountForAnalysis: GoogleAdsAccount | null;
  setSelectedAccountForAnalysis: (account: GoogleAdsAccount | null) => void;
  analysisResults: string | null;
  setAnalysisResults: (results: string | null) => void;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const AccountProvider = ({ children }: { children: ReactNode }) => {
  const [selectedAccountForAnalysis, setSelectedAccountForAnalysis] = useState<GoogleAdsAccount | null>(null);
  const [analysisResults, setAnalysisResults] = useState<string | null>(null);

  return (
    <AccountContext.Provider value={{
      selectedAccountForAnalysis,
      setSelectedAccountForAnalysis,
      analysisResults,
      setAnalysisResults
    }}>
      {children}
    </AccountContext.Provider>
  );
};

export const useAccount = () => {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
};