import { createContext, useContext, useState, ReactNode } from 'react';
import { GoogleAdsAccount } from '@/lib/google-ads-service';

interface AccountContextType {
  selectedAccountForAnalysis: GoogleAdsAccount | null;
  setSelectedAccountForAnalysis: (account: GoogleAdsAccount | null) => void;
  analysisResults: string | null;
  setAnalysisResults: (results: string | null) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (analyzing: boolean) => void;
  analysisStep: number;
  setAnalysisStep: (step: number) => void;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const AccountProvider = ({ children }: { children: ReactNode }) => {
  const [selectedAccountForAnalysis, setSelectedAccountForAnalysis] = useState<GoogleAdsAccount | null>(null);
  const [analysisResults, setAnalysisResults] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);

  return (
    <AccountContext.Provider value={{
      selectedAccountForAnalysis,
      setSelectedAccountForAnalysis,
      analysisResults,
      setAnalysisResults,
      isAnalyzing,
      setIsAnalyzing,
      analysisStep,
      setAnalysisStep
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