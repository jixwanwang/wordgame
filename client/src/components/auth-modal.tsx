import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API } from "@/lib/api-client";
import { getGameHistory } from "@/lib/game-storage";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (username: string) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login"); // Default to login
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError("");

    // Client-side validation
    const errors: Record<string, string> = {};

    // Username validation (for both login and register)
    if (!username) {
      errors.username = "Username is required";
    } else if (username.length < 3) {
      errors.username = "Username must be at least 3 characters";
    } else if (username.length > 24) {
      errors.username = "Username must be at most 24 characters";
    } else if (!/^[a-zA-Z0-9]+$/.test(username)) {
      errors.username = "Username can only contain letters and numbers (a-z, A-Z, 0-9)";
    }

    // Password validation
    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 10) {
      errors.password = "Password must be at least 6 characters";
    }

    // Confirm password validation (register mode only)
    if (mode === "register") {
      if (password !== confirmPassword) {
        errors.confirmPassword = "Passwords do not match";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      // Get local game history to sync with server
      const history = getGameHistory();

      const response =
        mode === "login"
          ? await API.login(username, password, history)
          : await API.register(username, password, history);

      if (response.success && response.username) {
        onSuccess?.(response.username);
        onClose();
        setUsername("");
        setPassword("");
        setConfirmPassword("");
        setFieldErrors({});
        setGeneralError("");
      } else {
        // Handle field-specific errors from API
        if (response.errors) {
          setFieldErrors(response.errors);
          if (response.errors.general) {
            setGeneralError(response.errors.general);
          }
        } else {
          setGeneralError(response.message || "Authentication failed");
        }
      }
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setFieldErrors({});
    setGeneralError("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px] bg-white">
        <DialogHeader>
          <DialogTitle>{mode === "login" ? "Log In" : "Create Account"}</DialogTitle>
          {mode === "login" ? null : (
            <DialogDescription>
              {"Save your progress, see stats, and compare with friends!"}
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="username" className="text-xs font-bold">
              Username
            </label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="choose a name"
              required
              minLength={3}
              maxLength={24}
              disabled={loading}
              autoComplete="username"
              className={fieldErrors.username ? "border-red-500" : ""}
            />
            {fieldErrors.username && <p className="text-xs text-red-600">{fieldErrors.username}</p>}
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-xs font-bold">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="at least 10 characters"
                required
                minLength={10}
                disabled={loading}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className={fieldErrors.password ? "border-red-500" : ""}
              />
              {mode === "register" &&
                password &&
                confirmPassword &&
                password === confirmPassword && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
                    ✓
                  </span>
                )}
            </div>
            {fieldErrors.password && <p className="text-xs text-red-600">{fieldErrors.password}</p>}
          </div>

          {mode === "register" && (
            <div className="space-y-1">
              <label htmlFor="confirmPassword" className="text-xs font-bold">
                Password again...
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="there's no password recovery so don't forget it"
                  required
                  minLength={10}
                  disabled={loading}
                  autoComplete="new-password"
                  className={fieldErrors.confirmPassword ? "border-red-500" : ""}
                />
                {password && confirmPassword && password === confirmPassword && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
                    ✓
                  </span>
                )}
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-red-600">{fieldErrors.confirmPassword}</p>
              )}
            </div>
          )}

          {generalError && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{generalError}</div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setFieldErrors({});
                setGeneralError("");
              }}
              disabled={loading}
              className="mt-2 text-sm underline hover:text-gray-600"
            >
              {mode === "login" ? "Need an account? Register" : "Already have an account? Log in"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
