import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle, XCircle, Play, Clock } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from '@/contexts/AccountContext';

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
}

export const OptimizationReview = ({ optimizations, customerId, accountName }: OptimizationReviewProps) => {
  const [selectedOptimizations, setSelectedOptimizations] = useState<string[]>([]);
  const [executing, setExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState<any[]>([]);
  const { toast } = useToast();

  const handleOptimizationToggle = (optimizationId: string) => {
    setSelectedOptimizations(prev => 
      prev.includes(optimizationId) 
        ? prev.filter(id => id !== optimizationId)
        : [...prev, optimizationId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOptimizations.length === optimizations.length) {
      setSelectedOptimizations([]);
    } else {
      setSelectedOptimizations(optimizations.map(opt => opt.id));
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
      console.log('Optimizations data:', optimizations);

      toast({
        title: "🚀 Executing Optimizations",
        description: `Applying ${selectedOptimizations.length} optimizations to ${accountName}...`,
      });

      const { data, error } = await supabase.functions.invoke('execute-optimizations', {
        body: {
          optimizations,
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
              <span>Review Optimizations for {accountName}</span>
            </div>
            <Badge variant="outline">
              {selectedOptimizations.length}/{optimizations.length} selected
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Review and approve the AI-generated optimizations before applying them to your Google Ads account.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSelectAll}
            >
              {selectedOptimizations.length === optimizations.length ? 'Deselect All' : 'Select All'}
            </Button>
            
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
            {optimizations.map((optimization) => (
              <Card key={optimization.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    <Checkbox
                      id={optimization.id}
                      checked={selectedOptimizations.includes(optimization.id)}
                      onCheckedChange={() => handleOptimizationToggle(optimization.id)}
                    />
                    
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl">{getTypeIcon(optimization.type)}</span>
                          <h4 className="font-semibold">{optimization.title}</h4>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getImpactColor(optimization.impact)}>
                            {optimization.impact} Impact
                          </Badge>
                          <Badge variant="outline">
                            {optimization.confidence}% confidence
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {optimization.description}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Estimated Impact:</span>
                          <br />
                          {optimization.estimatedImpact}
                        </div>
                        <div>
                          <span className="font-medium">API Endpoint:</span>
                          <br />
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">
                            {optimization.method} {optimization.apiEndpoint}
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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