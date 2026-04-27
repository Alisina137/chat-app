import { GoogleOutlined, FacebookOutlined } from "@ant-design/icons";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";

function Login() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) navigate("/chats", { replace: true });
  }, [user, navigate]);

  async function googleSignIn() {
    try {
      setError("");
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user) navigate("/chats");
    } catch (e) {
      setError("Google sign-in failed. Please try again.");
    }
  }

  const enableFacebook = import.meta.env.VITE_ENABLE_FACEBOOK_AUTH === "true";

  return (
    <div id="login-page">
      <div id="login-card">
        <h2>Welcome to unichat</h2>

        <div className="login-button google" onClick={googleSignIn}>
          <GoogleOutlined /> Sign in with Google
        </div>

        {enableFacebook && (
          <>
            <br />
            <br />
            <div
              className="login-button facebook"
              onClick={() =>
                window.open("http://localhost:5000/auth/facebook", "_self")
              }
            >
              <FacebookOutlined /> Sign in with Facebook
            </div>
          </>
        )}

        {error && (
          <div style={{ color: "#cf1322", marginTop: 16, fontSize: 14 }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
