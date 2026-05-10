import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./store";
import App from "./App";
import { initAnalytics, identifyUser } from "./lib/analytics";
import { Auth } from "./lib/api-client";
import "./index.css";

initAnalytics();
const existingUsername = Auth.getUsername();
if (existingUsername !== null) {
  identifyUser(existingUsername);
}

createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <App />
  </Provider>,
);
