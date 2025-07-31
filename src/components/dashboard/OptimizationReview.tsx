import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle, XCircle, Play, Clock, TestTube, ChevronDown, ChevronUp, Settings } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from '@/contexts/AccountContext';
import { evaluateCustomRules, getCustomRules, type CustomRule } from '@/lib/custom-optimization-rules';
import { OptimizationCard } from './OptimizationCard';

interface Optimization {
  id: string;
  title: string;
  description: string;
  impact: 'High' | 'Medium' | 'Low';
  type: 'bid_adjustment' | 'keyword_management' | 'budget_optimization' | 'campaign_structure';
  apiEndpoint: string;
  method: string;
  payload: any;
  estimatedImpact: string;
  confidence: number;
}

interface OptimizationReviewProps {
  optimizations: Optimization[];
  customerId: string;
  accountName: string;
  campaignData?: any[]; // Add campaign data to run custom rules
}

export const OptimizationReview = ({ optimizations, customerId, accountName, campaignData = [] }: OptimizationReviewProps) => {
  const [selectedOptimizations, setSelectedOptimizations] = useState<string[]>([]);
  const [executing, setExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState<any[]>([]);
  const [expandedDetails, setExpandedDetails] = useState<string[]>([]);
  const [showCustomRules, setShowCustomRules] = useState(false);
  const { toast } = useToast();

  // Evaluate custom rules against campaign data
  const customOptimizations = evaluateCustomRules(campaignData);
  const allOptimizations = [...optimizations, ...customOptimizations];

  const handleOptimizationToggle = (optimizationId: string) => {
    setSelectedOptimizations(prev => 
      prev.includes(optimizationId) 
        ? prev.filter(id => id !== optimizationId)
        : [...prev, optimizationId]
    );
  };

  const toggleDetails = (optimizationId: string) => {
    setExpandedDetails(prev => 
      prev.includes(optimizationId)
        ? prev.filter(id => id !== optimizationId)
        : [...prev, optimizationId]
    );
  };

  const extractKeywordDetails = (optimization: Optimization) => {
    if (optimization.type !== 'keyword_management') return null;
    
    try {
      console.log('🔍 Extracting keywords from optimization:', optimization);
      const operations = optimization.payload?.operations || [];
      const keywords: Array<{text: string, matchType: string, negative: boolean}> = [];
      
      operations.forEach((operation: any, index: number) => {
        console.log(`🔍 Processing operation ${index}:`, operation);
        
        // Handle the corrected structure (direct create object)
        if (operation.create) {
          const createData = operation.create;
          
          // Check if keyword is directly in create
          if (createData.keyword) {
            console.log('🔑 Found keyword in create:', createData.keyword);
            keywords.push({
              text: createData.keyword.text,
              matchType: createData.keyword.match_type || createData.keyword.matchType || 'BROAD',
              negative: createData.negative || false
            });
          }
          
          // Also check for the old campaignCriterion structure (fallback)
          if (createData.campaignCriterion?.keyword) {
            console.log('🔑 Found keyword in campaignCriterion:', createData.campaignCriterion.keyword);
            keywords.push({
              text: createData.campaignCriterion.keyword.text,
              matchType: createData.campaignCriterion.keyword.match_type || createData.campaignCriterion.keyword.matchType || 'BROAD',
              negative: createData.campaignCriterion.negative || false
            });
          }
        }
      });
      
      console.log('🔍 Extracted keywords:', keywords);
      return keywords;
    } catch (error) {
      console.error('Error extracting keyword details:', error);
      return null;
    }
  };

  const handleSelectAll = () => {
    if (selectedOptimizations.length === allOptimizations.length) {
      setSelectedOptimizations([]);
    } else {
      setSelectedOptimizations(allOptimizations.map(opt => opt.id));
    }
  };

  const handleExecuteOptimizations = async () => {
    if (selectedOptimizations.length === 0) {
      toast({
        title: "No Optimizations Selected",
        description: "Please select at least one optimization to execute.",
        variant: "destructive",
      });
      return;
    }

    setExecuting(true);
    try {
      console.log('🚀 Starting optimization execution...');
      console.log('Selected optimizations:', selectedOptimizations);
      console.log('Customer ID:', customerId);
      console.log('Account name:', accountName);
      console.log('Optimizations data:', allOptimizations);

      toast({
        title: "🚀 Executing Optimizations",
        description: `Applying ${selectedOptimizations.length} optimizations to ${accountName}...`,
      });

      const { data, error } = await supabase.functions.invoke('execute-optimizations', {
        body: {
          optimizations: allOptimizations,
          customerId,
          approved: selectedOptimizations
        }
      });

      console.log('✅ Execution response:', data);
      if (error) {
        console.error('❌ Execution error:', error);
        throw error;
      }

      setExecutionResults(data.results);
      
      // Show debug information
      if (data.debugInfo) {
        console.log('🔍 Debug Info:', data.debugInfo);
      }
      
      toast({
        title: "✅ Optimizations Complete!",
        description: `Successfully executed ${data.executedCount}/${data.totalApproved} optimizations.`,
      });

    } catch (error) {
      console.error('Optimization execution failed:', error);
      toast({
        title: "Execution Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleTestApiConnection = async () => {
    try {
      toast({
        title: "🧪 Testing Google Ads API",
        description: "Checking connection and credentials...",
      });

      const { data, error } = await supabase.functions.invoke('test-google-ads-api', {
        body: { customerId }
      });

      if (error) throw error;

      console.log('🧪 API Test Result:', data);
      
      toast({
        title: data.success ? "✅ API Connection Working!" : "❌ API Connection Failed",
        description: data.message || "Check console for details",
        variant: data.success ? "default" : "destructive",
      });

    } catch (error) {
      console.error('API test failed:', error);
      toast({
        title: "❌ Test Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'High': return 'destructive';
      case 'Medium': return 'default';
      case 'Low': return 'secondary';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bid_adjustment': return '💰';
      case 'keyword_management': return '🔑';
      case 'budget_optimization': return '📊';
      case 'campaign_structure': return '🏗️';
      case 'custom_rule': return '⚡';
      default: return '⚙️';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>Optimizations for {accountName}</span>
              <Badge variant="outline">
                AI: {optimizations.length} | Custom: {customOptimizations.length}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCustomRules(!showCustomRules)}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Rules
              </Button>
              <Badge variant="outline">
                {selectedOptimizations.length}/{allOptimizations.length} selected
              </Badge>
            </div>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Review and approve AI-generated and custom rule optimizations before applying them to your Google Ads account. 
            {customOptimizations.length > 0 && (
              <span className="text-orange-600 font-medium"> 
                {customOptimizations.length} custom rule(s) triggered!
              </span>
            )}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedOptimizations.length === allOptimizations.length ? 'Deselect All' : 'Select All'}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleTestApiConnection}
                className="flex items-center gap-2"
              >
                <TestTube className="h-4 w-4" />
                Test API
              </Button>
            </div>
            
            <Button 
              onClick={handleExecuteOptimizations}
              disabled={selectedOptimizations.length === 0 || executing}
              className="flex items-center gap-2"
            >
              {executing ? (
                <Clock className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {executing ? "Executing..." : `Execute ${selectedOptimizations.length} Optimizations`}
            </Button>
          </div>

          <Separator />

          <div className="space-y-4">
            {/* Group optimizations by type */}
            {optimizations.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
                  🤖 AI-Generated Optimizations ({optimizations.length})
                </h4>
                {optimizations.map((optimization) => (
                  <OptimizationCard
                    key={optimization.id}
                    optimization={optimization}
                    isSelected={selectedOptimizations.includes(optimization.id)}
                    onToggle={handleOptimizationToggle}
                    isExpanded={expandedDetails.includes(optimization.id)}
                    onToggleDetails={toggleDetails}
                    extractKeywordDetails={extractKeywordDetails}
                    getTypeIcon={getTypeIcon}
                    getImpactColor={getImpactColor}
                  />
                ))}
              </div>
            )}

            {customOptimizations.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
                  ⚡ Custom Rule Optimizations ({customOptimizations.length})
                </h4>
                {customOptimizations.map((optimization) => (
                  <OptimizationCard
                    key={optimization.id}
                    optimization={optimization}
                    isSelected={selectedOptimizations.includes(optimization.id)}
                    onToggle={handleOptimizationToggle}
                    isExpanded={expandedDetails.includes(optimization.id)}
                    onToggleDetails={toggleDetails}
                    extractKeywordDetails={extractKeywordDetails}
                    getTypeIcon={getTypeIcon}
                    getImpactColor={getImpactColor}
                    isCustomRule={true}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Execution Results */}
      {executionResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Execution Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {executionResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">{result.title}</span>
                </div>
                <Badge variant={result.success ? 'default' : 'destructive'}>
                  {result.success ? 'Success' : 'Failed'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};