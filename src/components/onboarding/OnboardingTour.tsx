import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, X, Target, Brain, BarChart3, Settings, Users, Zap } from "lucide-react";

interface OnboardingTourProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const tourSteps = [
  {
    title: "Welcome to AI Ads Accelerator! 🎉",
    content: "We'll take you on a quick tour to help you get the most out of your dashboard. This will only take 2 minutes!",
    icon: Target,
    highlight: "overview"
  },
  {
    title: "Optimization Score",
    content: "Your real-time optimization score shows how well your campaigns are performing. Green means great, red means there's room for improvement!",
    icon: BarChart3,
    highlight: "optimization-score"
  },
  {
    title: "AI Insights Panel",
    content: "Get intelligent recommendations powered by OpenAI. Click the '🧠 AI Insights' tab to see detailed campaign analysis and optimization suggestions.",
    icon: Brain,
    highlight: "ai-insights"
  },
  {
    title: "Competitor Analysis",
    content: "Monitor your competitors and discover new opportunities. The '🎯 Competitor Analysis' tab helps you stay ahead of the competition.",
    icon: Users,
    highlight: "competitor-analysis"
  },
  {
    title: "Account Management",
    content: "Connect your Google Ads accounts in the '🏢 Accounts' tab. You can manage multiple accounts and switch between them easily.",
    icon: Settings,
    highlight: "accounts"
  },
  {
    title: "Quick Actions",
    content: "Use the Quick Actions panel for instant tools like ROI Simulator, Deep Audit, and Report Generation. These help you make data-driven decisions fast!",
    icon: Zap,
    highlight: "quick-actions"
  },
  {
    title: "You're All Set! 🚀",
    content: "That's it! You're ready to optimize your Google Ads campaigns with AI. Start by connecting your Google Ads account and running your first analysis.",
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