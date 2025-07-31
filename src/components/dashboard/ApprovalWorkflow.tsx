import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Clock, User, Settings } from "lucide-react";

export const ApprovalWorkflow = () => {
  const currentOrder = {
    id: 'c0cf03a0-82ed-4d9c-b79d-0f76df7de43e',
    marketingApproval: 'pending',
    technicalApproval: 'pending',
    approvalStatus: 'viewonly',
    schedulingStatus: 'viewonly',
    changeOrderStatus: 'pending'
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'cancelled': 
      case 'disapproved': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'pending': return <Clock className="h-4 w-4 text-warning" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'cancelled': 
      case 'disapproved': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Approval Workflow</span>
          <Badge variant="outline">{currentOrder.id.slice(0, 8)}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Change Order ID */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Change Order ID</label>
          <p className="text-sm font-mono bg-muted p-2 rounded">{currentOrder.id}</p>
        </div>

        {/* Approval Statuses */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Marketing Approval</span>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(currentOrder.marketingApproval)}
              <Select value={currentOrder.marketingApproval}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="disapproved">Disapproved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Technical Approval</span>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(currentOrder.technicalApproval)}
              <Select value={currentOrder.technicalApproval}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="disapproved">Disapproved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Status Information */}
        <div className="space-y-3 pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Approval Status</span>
            <Badge variant={getStatusVariant(currentOrder.approvalStatus)}>
              {currentOrder.approvalStatus}
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Scheduling Status</span>
            <Badge variant={getStatusVariant(currentOrder.schedulingStatus)}>
              {currentOrder.schedulingStatus}
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Change Order Status</span>
            <Badge variant={getStatusVariant(currentOrder.changeOrderStatus)}>
              {currentOrder.changeOrderStatus}
            </Badge>
          </div>
        </div>

        {/* Approval Flow Explanation */}
        <div className="bg-muted p-3 rounded-lg text-sm space-y-2">
          <p className="font-medium">Approval Flow Status:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• <strong>Approved:</strong> Both Tech and Mktg approve of the recommendations and code</li>
            <li>• <strong>Cancelled:</strong> Both Tech and Mktg have disapproved the recommendation</li>
            <li>• <strong>Disapproved:</strong> One or Both approvers has concerns about the recommendation or code</li>
            <li>• <strong>Pending:</strong> Default</li>
            <li>• <strong>View Only:</strong> Recommendations are provided but no automation will be scheduled.</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button variant="outline" className="flex-1">
            Request Review
          </Button>
          <Button className="flex-1">
            Submit for Approval
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};