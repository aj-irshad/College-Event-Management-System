import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.jsx";
import { AuthProvider } from "./context/authContext.jsx";
import { EventProvider } from "./context/EventContext.jsx";
import { BlogProvider } from "./context/blogContext.jsx";
import { FeedbackProvider } from "./context/feedbackContext.jsx";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <EventProvider>
        <BlogProvider>
          <FeedbackProvider>
            <App />
          </FeedbackProvider>
        </BlogProvider>
      </EventProvider>
    </AuthProvider>
  </BrowserRouter>,
);
