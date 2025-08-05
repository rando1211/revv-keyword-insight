import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ArrowRight, Sparkles, FileText, Eye, Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface KeywordData {
  keyword: string;
  searchVolume: number;
  competition: 'LOW' | 'MEDIUM' | 'HIGH';
  cpcEstimate: number;
  relevanceScore: number;
  cluster: string;
}

interface AdGroup {
  name: string;
  keywords: KeywordData[];
  maxCpc: number;
}

interface Ad {
  headlines: string[];
  descriptions: string[];
  path1: string;
  path2: string;
  finalUrl: string;
}

interface AdCreationPanelProps {
  adGroups: AdGroup[];
  onAdsCreated: (ads: { [adGroupName: string]: Ad[] }) => void;
  onNext: () => void;
  onBack: () => void;
}

export const AdCreationPanel: React.FC<AdCreationPanelProps> = ({
  adGroups,
  onAdsCreated,
  onNext,
  onBack
}) => {
  const [ads, setAds] = useState<{ [adGroupName: string]: Ad[] }>({});
  const [selectedAdGroup, setSelectedAdGroup] = useState(adGroups[0]?.name || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [businessInfo, setBusinessInfo] = useState({
    businessName: '',
    businessDescription: '',
    valueProposition: '',
    targetAudience: '',
    websiteUrl: ''
  });

  const generateAdsForAdGroup = async (adGroupName: string) => {
    const adGroup = adGroups.find(ag => ag.name === adGroupName);
    if (!adGroup) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ad-copy', {
        body: {
          adGroupName,
          keywords: adGroup.keywords.map(kw => kw.keyword),
          businessInfo,
          adGroup: {
            theme: adGroup.name,
            avgCpc: adGroup.maxCpc,
            keywordCount: adGroup.keywords.length
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        const newAds = { ...ads };
        newAds[adGroupName] = data.ads;
        setAds(newAds);
        onAdsCreated(newAds);
        toast.success(`Generated ${data.ads.length} ads for ${adGroupName}`);
      } else {
        throw new Error(data.error || 'Failed to generate ads');
      }
    } catch (error) {
      console.error('Ad generation error:', error);
      toast.error('Failed to generate ads. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAllAds = async () => {
    if (!businessInfo.businessName || !businessInfo.websiteUrl) {
      toast.error('Please fill in business name and website URL');
      return;
    }

    setIsGenerating(true);
    let accumulatedAds = { ...ads };
    
    try {
      for (const adGroup of adGroups) {
        const { data, error } = await supabase.functions.invoke('generate-ad-copy', {
          body: {
            adGroupName: adGroup.name,
            keywords: adGroup.keywords.map(kw => kw.keyword),
            businessInfo,
            adGroup: {
              theme: adGroup.name,
              avgCpc: adGroup.maxCpc,
              keywordCount: adGroup.keywords.length
            }
          }
        });

        if (error) throw error;

        if (data.success) {
          accumulatedAds[adGroup.name] = data.ads;
          toast.success(`Generated ${data.ads.length} ads for ${adGroup.name}`);
        } else {
          throw new Error(data.error || `Failed to generate ads for ${adGroup.name}`);
        }
      }
      
      setAds(accumulatedAds);
      onAdsCreated(accumulatedAds);
      toast.success('Generated ads for all ad groups!');
    } catch (error) {
      console.error('Bulk ad generation error:', error);
      toast.error('Failed to generate all ads. Please try individual generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const addManualAd = (adGroupName: string) => {
    const newAd: Ad = {
      headlines: ['', '', ''],
      descriptions: ['', ''],
      path1: '',
      path2: '',
      finalUrl: businessInfo.websiteUrl || ''
    };

    const newAds = { ...ads };
    if (!newAds[adGroupName]) {
      newAds[adGroupName] = [];
    }
    newAds[adGroupName].push(newAd);
    setAds(newAds);
    onAdsCreated(newAds);
  };

  const updateAd = (adGroupName: string, adIndex: number, updates: Partial<Ad>) => {
    const newAds = { ...ads };
    if (newAds[adGroupName] && newAds[adGroupName][adIndex]) {
      newAds[adGroupName][adIndex] = { ...newAds[adGroupName][adIndex], ...updates };
      setAds(newAds);
      onAdsCreated(newAds);
    }
  };

  const removeAd = (adGroupName: string, adIndex: number) => {
    const newAds = { ...ads };
    if (newAds[adGroupName]) {
      newAds[adGroupName].splice(adIndex, 1);
      setAds(newAds);
      onAdsCreated(newAds);
    }
  };

  const handleNext = () => {
    const adGroupsWithAds = Object.keys(ads).length;
    if (adGroupsWithAds === 0) {
      toast.error('Please create at least one ad');
      return;
    }

    const emptyAdGroups = adGroups.filter(ag => !ads[ag.name] || ads[ag.name].length === 0);
    if (emptyAdGroups.length > 0) {
      toast.error(`Please create ads for all ad groups: ${emptyAdGroups.map(ag => ag.name).join(', ')}`);
      return;
    }

    onNext();
  };

  const currentAds = ads[selectedAdGroup] || [];
  const totalAds = Object.values(ads).reduce((sum, adGroupAds) => sum + adGroupAds.length, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Ad Creation
          </CardTitle>
          <CardDescription>
            Create compelling ad copy for your campaigns using AI assistance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Business Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-accent/50 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                value={businessInfo.businessName}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, businessName: e.target.value }))}
                placeholder="Your Business Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Website URL *</Label>
              <Input
                id="websiteUrl"
                value={businessInfo.websiteUrl}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, websiteUrl: e.target.value }))}
                placeholder="https://your-website.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessDescription">Business Description</Label>
              <Textarea
                id="businessDescription"
                value={businessInfo.businessDescription}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, businessDescription: e.target.value }))}
                placeholder="Brief description of your business"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valueProposition">Value Proposition</Label>
              <Textarea
                id="valueProposition"
                value={businessInfo.valueProposition}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, valueProposition: e.target.value }))}
                placeholder="What makes you unique?"
                rows={2}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{adGroups.length}</div>
              <div className="text-sm text-muted-foreground">Ad Groups</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{totalAds}</div>
              <div className="text-sm text-muted-foreground">Total Ads</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{Object.keys(ads).length}</div>
              <div className="text-sm text-muted-foreground">Groups with Ads</div>
            </div>
          </div>

          {/* Generate All Button */}
          <div className="text-center">
            <Button 
              onClick={generateAllAds} 
              disabled={isGenerating || !businessInfo.businessName || !businessInfo.websiteUrl}
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Ads...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate All Ads with AI
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ad Group Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Ad Group Management</CardTitle>
          <CardDescription>
            Select an ad group to view and edit its ads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedAdGroup} onValueChange={setSelectedAdGroup}>
            <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {adGroups.map((adGroup) => (
                <TabsTrigger key={adGroup.name} value={adGroup.name} className="text-xs">
                  {adGroup.name}
                  <Badge variant="secondary" className="ml-2">
                    {ads[adGroup.name]?.length || 0}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {adGroups.map((adGroup) => (
              <TabsContent key={adGroup.name} value={adGroup.name} className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{adGroup.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {adGroup.keywords.length} keywords • Max CPC: ${adGroup.maxCpc}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateAdsForAdGroup(adGroup.name)}
                      disabled={isGenerating}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate AI Ads
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addManualAd(adGroup.name)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Manual Ad
                    </Button>
                  </div>
                </div>

                {/* Ads for this ad group */}
                <div className="space-y-4">
                  {currentAds.map((ad, adIndex) => (
                    <Card key={adIndex} className="border-2">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">Ad #{adIndex + 1}</CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAd(adGroup.name, adIndex)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Headlines */}
                        <div className="space-y-2">
                          <Label>Headlines (up to 30 characters each)</Label>
                          {ad.headlines.map((headline, hIndex) => (
                            <Input
                              key={hIndex}
                              value={headline}
                              onChange={(e) => {
                                const newHeadlines = [...ad.headlines];
                                newHeadlines[hIndex] = e.target.value;
                                updateAd(adGroup.name, adIndex, { headlines: newHeadlines });
                              }}
                              placeholder={`Headline ${hIndex + 1}`}
                              maxLength={30}
                            />
                          ))}
                        </div>

                        {/* Descriptions */}
                        <div className="space-y-2">
                          <Label>Descriptions (up to 90 characters each)</Label>
                          {ad.descriptions.map((description, dIndex) => (
                            <Textarea
                              key={dIndex}
                              value={description}
                              onChange={(e) => {
                                const newDescriptions = [...ad.descriptions];
                                newDescriptions[dIndex] = e.target.value;
                                updateAd(adGroup.name, adIndex, { descriptions: newDescriptions });
                              }}
                              placeholder={`Description ${dIndex + 1}`}
                              maxLength={90}
                              rows={2}
                            />
                          ))}
                        </div>

                        {/* Paths and URL */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Path 1</Label>
                            <Input
                              value={ad.path1}
                              onChange={(e) => updateAd(adGroup.name, adIndex, { path1: e.target.value })}
                              placeholder="path1"
                              maxLength={15}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Path 2</Label>
                            <Input
                              value={ad.path2}
                              onChange={(e) => updateAd(adGroup.name, adIndex, { path2: e.target.value })}
                              placeholder="path2"
                              maxLength={15}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Final URL</Label>
                            <Input
                              value={ad.finalUrl}
                              onChange={(e) => updateAd(adGroup.name, adIndex, { finalUrl: e.target.value })}
                              placeholder="https://..."
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {currentAds.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                      No ads created for this ad group yet
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Structure
        </Button>
        <Button onClick={handleNext} disabled={totalAds === 0}>
          Continue to Settings
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};