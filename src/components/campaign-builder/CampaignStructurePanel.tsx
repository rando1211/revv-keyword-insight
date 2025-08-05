import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ArrowRight, Plus, Trash2, Target, DollarSign, Layers, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

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

interface CampaignStructurePanelProps {
  keywords: KeywordData[];
  onStructureCreated: (adGroups: AdGroup[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export const CampaignStructurePanel: React.FC<CampaignStructurePanelProps> = ({
  keywords,
  onStructureCreated,
  onNext,
  onBack
}) => {
  const [adGroups, setAdGroups] = useState<AdGroup[]>([]);
  const [selectedTab, setSelectedTab] = useState('auto');

  useEffect(() => {
    if (keywords.length > 0 && adGroups.length === 0) {
      generateAutoStructure();
    }
  }, [keywords]);

  const generateAutoStructure = () => {
    // Group keywords by cluster
    const clusterGroups = keywords.reduce((acc, keyword) => {
      const cluster = keyword.cluster;
      if (!acc[cluster]) {
        acc[cluster] = [];
      }
      acc[cluster].push(keyword);
      return acc;
    }, {} as Record<string, KeywordData[]>);

    // Create ad groups from clusters
    const newAdGroups: AdGroup[] = Object.entries(clusterGroups).map(([cluster, clusterKeywords]) => {
      const avgCpc = clusterKeywords.reduce((sum, kw) => sum + kw.cpcEstimate, 0) / clusterKeywords.length;
      return {
        name: cluster,
        keywords: clusterKeywords,
        maxCpc: Math.round(avgCpc * 1.2 * 100) / 100 // 20% above average CPC
      };
    });

    setAdGroups(newAdGroups);
    onStructureCreated(newAdGroups);
  };

  const addAdGroup = () => {
    const newAdGroup: AdGroup = {
      name: `Ad Group ${adGroups.length + 1}`,
      keywords: [],
      maxCpc: 2.00
    };
    setAdGroups([...adGroups, newAdGroup]);
  };

  const updateAdGroup = (index: number, updates: Partial<AdGroup>) => {
    const updated = adGroups.map((ag, i) => 
      i === index ? { ...ag, ...updates } : ag
    );
    setAdGroups(updated);
    onStructureCreated(updated);
  };

  const removeAdGroup = (index: number) => {
    const updated = adGroups.filter((_, i) => i !== index);
    setAdGroups(updated);
    onStructureCreated(updated);
  };

  const moveKeyword = (keywordIndex: number, fromGroupIndex: number, toGroupIndex: number) => {
    const updated = [...adGroups];
    const keyword = updated[fromGroupIndex].keywords[keywordIndex];
    
    // Remove from source
    updated[fromGroupIndex].keywords.splice(keywordIndex, 1);
    
    // Add to target
    updated[toGroupIndex].keywords.push(keyword);
    
    setAdGroups(updated);
    onStructureCreated(updated);
  };

  const handleNext = () => {
    if (adGroups.length === 0) {
      toast.error('Please create at least one ad group');
      return;
    }
    
    const emptyGroups = adGroups.filter(ag => ag.keywords.length === 0);
    if (emptyGroups.length > 0) {
      toast.error('All ad groups must have at least one keyword');
      return;
    }
    
    onNext();
  };

  const totalKeywords = adGroups.reduce((sum, ag) => sum + ag.keywords.length, 0);
  const avgCpc = adGroups.length > 0 
    ? adGroups.reduce((sum, ag) => sum + ag.maxCpc, 0) / adGroups.length 
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Campaign Structure
          </CardTitle>
          <CardDescription>
            Organize your keywords into logical ad groups for better performance and relevance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{adGroups.length}</div>
              <div className="text-sm text-muted-foreground">Ad Groups</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{totalKeywords}</div>
              <div className="text-sm text-muted-foreground">Total Keywords</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">${avgCpc.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Avg Max CPC</div>
            </div>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="auto">Auto Structure</TabsTrigger>
              <TabsTrigger value="manual">Manual Setup</TabsTrigger>
            </TabsList>
            
            <TabsContent value="auto" className="space-y-4">
              <div className="text-center py-4">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-2">AI-Generated Structure</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  We've automatically grouped your keywords by theme for optimal performance
                </p>
                <Button onClick={generateAutoStructure} variant="outline">
                  Regenerate Structure
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Manual Ad Group Setup</h3>
                <Button onClick={addAdGroup} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Ad Group
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Ad Groups Display */}
          <div className="space-y-4 mt-6">
            {adGroups.map((adGroup, index) => (
              <Card key={index} className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <Input
                        value={adGroup.name}
                        onChange={(e) => updateAdGroup(index, { name: e.target.value })}
                        placeholder="Ad Group Name"
                        className="font-semibold"
                      />
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          <Label htmlFor={`maxCpc-${index}`} className="text-sm">Max CPC:</Label>
                          <Input
                            id={`maxCpc-${index}`}
                            type="number"
                            value={adGroup.maxCpc}
                            onChange={(e) => updateAdGroup(index, { maxCpc: Number(e.target.value) })}
                            step="0.01"
                            min="0.01"
                            className="w-20"
                          />
                        </div>
                        <Badge variant="outline">
                          {adGroup.keywords.length} keywords
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAdGroup(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {adGroup.keywords.map((keyword, kwIndex) => (
                        <div key={keyword.keyword} className="flex items-center gap-2">
                          <Badge 
                            variant="secondary" 
                            className="cursor-pointer hover:bg-accent"
                          >
                            {keyword.keyword}
                            <span className="ml-1 text-xs">
                              (${keyword.cpcEstimate.toFixed(2)})
                            </span>
                          </Badge>
                          {selectedTab === 'manual' && (
                            <Select
                              onValueChange={(value) => {
                                if (value !== index.toString()) {
                                  moveKeyword(kwIndex, index, Number(value));
                                }
                              }}
                            >
                              <SelectTrigger className="w-8 h-6 p-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {adGroups.map((_, targetIndex) => (
                                  <SelectItem 
                                    key={targetIndex} 
                                    value={targetIndex.toString()}
                                    disabled={targetIndex === index}
                                  >
                                    Move to {adGroups[targetIndex].name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      ))}
                    </div>
                    {adGroup.keywords.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground border border-dashed rounded">
                        No keywords in this ad group
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {adGroups.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No ad groups created yet. Use auto structure or add manually.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Keywords
        </Button>
        <Button onClick={handleNext} disabled={adGroups.length === 0}>
          Continue to Ad Creation
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};