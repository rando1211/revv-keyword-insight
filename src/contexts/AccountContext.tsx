import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
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
  selectedCampaignIds: string[];
  setSelectedCampaignIds: (campaignIds: string[]) => void;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const AccountProvider = ({ children }: { children: ReactNode }) => {
  const [selectedAccountForAnalysis, setSelectedAccountForAnalysis] = useState<GoogleAdsAccount | null>(null);
  const [analysisResults, setAnalysisResults] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);

  // Enhanced setSelectedAccountForAnalysis that clears all related state
  const setSelectedAccountForAnalysisWithClear = (account: GoogleAdsAccount | null) => {
    // Clear all analysis-related state when changing accounts
    if (account?.customerId !== selectedAccountForAnalysis?.customerId) {
      setAnalysisResults(null);
      setIsAnalyzing(false);
      setAnalysisStep(0);
      
      // Clear account-specific localStorage 
      if (selectedAccountForAnalysis?.customerId) {
        const oldAccountKey = `advancedAnalysisResults_${selectedAccountForAnalysis.customerId}`;
        localStorage.removeItem(oldAccountKey);
      }
      
      console.log(`🔄 Account changed: ${selectedAccountForAnalysis?.name || 'None'} → ${account?.name || 'None'}`);
    }
    setSelectedAccountForAnalysis(account);
  };

  return (
    <AccountContext.Provider value={{
      selectedAccountForAnalysis,
      setSelectedAccountForAnalysis: setSelectedAccountForAnalysisWithClear,
      analysisResults,
      setAnalysisResults,
      isAnalyzing,
      setIsAnalyzing,
      analysisStep,
      setAnalysisStep,
      selectedCampaignIds,
      setSelectedCampaignIds
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