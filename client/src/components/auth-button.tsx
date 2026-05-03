import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth-modal";
import { Auth } from "@/lib/api-client";
import { LogIn, LogOut, User } from "lucide-react";
import { useLocation } from "wouter";

/**
 * Authentication button component
 * Shows login/register modal when not authenticated
 * Shows username and logout button when authenticated
 */
export function AuthButton() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [, navigate] = useLocation();

  // Check auth status on mount
  useEffect(() => {
    setUsername(Auth.getUsername());
  }, []);

  const handleAuthSuccess = (newUsername: string) => {
    setUsername(newUsername);
  };

  const handleLogout = () => {
    Auth.logout();
    setUsername(null);
    navigate("/");
  };

  if (username) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-sm text-gray-700">
          <User className="w-4 h-4" />
          <span>{username}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1">
          <LogOut className="w-4 h-4" />
          Log out
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button variant="default" size="sm" onClick={() => setShowAuthModal(true)} className="gap-1">
        <LogIn className="w-4 h-4" />
        Log in
      </Button>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}
