import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input } from "@jaldee/design-system";
import { useAuth } from "../auth/AuthProvider";
import "./LoginPage.css";

export default function LoginPage() {
  const [email, setEmail] = useState("manikandan.velayudhan@jaldee.com");
  const [password, setPassword] = useState("netvarth");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login({ loginId: email.trim(), password });
      navigate("/home");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-badge">✦</div>
          <h1 className="login-title">Jaldee Business</h1>
          <p className="login-subtitle">Sign in to your account</p>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          <Input
            type="email"
            label="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            fullWidth
            containerClassName="login-field"
            placeholder="Enter your email"
          />

          <Input
            type="password"
            label="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            fullWidth
            containerClassName="login-field"
            placeholder="Enter your password"
          />

          {error && <div className="login-error">{error}</div>}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            disabled={loading}
            fullWidth
            className="login-submit"
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
