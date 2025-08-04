import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, X, Target, Brain, BarChart3, Settings, Users, Zap, Key } from "lucide-react";

interface OnboardingTourProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const tourSteps = [
  {
    title: "Welcome to DEXTRUM! ⚡",
    content: "Your tactical optimization butler is ready for deployment. We'll guide you through a quick tactical briefing to maximize your operational efficiency.",
    icon: Target,
    highlight: "overview"
  },
  {
    title: "Deploy Your API Credentials",
    content: "DEXTRUM requires your own Google Ads API credentials for tactical operations. Click below to configure your Developer Token, Client ID, Client Secret, and Refresh Token.",
    icon: Settings,
    highlight: "api-setup",
    isApiStep: true,
    showApiForm: true
  },
  {
    title: "Tactical Efficiency Score",
    content: "Monitor your operational efficiency in real-time. Green signals optimal performance, red indicates tactical adjustments required.",
    icon: BarChart3,
    highlight: "optimization-score"
  },
  {
    title: "AI Intelligence Panel",
    content: "Access elite-level campaign intelligence. Deploy AI reconnaissance through the '🧠 AI Insights' tab for tactical recommendations.",
    icon: Brain,
    highlight: "ai-insights"
  },
  {
    title: "Competitor Surveillance",
    content: "Maintain tactical advantage through competitor reconnaissance. The '🎯 Competitor Analysis' tab provides strategic intelligence.",
    icon: Users,
    highlight: "competitor-analysis"
  },
  {
    title: "Account Command Center",
    content: "Manage multiple Google Ads accounts from your command center. Switch between operations seamlessly in the '🏢 Accounts' tab.",
    icon: Settings,
    highlight: "accounts"
  },
  {
    title: "Rapid Deployment Tools",
    content: "Execute instant tactical operations: ROI Analysis, Deep Campaign Audits, and Intelligence Reports. Swift decisions through precision tools.",
    icon: Zap,
    highlight: "quick-actions"
  },
  {
    title: "Tactical Deployment Complete! 🎯",
    content: "DEXTRUM is now operational. Begin by connecting your Google Ads account and initiating your first optimization protocol.",
    icon: Target,
    highlight: "complete"
  }
];

export function OnboardingTour({ isOpen, onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const progress = ((currentStep + 1) / tourSteps.length) * 100;
  const step = tourSteps[currentStep];
  const Icon = step.icon;

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              {step.title}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          <Progress value={progress} className="h-2" />
          
          <div className="text-center">
            <Badge variant="secondary" className="mb-3">
              Step {currentStep + 1} of {tourSteps.length}
            </Badge>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground leading-relaxed">
                {step.content}
              </p>
              {step.showApiForm && (
                <div className="mt-6 space-y-4">
                  <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                    <p className="text-sm font-medium text-destructive mb-2">Required API Credentials</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      You need your own Google Ads API credentials to deploy DEXTRUM:
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Developer Token</li>
                      <li>Client ID</li>
                      <li>Client Secret</li>
                      <li>Refresh Token</li>
                    </ul>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => window.open('https://supabase.com/dashboard/project/vplwrfapmvxffnrfywqh/settings/functions', '_blank')}
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Configure API Credentials
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full text-xs"
                      onClick={() => window.open('https://developers.google.com/google-ads/api/docs/first-call/dev-token', '_blank')}
                    >
                      Get Google Ads Developer Token
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <div className="flex justify-between pt-4">
            <Button 
              variant="outline" 
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleSkip}>
                Skip Tour
              </Button>
              <Button onClick={handleNext}>
                {currentStep === tourSteps.length - 1 ? 'Get Started!' : 'Next'}
                {currentStep < tourSteps.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}