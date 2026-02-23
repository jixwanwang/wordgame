import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface GuessesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guesses: string[];
}

export function GuessesModal({ open, onOpenChange, guesses }: GuessesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs bg-white">
        <DialogHeader>
          <DialogTitle>Guesses</DialogTitle>
        </DialogHeader>
        <ol className="list-decimal list-inside space-y-1">
          {guesses.map((guess, i) => (
            <li key={i} className="text-sm font-mono">
              {guess.toUpperCase()}
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
