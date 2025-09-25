import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, Target, Activity } from 'lucide-react';
import { toast } from 'sonner';

interface ScalingKeyword {
  searchTerm: string;
  campaignName: string;
  adGroupName: string;
  campaignId: string;
  adGroupId: string;
  impressions?: number;
  clicks?: number;
  cost?: number;
  conversions?: number;
  conversionRate?: number;
  reason: string;
  impact: 'high' | 'medium' | 'low';
  potentialTrafficIncrease?: string;
}

interface ScalingKeywordReviewProps {
  keywords: ScalingKeyword[];
  customerId: string;
  onConfirm: (selectedKeywords: {
    searchTerm: string;
    matchType: string;
    campaignId: string;
    adGroupId: string;
    reason: string;
  }[]) => Promise<void>;
  onCancel: () => void;
}

const ScalingKeywordReview: React.FC<ScalingKeywordReviewProps> = ({
  keywords,
  customerId,
  onConfirm,
  onCancel
}) => {
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [matchTypes, setMatchTypes] = useState<Record<string, string>>({});
  const [isExecuting, setIsExecuting] = useState(false);

  const handleKeywordToggle = (keyword: string) => {
    const newSelected = new Set(selectedKeywords);
    if (newSelected.has(keyword)) {
      newSelected.delete(keyword);
      const newMatchTypes = { ...matchTypes };
      delete newMatchTypes[keyword];
      setMatchTypes(newMatchTypes);
    } else {
      newSelected.add(keyword);
      setMatchTypes(prev => ({ ...prev, [keyword]: 'EXACT' }));
    }
    setSelectedKeywords(newSelected);
  };

  const handleMatchTypeChange = (keyword: string, matchType: string) => {
    setMatchTypes(prev => ({ ...prev, [keyword]: matchType }));
  };

  const handleSelectAll = () => {
    if (selectedKeywords.size === keywords.length) {
      setSelectedKeywords(new Set());
      setMatchTypes({});
    } else {
      const allKeywords = new Set(keywords.map(k => k.searchTerm));
      const allMatchTypes = Object.fromEntries(
        keywords.map(k => [k.searchTerm, 'EXACT'])
      );
      setSelectedKeywords(allKeywords);
      setMatchTypes(allMatchTypes);
    }
  };

  const handleConfirm = async () => {
    if (selectedKeywords.size === 0) {
      toast.error('Please select at least one keyword to scale');
      return;
    }

    setIsExecuting(true);
    try {
      const selectedActions = Array.from(selectedKeywords).map(keywordText => {
        const keyword = keywords.find(k => k.searchTerm === keywordText);
        return {
          searchTerm: keywordText,
          matchType: matchTypes[keywordText] || 'EXACT',
          campaignId: keyword?.campaignId || '',
          adGroupId: keyword?.adGroupId || '',
          reason: keyword?.reason || 'scaling search term optimization'
        };
      });

      await onConfirm(selectedActions);
      toast.success(`Successfully processed ${selectedActions.length} scaling keywords`);
    } catch (error) {
      console.error('Error executing scaling keywords:', error);
      toast.error('Failed to execute scaling keywords');
    } finally {
      setIsExecuting(false);
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'medium':
        return <Target className="h-4 w-4 text-blue-600" />;
      case 'low':
        return <Activity className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const totalPotentialTraffic = Array.from(selectedKeywords).reduce((sum, keyword) => {
    const keywordData = keywords.find(k => k.searchTerm === keyword);
    return sum + (keywordData?.impressions || 0);
  }, 0);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Review & Confirm Keyword Scaling</span>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            {keywords.length} high-performing keywords found
          </Badge>
        </CardTitle>
        <p className="text-muted-foreground">
          Select which high-performing keywords to expand with exact match targeting. This will help capture more qualified traffic with better conversion potential.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleSelectAll}
            size="sm"
          >
            {selectedKeywords.size === keywords.length ? 'Deselect All' : 'Select All'}
          </Button>
          
          {selectedKeywords.size > 0 && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">{selectedKeywords.size}</span> selected • 
              Potential traffic increase: <span className="font-medium text-green-600">
                +{totalPotentialTraffic.toLocaleString()} impressions
              </span>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {keywords.map((keyword, index) => (
            <div
              key={index}
              className={`p-3 border rounded-lg transition-colors ${
                selectedKeywords.has(keyword.searchTerm) 
                  ? 'bg-green-50 border-green-200' 
                  : 'hover:bg-accent/50'
              }`}
            >
              <div className="flex items-start space-x-3">
                <Checkbox
                  checked={selectedKeywords.has(keyword.searchTerm)}
                  onCheckedChange={() => handleKeywordToggle(keyword.searchTerm)}
                  className="mt-1"
                />
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getImpactIcon(keyword.impact)}
                      <span className="font-medium">{keyword.searchTerm}</span>
                      <Badge variant="outline" className="text-xs bg-green-100">
                        {keyword.impact} potential
                      </Badge>
                    </div>
                    
                    {selectedKeywords.has(keyword.searchTerm) && (
                      <div className="flex items-center space-x-2">
                        <Select
                          value={matchTypes[keyword.searchTerm] || 'EXACT'}
                          onValueChange={(value) => handleMatchTypeChange(keyword.searchTerm, value)}
                        >
                          <SelectTrigger className="w-28 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EXACT">Exact</SelectItem>
                            <SelectItem value="PHRASE">Phrase</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  
                  {/* Campaign and Ad Group Information */}
                  <div className="flex items-center space-x-2 text-xs">
                    <Badge variant="secondary" className="text-xs">
                      {keyword.campaignName}
                    </Badge>
                    <span className="text-muted-foreground">→</span>
                    <Badge variant="outline" className="text-xs">
                      {keyword.adGroupName}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {keyword.reason}
                  </p>
                  
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    {keyword.impressions && <span>{keyword.impressions.toLocaleString()} impressions</span>}
                    {keyword.clicks && <span>{keyword.clicks} clicks</span>}
                    {keyword.cost && <span>${keyword.cost.toFixed(2)} cost</span>}
                    {keyword.conversions && <span>{keyword.conversions} conversions</span>}
                    {keyword.conversionRate && <span>{(typeof keyword.conversionRate === 'number' ? keyword.conversionRate : parseFloat(keyword.conversionRate) || 0).toFixed(1)}% CVR</span>}
                    {keyword.potentialTrafficIncrease && (
                      <span className="text-green-600 font-medium">
                        {keyword.potentialTrafficIncrease} potential increase
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isExecuting}
          >
            Cancel
          </Button>
          
          <div className="flex space-x-2">
            <Button
              variant="secondary"
              onClick={onCancel}
              disabled={isExecuting}
            >
              Review More
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isExecuting || selectedKeywords.size === 0}
              className="min-w-32 bg-green-600 hover:bg-green-700"
            >
              {isExecuting ? 'Scaling...' : `Scale ${selectedKeywords.size} Keywords`}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScalingKeywordReview;