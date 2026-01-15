import { Switch, Route } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import Game from "@/pages/game";

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Game difficulty="normal" />} />
      <Route path="/hard" component={() => <Game difficulty="hard" />} />
      <Route component={() => <Game difficulty="normal" />} />
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      <Router />
    </TooltipProvider>
  );
}

export default App;
