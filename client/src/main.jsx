import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.jsx";
import { AuthProvider } from "./context/authContext.jsx";
import { EventProvider } from "./context/EventContext.jsx";
import { BlogProvider } from "./context/blogContext.jsx";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <EventProvider>
        <BlogProvider>
          <App />
        </BlogProvider>
      </EventProvider>
    </AuthProvider>
  </BrowserRouter>,
);
