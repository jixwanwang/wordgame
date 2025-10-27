import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import Game from "@/pages/game";

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Game difficulty="normal" />} />
      <Route path="/hard" component={() => <Game difficulty="hard" />} />
      <Route path="/practice" component={() => <Game difficulty="practice" />} />
      <Route path="/crossword" component={() => <Game difficulty="crossword" />} />
      <Route component={() => <Game difficulty="normal" />} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
