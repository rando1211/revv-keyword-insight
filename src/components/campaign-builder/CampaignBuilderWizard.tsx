import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Rocket, Target, FileText, Settings, CheckCircle, Sparkles } from 'lucide-react';
import { KeywordResearchPanel } from './KeywordResearchPanel';
import { CampaignStructurePanel } from './CampaignStructurePanel';
import { AdCreationPanel } from './AdCreationPanel';
import { CampaignSettingsPanel } from './CampaignSettingsPanel';
import { CampaignReviewPanel } from './CampaignReviewPanel';
import { QuickCampaignMode } from './QuickCampaignMode';

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
  const [mode, setMode] = useState<'select' | 'quick' | 'manual'>('select');
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

  const handleQuickModeGenerated = (campaignData: any) => {
    setCampaignSettings(campaignData.settings);
    setCampaignStructure(campaignData.adGroups);
    setCurrentStep(5);
    setMode('manual');
  };

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

  // Mode Selection Screen
  if (mode === 'select') {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-6 w-6" />
              Campaign Builder
            </CardTitle>
            <CardDescription>
              Choose how you'd like to build your campaign
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              {/* Quick Mode */}
              <Card 
                className="p-6 cursor-pointer hover:border-primary transition-all hover:shadow-lg"
                onClick={() => setMode('quick')}
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-8 w-8 text-primary" />
                    <h3 className="text-xl font-semibold">Quick Mode</h3>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Just enter your website domain and let AI generate a complete campaign with optimized ads, keywords, and structure in seconds
                  </p>
                  <div className="bg-muted/50 p-3 rounded-lg space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>3-5 tightly themed ad groups</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>15 headlines + 4 descriptions per ad group</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>AI-optimized keywords</span>
                    </div>
                  </div>
                  <Button className="w-full" size="lg">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Quick Generate
                  </Button>
                </div>
              </Card>

              {/* Manual Mode */}
              <Card 
                className="p-6 cursor-pointer hover:border-primary transition-all hover:shadow-lg"
                onClick={() => setMode('manual')}
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Settings className="h-8 w-8 text-primary" />
                    <h3 className="text-xl font-semibold">Manual Mode</h3>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Step-by-step wizard to research keywords, configure settings, structure ad groups, and create ads with full control
                  </p>
                  <div className="bg-muted/50 p-3 rounded-lg space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>Keyword research tool</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>Custom ad group structure</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>Full customization control</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" size="lg">
                    <Settings className="mr-2 h-4 w-4" />
                    Manual Setup
                  </Button>
                </div>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Quick Mode
  if (mode === 'quick') {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-6 w-6" />
              Quick Campaign Builder
            </CardTitle>
            <CardDescription>
              AI-powered campaign generation from your website
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QuickCampaignMode
              onCampaignGenerated={handleQuickModeGenerated}
              onBack={() => setMode('select')}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Manual Mode
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