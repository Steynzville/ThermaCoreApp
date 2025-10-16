import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../services/authService";
import thermaCoreLogo from "../assets/thermacore-logo-new.png";
import styles from "./LoginScreen.module.css";
import { Eye, EyeOff } from "lucide-react";

const PasswordResetRequest = () => {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [token, setToken] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Get token from URL query parameter
    const tokenFromUrl = searchParams.get("token");
    if (!tokenFromUrl) {
      setError("Invalid reset link. Please request a new password reset.");
    } else {
      setToken(tokenFromUrl);
    }
  }, [searchParams]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    // Validation
    if (!formData.newPassword.trim() || !formData.confirmPassword.trim()) {
      setError("Please enter both password fields");
      return;
    }

    if (formData.newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await resetPassword(token, formData.newPassword);

      if (result.success) {
        setMessage(result.message);
        setFormData({ newPassword: "", confirmPassword: "" });
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setError(result.message);
      }
    } catch (err) {
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
          <h1 className={styles.title}>Reset Password</h1>
          <p className={styles.companySubtitle}>
            Enter your new password
          </p>
        </div>

        {message && (
          <div className={`${styles.loginError} ${styles.visible}`} style={{ backgroundColor: '#10b981', color: 'white' }}>
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
            <label htmlFor="newPassword" className={styles.formLabel}>
              New Password
            </label>
            <div className={styles.passwordInputContainer}>
              <input
                id="newPassword"
                name="newPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={formData.newPassword}
                onChange={handleChange}
                required
                className={styles.formInput}
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.passwordToggleButton}
              >
                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword" className={styles.formLabel}>
              Confirm Password
            </label>
            <div className={styles.passwordInputContainer}>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className={styles.formInput}
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className={styles.passwordToggleButton}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                aria-pressed={showConfirmPassword}
              >
                {showConfirmPassword ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={styles.btnSignin}
            disabled={isSubmitting || !token}
          >
            {isSubmitting ? "Resetting..." : "Reset Password"}
          </button>

          <button
            type="button"
            onClick={handleBackToLogin}
            className={styles.forgotPasswordLink}
            style={{
              width: '100%',
              textAlign: 'center',
              marginTop: '1rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Back to Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default PasswordResetRequest;
