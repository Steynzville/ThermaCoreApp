import { useState } from "react";
import { useNavigate } from "react-router-dom";
import thermaCoreLogo from "../assets/thermacore-logo-new.png";
import { requestPasswordReset } from "../services/authService";
import styles from "./LoginScreen.module.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await requestPasswordReset(email);

      if (result.success) {
        setMessage(result.message);
        setEmail("");
      } else {
        setError(result.message);
      }
    } catch (_err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    navigate("/login");
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.loginContainer}>
        <div className={styles.logoContainer}>
          <img
            src={thermaCoreLogo}
            alt="ThermaCore Logo"
            className={styles.logo}
          />
        </div>
        <div className={styles.titleContainer}>
          <h1 className={styles.title}>Forgot Password?</h1>
          <p className={styles.companySubtitle}>
            Enter your email to receive a password reset link
          </p>
        </div>

        {message && (
          <div
            className={`${styles.loginError} ${styles.visible}`}
            style={{ backgroundColor: "#10b981", color: "white" }}
          >
            {message}
          </div>
        )}

        {error && (
          <div className={`${styles.loginError} ${styles.visible}`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.formLabel}>
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={styles.formInput}
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            className={styles.btnSignin}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </button>

          <button
            type="button"
            onClick={handleBackToLogin}
            className={styles.forgotPasswordLink}
            style={{
              width: "100%",
              textAlign: "center",
              marginTop: "1rem",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            Back to Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
