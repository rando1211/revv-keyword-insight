import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Settings, User } from "lucide-react";

export const Header = () => {
  return (
    <header className="bg-destructive text-destructive-foreground shadow-lg border-b border-destructive/20">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center space-x-4">
            <div className="bg-destructive-foreground text-destructive rounded-lg p-2 font-bold text-lg tracking-wider">
              DEXTRUM
            </div>
            <div>
              <h1 className="text-xl font-bold">Command Center</h1>
              <p className="text-sm opacity-90">Tactical Optimization Dashboard</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <a href="/" className="hover:opacity-80 transition-opacity">
              Home
            </a>
            <a href="/campaigns" className="hover:opacity-80 transition-opacity">
              Campaigns
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" className="text-destructive-foreground hover:bg-destructive-foreground/20">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-destructive-foreground hover:bg-destructive-foreground/20">
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-destructive-foreground hover:bg-destructive-foreground/20">
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};