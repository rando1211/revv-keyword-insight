import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Rocket, Target, FileText, Settings, CheckCircle } from 'lucide-react';
import { KeywordResearchPanel } from './KeywordResearchPanel';
import { CampaignStructurePanel } from './CampaignStructurePanel';
import { AdCreationPanel } from './AdCreationPanel';
import { CampaignSettingsPanel } from './CampaignSettingsPanel';
import { CampaignReviewPanel } from './CampaignReviewPanel';

interface KeywordData {
  keyword: string;
  searchVolume: number;
  competition: 'LOW' | 'MEDIUM' | 'HIGH';
  cpcEstimate: number;
  relevanceScore: number;
  cluster: string;
  opportunityScore?: number;
}

interface AdGroup {
  name: string;
  keywords: KeywordData[];
  maxCpc: number;
}

interface Campaign {
  name: string;
  budget: number;
  biddingStrategy: string;
  targetLocation: string;
  adGroups: AdGroup[];
  ads: any[];
}

const steps = [
  { id: 1, title: 'Keyword Research', description: 'Find the best keywords', icon: Target },
  { id: 2, title: 'Campaign Structure', description: 'Organize keywords into ad groups', icon: Settings },
  { id: 3, title: 'Create Ads', description: 'Generate compelling ad copy', icon: FileText },
  { id: 4, title: 'Campaign Settings', description: 'Configure budget and targeting', icon: Settings },
  { id: 5, title: 'Review & Launch', description: 'Final review before launch', icon: CheckCircle },
];

export const CampaignBuilderWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedKeywords, setSelectedKeywords] = useState<KeywordData[]>([]);
  const [campaignStructure, setCampaignStructure] = useState<AdGroup[]>([]);
  const [campaignAds, setCampaignAds] = useState<{ [adGroupName: string]: any[] }>({});
  const [campaignSettings, setCampaignSettings] = useState<any>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepId: number) => {
    if (stepId <= currentStep || completedSteps.has(stepId - 1)) {
      setCurrentStep(stepId);
    }
  };

  const progress = (currentStep / steps.length) * 100;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <KeywordResearchPanel
            onKeywordsSelected={setSelectedKeywords}
            onNext={handleNext}
          />
        );
      case 2:
        return (
          <CampaignStructurePanel
            keywords={selectedKeywords}
            onStructureCreated={setCampaignStructure}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <AdCreationPanel
            adGroups={campaignStructure}
            onAdsCreated={setCampaignAds}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <CampaignSettingsPanel
            adGroups={campaignStructure}
            onSettingsCreated={setCampaignSettings}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 5:
        return (
          <CampaignReviewPanel
            keywords={selectedKeywords}
            adGroups={campaignStructure}
            ads={campaignAds}
            settings={campaignSettings}
            onBack={handleBack}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-6 w-6" />
            Campaign Builder
          </CardTitle>
          <CardDescription>
            Create high-performing Google Ads campaigns with AI assistance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progress)}% complete</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Step Navigation */}
            <div className="flex flex-wrap gap-2">
              {steps.map((step) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = completedSteps.has(step.id);
                const isAccessible = step.id <= currentStep || completedSteps.has(step.id - 1);

                return (
                  <Button
                    key={step.id}
                    variant={isActive ? "default" : isCompleted ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => handleStepClick(step.id)}
                    disabled={!isAccessible}
                    className="flex items-center gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{step.title}</span>
                    <span className="sm:hidden">{step.id}</span>
                    {isCompleted && (
                      <CheckCircle className="h-3 w-3 ml-1" />
                    )}
                  </Button>
                );
              })}
            </div>

            {/* Current Step Info */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{steps[currentStep - 1].title}</h3>
                <p className="text-sm text-muted-foreground">
                  {steps[currentStep - 1].description}
                </p>
              </div>
              <Badge variant="outline">
                Step {currentStep} of {steps.length}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <div className="min-h-[600px]">
        {renderStepContent()}
      </div>

      {/* Navigation Footer */}
      {currentStep > 1 && currentStep < 5 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div className="text-sm text-muted-foreground">
                Need help? Check our documentation or contact support.
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};