import { Eye, EyeOff, Fingerprint, Volume2, VolumeX } from "lucide-react";
import React, { useCallback, useEffect,useState } from "react";
import { useNavigate } from "react-router-dom";

import appleLogoBlack from "../assets/apple-logo-black.svg";
import appleLogoWhite from "../assets/apple-logo-white.svg";
import googleLogo from "../assets/google-logo.svg";
import thermaCoreLogo from "../assets/thermacore-logo-new.png";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useTheme } from "../context/ThemeContext";
import playSound from "../utils/audioPlayer";
import FormFieldGroup from "./common/FormFieldGroup";
import styles from "./LoginScreen.module.css";
import SocialButton from "./SocialButton";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

const LoginScreen = ({ error, setError }) => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [animateLogo, setAnimateLogo] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    isValid: true,
    message: "",
  });
  const [focusedField, setFocusedField] = useState(null);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const navigate = useNavigate();
  const { login, isLoading } = useAuth(); // Get isLoading from AuthContext
  const { actualTheme } = useTheme();
  const { settings, toggleSound } = useSettings();
  const isDarkMode = actualTheme === "dark";

  useEffect(() => {
    setAnimateLogo(true);
  }, []);

  // Password validation function
  const validatePassword = useCallback((password) => {
    if (password.length === 0) {
      return { isValid: true, message: "" };
    }
    if (password.length < 6) {
      return {
        isValid: false,
        message: "Password must be at least 6 characters",
      };
    }
    return { isValid: true, message: "" };
  }, []);

  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));

      // Validate password in real-time
      if (name === "password") {
        const validation = validatePassword(value);
        setPasswordValidation(validation);
      }

      // Clear error when user starts typing in either field
      if (error && (name === "username" || name === "password")) {
        setError("");
      }
    },
    [error, validatePassword, setError],
  );

  const handleFocus = useCallback((fieldName) => {
    setFocusedField(fieldName);
  }, []);

  const handleBlur = useCallback(() => {
    setFocusedField(null);
  }, []);

  const handleBiometricLogin = useCallback(async () => {
    console.log("Biometric login clicked!");
    // Here you would implement actual biometric authentication
    // For now, we'll show a dialog
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError("");

      // Validate form data
      if (!formData.username.trim() || !formData.password.trim()) {
        setError("Please enter both username and password");
        return;
      }

      console.log("Attempting login with:", formData.username); // Debug log

      const result = await login(formData.username, formData.password);

      console.log("Login result:", result); // Debug log

      if (result.success) {
        console.log("Login successful, navigating to dashboard");
        navigate("/dashboard");
      } else {
        console.log("Login failed:", result.error); // Debug log
        setError(result.error || "Invalid credentials!");
        // Keep form data intact for retry
        console.log("Error set to:", result.error || "Invalid credentials!");
      }
    },
    [formData.username, formData.password, login, navigate, setError],
  );

  const handleSocialLogin = useCallback(async (provider) => {
    console.log(`${provider} login clicked!`);

    // Play login sound and wait for it to start

    // Here you would normally initiate the actual social login
    // For now, it just shows the dialog
  }, []);

  const handleForgotPassword = useCallback(() => {
    console.log("Forgot password clicked!");
  }, []);

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.loginContainer}>
        {/* Volume toggle button */}
        <button
          type="button"
          onClick={toggleSound}
          className="absolute top-4 left-4 p-2 rounded-full bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow z-10"
          title={settings.soundEnabled ? "Mute sounds" : "Enable sounds"}
        >
          {settings.soundEnabled ? (
            <Volume2 size={20} className="text-gray-700 dark:text-gray-300" />
          ) : (
            <VolumeX size={20} className="text-gray-700 dark:text-gray-300" />
          )}
        </button>

        <div className={styles.logoContainer}>
          <img
            src={thermaCoreLogo}
            alt="ThermaCore Logo"
            className={`${styles.logo} ${animateLogo ? styles.logoSpin : ''}`}
          />
        </div>
        <div className={styles.titleContainer}>
          <h1 className={styles.title}>ThermaCore</h1>
          <p className={styles.companySubtitle}>Renewable Technologies</p>
        </div>
        <p className={styles.loginPrompt}>Sign in to your account</p>

        <div className={`${styles.loginError} ${error ? styles.visible : ""}`}>
          {error}
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.formLabel}>
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="Enter username"
              value={formData.username}
              onChange={handleChange}
              onFocus={() => handleFocus("username")}
              onBlur={handleBlur}
              required
              className={`${styles.formInput} ${focusedField === "username" ? styles.inputFocused : ""}`}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.formLabel}>
              Password
            </label>
            <div className={styles.passwordInputContainer}>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={formData.password}
                onChange={handleChange}
                onFocus={() => handleFocus("password")}
                onBlur={handleBlur}
                required
                className={`${styles.formInput} ${focusedField === "password" ? styles.inputFocused : ""} ${!passwordValidation.isValid ? styles.inputError : ""}`}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className={styles.passwordToggleButton}
              >
                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
            {!passwordValidation.isValid && passwordValidation.message && (
              <div className={styles.passwordError}>
                {passwordValidation.message}
              </div>
            )}
          </div>

          <div className={styles.extraOptionsRow}>
            <label className={styles.checkboxContainer}>
              <input type="checkbox" />
              <span className={styles.checkboxLabel}>Keep me signed in</span>
            </label>
            <a
              href="#"
              onClick={handleForgotPassword}
              className={styles.forgotPasswordLink}
            >
              Forgot Password?
            </a>
          </div>

          <button
            type="submit"
            className={`${styles.btnSignin} ${isDarkMode ? styles.btnSigninDark : styles.btnSigninLight}`}
          >
            Sign In
          </button>
        </form>

        <div className={styles.divider}>
          <span className={styles.dividerText}>OR</span>
        </div>

        <div className={styles.socialLoginContainer}>
          <Dialog>
            <DialogTrigger asChild>
              <SocialButton
                provider="Google"
                icon={googleLogo}
                onClick={() => handleSocialLogin("Google")}
              />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Sign in with Google</DialogTitle>
                <DialogDescription>
                  Google sign-in is coming soon! We&apos;re working hard to
                  bring you this convenient login option. Please use your
                  username and password for now.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <SocialButton
                provider="Apple"
                icon={isDarkMode ? appleLogoWhite : appleLogoBlack}
                onClick={() => handleSocialLogin("Apple")}
              />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Sign in with Apple</DialogTitle>
                <DialogDescription>
                  Apple sign-in is coming soon! We&apos;re working hard to bring
                  you this convenient login option. Please use your username and
                  password for now.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className={styles.divider}>
          <span className={styles.dividerText}>OR</span>
        </div>

        <div className={styles.biometricSection}>
          <h3 className={styles.biometricHeading}>Biometric Sign In</h3>
          <div className={styles.biometricContainer}>
            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  onClick={handleBiometricLogin}
                  className={styles.biometricButton}
                >
                  <Fingerprint size={24} />
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Biometric Authentication</DialogTitle>
                  <DialogDescription>
                    Biometric authentication is coming soon! We&apos;re working
                    to bring you secure fingerprint and face recognition login
                    options.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Close</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading && (
          <div className={styles.loadingOverlay}>
            <svg
              width="100"
              height="100"
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <filter
                  id="subtleGlow"
                  x="-20%"
                  y="-20%"
                  width="140%"
                  height="140%"
                >
                  <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <filter
                  id="neonBlueGlow"
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                >
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <circle
                cx="50"
                cy="50"
                r="35"
                fill="none"
                stroke="#ffd700"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="55 200"
                filter="url(#subtleGlow)"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  values="0 50 50;360 50 50"
                  dur="1.2s"
                  repeatCount="indefinite"
                />
              </circle>

              <g>
                <circle
                  cx="50"
                  cy="50"
                  r="25"
                  fill="none"
                  stroke="#00ccff"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="18 102"
                  opacity="0.9"
                  filter="url(#neonBlueGlow)"
                >
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    values="0 50 50;-360 50 50"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>

                <circle
                  cx="50"
                  cy="50"
                  r="25"
                  fill="none"
                  stroke="#00ccff"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="18 102"
                  opacity="0.9"
                  filter="url(#neonBlueGlow)"
                >
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    values="120 50 50;-240 50 50"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>

                <circle
                  cx="50"
                  cy="50"
                  r="25"
                  fill="none"
                  stroke="#00ccff"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="18 102"
                  opacity="0.9"
                  filter="url(#neonBlueGlow)"
                >
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    values="240 50 50;-120 50 50"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
              </g>

              <circle
                cx="50"
                cy="50"
                r="3"
                fill="#ffd700"
                opacity="0.8"
                filter="url(#subtleGlow)"
              >
                <animate
                  attributeName="opacity"
                  values="0.8;0.4;0.8"
                  dur="1.6s"
                  repeatCount="indefinite"
                />
              </circle>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;


