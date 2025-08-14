import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Share2, Trash2, UserPlus } from "lucide-react";

interface SharedAccess {
  id: string;
  shared_with_user_id: string;
  shared_user_email: string;
  created_at: string;
}

export const SharedAccessManager = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [sharedAccess, setSharedAccess] = useState<SharedAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState("");

  useEffect(() => {
    if (user) {
      fetchSharedAccess();
    }
  }, [user]);

  const fetchSharedAccess = async () => {
    try {
      // Get shared access records
      const { data: accessData, error: accessError } = await supabase
        .from('shared_google_ads_access')
        .select('id, shared_with_user_id, created_at')
        .eq('owner_user_id', user?.id);

      if (accessError) throw accessError;

      // Get user emails for shared access
      const userIds = accessData.map(item => item.shared_with_user_id);
      const { data: subscriberData, error: subError } = await supabase
        .from('subscribers')
        .select('user_id, email')
        .in('user_id', userIds);

      if (subError) throw subError;

      const formattedData = accessData.map(item => {
        const subscriber = subscriberData.find(sub => sub.user_id === item.shared_with_user_id);
        return {
          id: item.id,
          shared_with_user_id: item.shared_with_user_id,
          shared_user_email: subscriber?.email || 'Unknown',
          created_at: item.created_at
        };
      });

      setSharedAccess(formattedData);
    } catch (error) {
      console.error('Error fetching shared access:', error);
      toast({
        title: "Error",
        description: "Failed to fetch shared access records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const shareAccessWithUser = async () => {
    if (!newUserEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    try {
      // First, find the user by email
      const { data: subscriber, error: subError } = await supabase
        .from('subscribers')
        .select('user_id')
        .eq('email', newUserEmail)
        .single();

      if (subError || !subscriber) {
        toast({
          title: "Error",
          description: "User not found. They need to sign up first.",
          variant: "destructive",
        });
        return;
      }

      // Check if user has moderator role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', subscriber.user_id)
        .single();

      if (roleError || roleData?.role !== 'moderator') {
        toast({
          title: "Error",
          description: "User must have moderator role to access shared data",
          variant: "destructive",
        });
        return;
      }

      // Create shared access
      const { error } = await supabase
        .from('shared_google_ads_access')
        .insert({
          owner_user_id: user?.id,
          shared_with_user_id: subscriber.user_id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Access shared with ${newUserEmail}`,
      });

      setNewUserEmail("");
      fetchSharedAccess();
    } catch (error) {
      console.error('Error sharing access:', error);
      toast({
        title: "Error",
        description: "Failed to share access",
        variant: "destructive",
      });
    }
  };

  const removeSharedAccess = async (accessId: string) => {
    try {
      const { error } = await supabase
        .from('shared_google_ads_access')
        .delete()
        .eq('id', accessId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Shared access removed",
      });

      fetchSharedAccess();
    } catch (error) {
      console.error('Error removing shared access:', error);
      toast({
        title: "Error",
        description: "Failed to remove shared access",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading shared access...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Google Ads Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="share-email">User Email</Label>
              <Input
                id="share-email"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="friend@example.com"
              />
            </div>
            <Button onClick={shareAccessWithUser}>
              <UserPlus className="h-4 w-4 mr-2" />
              Share Access
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            User must have a moderator role and be signed up to receive access to your Google Ads data.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shared Access</CardTitle>
        </CardHeader>
        <CardContent>
          {sharedAccess.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No shared access granted yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Email</TableHead>
                  <TableHead>Shared On</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sharedAccess.map((access) => (
                  <TableRow key={access.id}>
                    <TableCell className="font-medium">
                      {access.shared_user_email}
                    </TableCell>
                    <TableCell>
                      {new Date(access.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeSharedAccess(access.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};