import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface OptimizationCardProps {
  optimization: any;
  isSelected: boolean;
  onToggle: (id: string) => void;
  isExpanded: boolean;
  onToggleDetails: (id: string) => void;
  extractKeywordDetails: (opt: any) => any;
  getTypeIcon: (type: string) => string;
  getImpactColor: (impact: string) => string;
  isCustomRule?: boolean;
}

export const OptimizationCard = ({
  optimization,
  isSelected,
  onToggle,
  isExpanded,
  onToggleDetails,
  extractKeywordDetails,
  getTypeIcon,
  getImpactColor,
  isCustomRule = false
}: OptimizationCardProps) => {
  return (
    <Card 
      key={optimization.id} 
      className={`border-l-4 ${isCustomRule ? 'border-l-orange-500' : 'border-l-blue-500'} mb-4`}
    >
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          <Checkbox
            id={optimization.id}
            checked={isSelected}
            onCheckedChange={() => onToggle(optimization.id)}
          />
          
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xl">{getTypeIcon(optimization.type)}</span>
                <h4 className="font-semibold">{optimization.title}</h4>
                {isCustomRule && (
                  <Badge variant="outline" className="text-xs">Custom Rule</Badge>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={getImpactColor(optimization.impact) as "default" | "destructive" | "outline" | "secondary"}>
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

            {/* Show details button for keyword management */}
            {optimization.type === 'keyword_management' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleDetails(optimization.id)}
                className="flex items-center gap-2 mt-2"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Hide Keywords
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Show Keywords
                  </>
                )}
              </Button>
            )}

            {/* Expanded keyword details */}
            {isExpanded && optimization.type === 'keyword_management' && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <h5 className="font-medium mb-3 flex items-center gap-2">
                  🔑 Keywords to be added as negatives:
                </h5>
                {(() => {
                  const keywordDetails = extractKeywordDetails(optimization);
                  if (!keywordDetails || keywordDetails.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground">
                        No keywords found in this optimization.
                      </p>
                    );
                  }
                  
                  return (
                    <div className="space-y-2">
                      {keywordDetails.map((keyword: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-background rounded border">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="font-mono text-xs">
                              "{keyword.text}"
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Match Type: {keyword.matchType}
                            </span>
                          </div>
                          <Badge variant={keyword.negative ? "destructive" : "default"}>
                            {keyword.negative ? "Negative" : "Positive"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Show triggered rule info for custom rules */}
            {isCustomRule && optimization.triggeredBy && (
              <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-sm">
                <span className="font-medium text-orange-800">Triggered by:</span> 
                <span className="text-orange-700"> {optimization.triggeredBy}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};