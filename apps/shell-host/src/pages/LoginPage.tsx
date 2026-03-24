import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function LoginPage() {
  const [email,    setEmail]    = useState("manikandan.velayudhan@jaldee.com");
  const [password, setPassword] = useState("netvarth");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const { login } = useAuth();
  const navigate  = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/home");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight:      "100vh",
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      background:     "#F3F4F6",
    }}>
      <div style={{
        background:   "white",
        borderRadius: "12px",
        padding:      "40px",
        width:        "100%",
        maxWidth:     "400px",
        boxShadow:    "0 4px 12px rgba(0,0,0,0.10)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width:          "48px",
            height:         "48px",
            background:     "#5B21D1",
            borderRadius:   "12px",
            display:        "inline-flex",
            alignItems:     "center",
            justifyContent: "center",
            fontSize:       "24px",
            marginBottom:   "12px",
          }}>
            ✦
          </div>
          <h1 style={{
            margin:     0,
            fontSize:   "22px",
            fontWeight: 700,
            color:      "#1E1B4B",
          }}>
            Jaldee Business
          </h1>
          <p style={{
            margin:   "4px 0 0",
            color:    "#6B7280",
            fontSize: "14px",
          }}>
            Sign in to your account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{
              display:      "block",
              fontSize:     "13px",
              fontWeight:   600,
              color:        "#374151",
              marginBottom: "6px",
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width:        "100%",
                padding:      "10px 12px",
                border:       "1px solid #E5E7EB",
                borderRadius: "8px",
                fontSize:     "14px",
                outline:      "none",
                boxSizing:    "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{
              display:      "block",
              fontSize:     "13px",
              fontWeight:   600,
              color:        "#374151",
              marginBottom: "6px",
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width:        "100%",
                padding:      "10px 12px",
                border:       "1px solid #E5E7EB",
                borderRadius: "8px",
                fontSize:     "14px",
                outline:      "none",
                boxSizing:    "border-box",
              }}
            />
          </div>

          {error && (
            <div style={{
              background:   "#FEE2E2",
              color:        "#DC2626",
              padding:      "10px 12px",
              borderRadius: "8px",
              fontSize:     "13px",
              marginBottom: "16px",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width:        "100%",
              padding:      "11px",
              background:   loading ? "#9CA3AF" : "#5B21D1",
              color:        "white",
              border:       "none",
              borderRadius: "8px",
              fontSize:     "14px",
              fontWeight:   600,
              cursor:       loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}