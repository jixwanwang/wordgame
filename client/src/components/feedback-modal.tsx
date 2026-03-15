import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { API } from "@/lib/api-client";

const FEEDBACK_TYPES = ["Missing word", "Word should be removed", "Other"] as const;
type FeedbackType = (typeof FEEDBACK_TYPES)[number];

const FEEDBACK_PREFIXES: Record<FeedbackType, string> = {
  "Missing word": "MISSING WORD",
  "Word should be removed": "WORD SHOULD BE REMOVED",
  "Other": "OTHER",
};

const MAX_LENGTH = 280;

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("Missing word");
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const autoCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (autoCloseTimeoutRef.current !== null) {
        clearTimeout(autoCloseTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async () => {
    if (feedbackText.trim().length === 0) return;

    const fullFeedback = `${FEEDBACK_PREFIXES[feedbackType]}: ${feedbackText.trim()}`;

    setSubmitting(true);
    setError(null);

    try {
      const response = await API.submitFeedback(fullFeedback);
      if (response.success) {
        setSuccess(true);
        setFeedbackText("");
        setFeedbackType("Missing word");
        autoCloseTimeoutRef.current = setTimeout(() => {
          handleOpenChange(false);
          autoCloseTimeoutRef.current = null;
        }, 1500);
      } else {
        setError(response.message ?? "Failed to submit feedback");
      }
    } catch {
      setError("Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFeedbackText("");
      setFeedbackType("Missing word");
      setError(null);
      setSuccess(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Feedback</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="pt-4 pb-8 text-center">
            <div className="text-lg font-medium text-gray-800">Thank you for your feedback!</div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <select
                id="feedback-type"
                value={feedbackType}
                onChange={(e) => setFeedbackType(e.target.value as FeedbackType)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                {FEEDBACK_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <textarea
                id="feedback-text"
                value={feedbackText}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_LENGTH) {
                    setFeedbackText(e.target.value);
                  }
                }}
                maxLength={MAX_LENGTH}
                rows={4}
                placeholder="Tell us more..."
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
              />
              <div className="text-xs text-gray-400 text-right">
                {feedbackText.length}/{MAX_LENGTH}
              </div>
            </div>

            {error !== null && <div className="text-sm text-red-500">{error}</div>}

            <button
              onClick={handleSubmit}
              disabled={submitting || feedbackText.trim().length === 0}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
