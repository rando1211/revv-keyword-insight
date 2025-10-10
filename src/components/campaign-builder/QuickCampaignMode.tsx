import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface QuickCampaignModeProps {
  onCampaignGenerated: (campaignData: any) => void;
  onBack: () => void;
}

export const QuickCampaignMode = ({ onCampaignGenerated, onBack }: QuickCampaignModeProps) => {
  const [domain, setDomain] = useState('');
  const [budget, setBudget] = useState('50');
  const [instructions, setInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!domain) {
      toast({
        title: "Domain Required",
        description: "Please enter your website domain",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      console.log('🚀 Generating campaign for domain:', domain);
      
      const { data, error } = await supabase.functions.invoke('auto-generate-campaign', {
        body: {
          domain,
          budget: parseFloat(budget) || 50,
          instructions: instructions.trim() || undefined,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate campaign');
      }

      console.log('✅ Campaign generated:', data.campaign);

      toast({
        title: "Campaign Generated!",
        description: "Your AI-powered campaign is ready to review and launch",
      });

      onCampaignGenerated(data.campaign);

    } catch (error) {
      console.error('❌ Generation error:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate campaign",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold">Quick Campaign Builder</h2>
        </div>
        <p className="text-muted-foreground">
          Enter your website domain and let AI create a complete campaign in seconds
        </p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="domain">Website Domain *</Label>
          <Input
            id="domain"
            placeholder="example.com or https://example.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            disabled={isGenerating}
          />
          <p className="text-sm text-muted-foreground">
            We'll analyze your website to create optimized ads and keywords
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="budget">Daily Budget (USD) *</Label>
          <Input
            id="budget"
            type="number"
            min="1"
            placeholder="50"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            disabled={isGenerating}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="instructions">Additional Instructions (Optional)</Label>
          <Textarea
            id="instructions"
            placeholder="E.g., Focus on local customers, emphasize eco-friendly products, target enterprise clients..."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            disabled={isGenerating}
            rows={4}
            className="resize-none"
          />
          <p className="text-sm text-muted-foreground">
            Give AI specific directions about your campaign goals, target audience, or unique selling points
          </p>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            What You'll Get:
          </h3>
          <ul className="text-sm space-y-1 text-muted-foreground ml-6 list-disc">
            <li>3-5 tightly themed ad groups</li>
            <li>5-10 optimized keywords per ad group</li>
            <li>15 unique headlines per ad group (max 30 chars)</li>
            <li>4 compelling descriptions per ad group (max 90 chars)</li>
            <li>Optimal campaign settings</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isGenerating}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !domain}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Campaign...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Campaign
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};
