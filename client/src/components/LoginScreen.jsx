import { useState, useRef, useEffect } from "react";
import {
  ShieldCheck,
  Lock,
  Activity,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";
import { getApiUrl } from "../config/api";

export default function LoginScreen({ onLoginSuccess }) {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  async function handleLogin(e) {
    if (e) e.preventDefault();
    if (!pin.trim()) {
      setError("Please enter the access PIN");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(getApiUrl("/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed. Please verify your PIN.");
      }

      sessionStorage.setItem("isAuthenticated", "true");
      onLoginSuccess();
    } catch (err) {
      setError(err.message || "Invalid PIN. Please try again.");
      setPin("");
      if (inputRef.current) inputRef.current.focus();
    } finally {
      setLoading(false);
    }
  }

  function handleKeypadClick(digit) {
    if (pin.length < 10) {
      setPin((prev) => prev + digit);
      setError("");
    }
  }

  function handleKeypadBackspace() {
    setPin((prev) => prev.slice(0, -1));
    setError("");
  }

  function handleKeypadClear() {
    setPin("");
    setError("");
    if (inputRef.current) inputRef.current.focus();
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Brand Header */}
        <div className="login-brand-header">
          <div className="login-logo-circle">
            <Activity size={32} className="pulse-icon text-white" />
          </div>
          <h1 className="login-title">
            LithoScan <span className="brand-highlight">AI</span>
          </h1>
          <p className="login-subtitle">
            Kidney Stone Clinical Evaluation Platform
          </p>
          <div className="login-badge">
            <ShieldCheck size={14} />
            <span>Authorized Clinical Access Only</span>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="login-error-alert" role="alert">
            <AlertCircle size={16} className="login-error-icon" />
            <span>{error}</span>
          </div>
        )}

        {/* PIN Input Form */}
        <form onSubmit={handleLogin} className="login-form">
          <label className="login-input-label" htmlFor="clinical-pin">
            <span>Enter Access PIN</span>
          </label>

          <div className="login-input-wrapper">
            <KeyRound size={18} className="login-input-icon text-muted" />
            <input
              id="clinical-pin"
              ref={inputRef}
              type={showPin ? "text" : "password"}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="current-password"
              placeholder="Enter PIN..."
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError("");
              }}
              disabled={loading}
              className="login-input"
              maxLength={12}
            />
            <button
              type="button"
              className="login-toggle-visibility"
              onClick={() => setShowPin(!showPin)}
              tabIndex={-1}
              aria-label={showPin ? "Hide PIN" : "Show PIN"}
            >
              {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Keypad for Quick Touch / Click Access */}
          <div className="login-keypad">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                className="keypad-digit-btn"
                onClick={() => handleKeypadClick(num.toString())}
                disabled={loading}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              className="keypad-action-btn clear"
              onClick={handleKeypadClear}
              disabled={loading || !pin}
            >
              C
            </button>
            <button
              type="button"
              className="keypad-digit-btn"
              onClick={() => handleKeypadClick("0")}
              disabled={loading}
            >
              0
            </button>
            <button
              type="button"
              className="keypad-action-btn backspace"
              onClick={handleKeypadBackspace}
              disabled={loading || !pin}
            >
              ⌫
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="login-submit-btn"
            disabled={loading || !pin.trim()}
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <Lock size={16} />
                <span>Unlock System</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <div className="login-card-footer">
          <p>
            Secure institutional authentication required for accessing patient scans and model inference.
          </p>
        </div>
      </div>
    </div>
  );
}
