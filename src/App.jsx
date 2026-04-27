import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";

import Chats from "./components/Chats";
import Login from "./components/Login";
import RequireAuth from "./components/RequireAuth";

function App() {
  return (
    <div style={{ fontFamily: "Avenir" }}>
      <Router>
        <AuthProvider>
          <Routes>
            <Route
              path="/chats"
              element={
                <RequireAuth>
                  <Chats />
                </RequireAuth>
              }
            />
            <Route path="/" element={<Login />} />
          </Routes>
        </AuthProvider>
      </Router>
    </div>
  );
}

export default App;
