import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Loader2, Search, Filter, Download, Target, TrendingUp, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface KeywordData {
  keyword: string;
  searchVolume: number;
  competition: 'LOW' | 'MEDIUM' | 'HIGH';
  cpcEstimate: number;
  relevanceScore: number;
  cluster: string;
  opportunityScore?: number;
  estimatedClicks?: number;
  estimatedImpressions?: number;
}

interface KeywordResearchPanelProps {
  onKeywordsSelected: (keywords: KeywordData[]) => void;
  onNext: () => void;
}

export const KeywordResearchPanel: React.FC<KeywordResearchPanelProps> = ({
  onKeywordsSelected,
  onNext
}) => {
  const [businessType, setBusinessType] = useState('');
  const [primaryKeywords, setPrimaryKeywords] = useState('');
  const [targetLocation, setTargetLocation] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState(1000);
  const [keywords, setKeywords] = useState<KeywordData[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [clusters, setClusters] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterCluster, setFilterCluster] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('opportunityScore');
  const [searchFilter, setSearchFilter] = useState('');

  const handleResearch = async () => {
    if (!businessType.trim() || !primaryKeywords.trim()) {
      toast.error('Please fill in business type and primary keywords');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-keyword-research', {
        body: {
          businessType: businessType.trim(),
          primaryKeywords: primaryKeywords.split(',').map(k => k.trim()),
          targetLocation: targetLocation.trim() || undefined,
          monthlyBudget: monthlyBudget
        }
      });

      if (error) throw error;

      if (data.success) {
        setKeywords(data.keywords);
        setClusters(data.clusters);
        toast.success(`Generated ${data.totalKeywords} keywords across ${data.clusters.length} clusters`);
      } else {
        throw new Error(data.error || 'Keyword research failed');
      }
    } catch (error) {
      console.error('Keyword research error:', error);
      toast.error('Failed to generate keywords. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeywordToggle = (keyword: string) => {
    const newSelected = new Set(selectedKeywords);
    if (newSelected.has(keyword)) {
      newSelected.delete(keyword);
    } else {
      newSelected.add(keyword);
    }
    setSelectedKeywords(newSelected);
  };

  const handleSelectAll = () => {
    const filteredKeywords = getFilteredKeywords();
    const allSelected = filteredKeywords.every(kw => selectedKeywords.has(kw.keyword));
    
    const newSelected = new Set(selectedKeywords);
    if (allSelected) {
      filteredKeywords.forEach(kw => newSelected.delete(kw.keyword));
    } else {
      filteredKeywords.forEach(kw => newSelected.add(kw.keyword));
    }
    setSelectedKeywords(newSelected);
  };

  const getFilteredKeywords = (): KeywordData[] => {
    return keywords
      .filter(kw => filterCluster === 'all' || kw.cluster === filterCluster)
      .filter(kw => searchFilter === '' || kw.keyword.toLowerCase().includes(searchFilter.toLowerCase()))
      .sort((a, b) => {
        switch (sortBy) {
          case 'opportunityScore':
            return (b.opportunityScore || 0) - (a.opportunityScore || 0);
          case 'searchVolume':
            return b.searchVolume - a.searchVolume;
          case 'cpcEstimate':
            return a.cpcEstimate - b.cpcEstimate;
          case 'relevanceScore':
            return b.relevanceScore - a.relevanceScore;
          default:
            return 0;
        }
      });
  };

  const getCompetitionColor = (competition: string) => {
    switch (competition) {
      case 'LOW': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'HIGH': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const handleProceedWithKeywords = () => {
    const selectedKeywordData = keywords.filter(kw => selectedKeywords.has(kw.keyword));
    if (selectedKeywordData.length === 0) {
      toast.error('Please select at least one keyword');
      return;
    }
    onKeywordsSelected(selectedKeywordData);
    onNext();
  };

  const filteredKeywords = getFilteredKeywords();
  const selectedCount = selectedKeywords.size;
  const estimatedTotalCpc = keywords
    .filter(kw => selectedKeywords.has(kw.keyword))
    .reduce((sum, kw) => sum + kw.cpcEstimate, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Keyword Research
          </CardTitle>
          <CardDescription>
            Generate comprehensive keyword suggestions for your Google Ads campaigns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type *</Label>
              <Input
                id="businessType"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                placeholder="e.g., Digital Marketing Agency"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryKeywords">Primary Keywords *</Label>
              <Input
                id="primaryKeywords"
                value={primaryKeywords}
                onChange={(e) => setPrimaryKeywords(e.target.value)}
                placeholder="e.g., digital marketing, SEO services"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetLocation">Target Location</Label>
              <Input
                id="targetLocation"
                value={targetLocation}
                onChange={(e) => setTargetLocation(e.target.value)}
                placeholder="e.g., United States, New York"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthlyBudget">Monthly Budget ($)</Label>
              <Input
                id="monthlyBudget"
                type="number"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(Number(e.target.value))}
                min="100"
                step="100"
              />
            </div>
          </div>
          <Button 
            onClick={handleResearch} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Keywords...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Generate Keywords
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {keywords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Keyword Results ({keywords.length} total)</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {selectedCount} selected
                </Badge>
                {selectedCount > 0 && (
                  <Badge variant="secondary">
                    Avg CPC: ${(estimatedTotalCpc / selectedCount).toFixed(2)}
                  </Badge>
                )}
              </div>
            </CardTitle>
            <CardDescription>
              Select keywords for your campaign. Higher opportunity scores indicate better potential.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <Select value={filterCluster} onValueChange={setFilterCluster}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by cluster" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clusters</SelectItem>
                      {clusters.map(cluster => (
                        <SelectItem key={cluster} value={cluster}>
                          {cluster}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opportunityScore">Opportunity Score</SelectItem>
                    <SelectItem value="searchVolume">Search Volume</SelectItem>
                    <SelectItem value="cpcEstimate">CPC (Low to High)</SelectItem>
                    <SelectItem value="relevanceScore">Relevance Score</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Search keywords..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-[200px]"
                />
                <Button variant="outline" onClick={handleSelectAll}>
                  {filteredKeywords.every(kw => selectedKeywords.has(kw.keyword)) ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              {/* Keywords Table */}
              <div className="border rounded-lg">
                <div className="max-h-96 overflow-y-auto">
                  <div className="grid gap-2 p-4">
                    {filteredKeywords.map((keyword, index) => (
                      <div 
                        key={keyword.keyword}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedKeywords.has(keyword.keyword)}
                            onCheckedChange={() => handleKeywordToggle(keyword.keyword)}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{keyword.keyword}</div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant="outline" className={getCompetitionColor(keyword.competition)}>
                                {keyword.competition}
                              </Badge>
                              <Badge variant="outline">{keyword.cluster}</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-center">
                            <div className="font-medium">{keyword.searchVolume.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">searches/mo</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">${keyword.cpcEstimate.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">CPC</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">{keyword.opportunityScore || 0}</div>
                            <div className="text-xs text-muted-foreground">opportunity</div>
                            <Progress 
                              value={keyword.opportunityScore || 0} 
                              className="w-12 h-1 mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {selectedCount > 0 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {selectedCount} keywords selected • Estimated total monthly CPC: ${estimatedTotalCpc.toFixed(2)}
                  </div>
                  <Button onClick={handleProceedWithKeywords}>
                    Continue with Selected Keywords
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};