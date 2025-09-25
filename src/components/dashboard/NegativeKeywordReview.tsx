import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SearchTerm {
  query: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  reason: string;
  impact: 'high' | 'medium' | 'low';
  campaignName?: string;
  adGroupName?: string;
  campaignId?: string;
  adGroupId?: string;
}

interface NegativeKeywordReviewProps {
  searchTerms: SearchTerm[];
  customerId: string;
  onConfirm: (selectedTerms: { term: string; matchType: string }[]) => Promise<void>;
  onCancel: () => void;
}

const NegativeKeywordReview: React.FC<NegativeKeywordReviewProps> = ({
  searchTerms,
  customerId,
  onConfirm,
  onCancel
}) => {
  const [selectedTerms, setSelectedTerms] = useState<Set<string>>(new Set());
  const [matchTypes, setMatchTypes] = useState<Record<string, string>>({});
  const [negativeKeywordLevels, setNegativeKeywordLevels] = useState<Record<string, 'campaign' | 'adgroup'>>({});
  const [isExecuting, setIsExecuting] = useState(false);

  const handleTermToggle = (term: string) => {
    const newSelected = new Set(selectedTerms);
    if (newSelected.has(term)) {
      newSelected.delete(term);
      const newMatchTypes = { ...matchTypes };
      const newLevels = { ...negativeKeywordLevels };
      delete newMatchTypes[term];
      delete newLevels[term];
      setMatchTypes(newMatchTypes);
      setNegativeKeywordLevels(newLevels);
    } else {
      newSelected.add(term);
      setMatchTypes(prev => ({ ...prev, [term]: 'BROAD' }));
      setNegativeKeywordLevels(prev => ({ ...prev, [term]: 'campaign' }));
    }
    setSelectedTerms(newSelected);
  };

  const handleMatchTypeChange = (term: string, matchType: string) => {
    setMatchTypes(prev => ({ ...prev, [term]: matchType }));
  };

  const handleLevelChange = (term: string, level: 'campaign' | 'adgroup') => {
    setNegativeKeywordLevels(prev => ({ ...prev, [term]: level }));
  };

  const handleSelectAll = () => {
    if (selectedTerms.size === searchTerms.length) {
      setSelectedTerms(new Set());
      setMatchTypes({});
      setNegativeKeywordLevels({});
    } else {
      const allTerms = new Set(searchTerms.map(st => st.query));
      const allMatchTypes = Object.fromEntries(
        searchTerms.map(st => [st.query, 'BROAD'])
      );
      const allLevels = Object.fromEntries(
        searchTerms.map(st => [st.query, 'campaign' as const])
      );
      setSelectedTerms(allTerms);
      setMatchTypes(allMatchTypes);
      setNegativeKeywordLevels(allLevels);
    }
  };

  const handleConfirm = async () => {
    if (selectedTerms.size === 0) {
      toast.error('Please select at least one search term to add as negative keyword');
      return;
    }

    setIsExecuting(true);
    try {
      const selectedActions = Array.from(selectedTerms).map(term => {
        const searchTerm = searchTerms.find(st => st.query === term);
        return {
          term,
          matchType: matchTypes[term] || 'BROAD',
          level: negativeKeywordLevels[term] || 'campaign',
          campaignId: searchTerm?.campaignId,
          adGroupId: searchTerm?.adGroupId
        };
      });

      await onConfirm(selectedActions);
      toast.success(`Successfully processed ${selectedActions.length} negative keywords`);
    } catch (error) {
      console.error('Error executing negative keywords:', error);
      toast.error('Failed to execute negative keywords');
    } finally {
      setIsExecuting(false);
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'low':
        return <CheckCircle2 className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const totalCostSavings = Array.from(selectedTerms).reduce((sum, term) => {
    const searchTerm = searchTerms.find(st => st.query === term);
    return sum + (searchTerm?.cost || 0);
  }, 0);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Review & Confirm Negative Keywords</span>
          <Badge variant="secondary">
            {searchTerms.length} wasteful search terms found
          </Badge>
        </CardTitle>
        <p className="text-muted-foreground">
          Select which search terms to add as negative keywords. Choose between campaign-level (broader impact) or ad group-level (more targeted) negatives.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleSelectAll}
            size="sm"
          >
            {selectedTerms.size === searchTerms.length ? 'Deselect All' : 'Select All'}
          </Button>
          
          {selectedTerms.size > 0 && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">{selectedTerms.size}</span> selected • 
              Potential savings: <span className="font-medium text-primary">
                ${totalCostSavings.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {searchTerms.map((searchTerm, index) => (
            <div
              key={index}
              className={`p-3 border rounded-lg transition-colors ${
                selectedTerms.has(searchTerm.query) 
                  ? 'bg-accent border-primary' 
                  : 'hover:bg-accent/50'
              }`}
            >
              <div className="flex items-start space-x-3">
                <Checkbox
                  checked={selectedTerms.has(searchTerm.query)}
                  onCheckedChange={() => handleTermToggle(searchTerm.query)}
                  className="mt-1"
                />
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getImpactIcon(searchTerm.impact)}
                      <span className="font-medium">{searchTerm.query}</span>
                      <Badge variant="outline" className="text-xs">
                        {searchTerm.impact} impact
                      </Badge>
                    </div>
                    
                    {selectedTerms.has(searchTerm.query) && (
                      <div className="flex items-center space-x-2">
                        <Select
                          value={negativeKeywordLevels[searchTerm.query] || 'campaign'}
                          onValueChange={(value: 'campaign' | 'adgroup') => handleLevelChange(searchTerm.query, value)}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="campaign">Campaign</SelectItem>
                            <SelectItem value="adgroup">Ad Group</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={matchTypes[searchTerm.query] || 'BROAD'}
                          onValueChange={(value) => handleMatchTypeChange(searchTerm.query, value)}
                        >
                          <SelectTrigger className="w-28 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BROAD">Broad</SelectItem>
                            <SelectItem value="PHRASE">Phrase</SelectItem>
                            <SelectItem value="EXACT">Exact</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  
                  {/* Ad Group Information */}
                  {(searchTerm.campaignName || searchTerm.adGroupName) && (
                    <div className="flex items-center space-x-2 text-xs">
                      <Badge variant="secondary" className="text-xs">
                        {searchTerm.campaignName || 'Unknown Campaign'}
                      </Badge>
                      {searchTerm.adGroupName && (
                        <>
                          <span className="text-muted-foreground">→</span>
                          <Badge variant="outline" className="text-xs">
                            {searchTerm.adGroupName}
                          </Badge>
                        </>
                      )}
                    </div>
                  )}
                  
                  <p className="text-sm text-muted-foreground">
                    {searchTerm.reason}
                  </p>
                  
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <span>{searchTerm.impressions} impressions</span>
                    <span>{searchTerm.clicks} clicks</span>
                    <span>${searchTerm.cost.toFixed(2)} cost</span>
                    <span>{searchTerm.conversions} conversions</span>
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
              disabled={isExecuting || selectedTerms.size === 0}
              className="min-w-32"
            >
              {isExecuting ? 'Adding...' : `Add ${selectedTerms.size} Negatives`}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NegativeKeywordReview;