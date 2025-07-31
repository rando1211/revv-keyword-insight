import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Settings, User } from "lucide-react";

export const Header = () => {
  return (
    <header className="bg-primary text-primary-foreground shadow-elevation">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center space-x-4">
            <div className="bg-primary-foreground text-primary rounded-lg p-2 font-bold text-lg">
              REVV
            </div>
            <div>
              <h1 className="text-xl font-bold">Marketing</h1>
              <p className="text-sm opacity-90">Campaign Automation Dashboard</p>
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
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-glow">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-glow">
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-glow">
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};