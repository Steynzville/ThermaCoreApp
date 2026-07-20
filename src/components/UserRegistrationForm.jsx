import { CheckCircle, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";  // ✅ Fixed: added "from"
import { toast } from "sonner";

import thermaCoreLogo from "../assets/thermacore-logo-new.png";
import { selfRegister } from "../services/authService";
import styles from "./LoginScreen.module.css";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";

const UserRegistrationForm = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    company: "",
    department: "",
    position: "",
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    const trimmedUsername = formData.username.trim();
    if (!trimmedUsername || trimmedUsername.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = "Valid email is required";
    }

    if (!formData.password || formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      // ✅ Validation errors are displayed inline - no toast needed
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        company: formData.company.trim(),
        department: formData.department.trim(),
        position: formData.position.trim(),
      };

      const result = await selfRegister(submitData);

      if (result.success) {
        setShowConfirmationModal(true);
      } else {
        toast.error(result.message || "Registration failed. Please try again.");
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setShowConfirmationModal(false);
    setFormData({
      username: "",
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      phoneNumber: "",
      company: "",
      department: "",
      position: "",
    });
    setErrors({});
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
          <h1 className={styles.title}>Create Your Account</h1>
          <p className={styles.companySubtitle}>
            Register for ThermaCore - Your account will be reviewed by an administrator
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Account Credentials Section */}
          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.formLabel}>
              Username <span className="text-red-500">*</span>
            </label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="Enter username"
              value={formData.username}
              onChange={handleChange}
              className={`${styles.formInput} ${errors.username ? styles.inputError : ""}`}
            />
            {errors.username && (
              <div className={styles.passwordError}>{errors.username}</div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.formLabel}>
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="your.email@company.com"
              value={formData.email}
              onChange={handleChange}
              className={`${styles.formInput} ${errors.email ? styles.inputError : ""}`}
            />
            {errors.email && (
              <div className={styles.passwordError}>{errors.email}</div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.formLabel}>
              Password <span className="text-red-500">*</span>
            </label>
            <div className={styles.passwordInputContainer}>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChange={handleChange}
                className={`${styles.formInput} ${errors.password ? styles.inputError : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.passwordToggleButton}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && (
              <div className={styles.passwordError}>{errors.password}</div>
            )}
          </div>

          {/* Personal Information Section */}
          <div className={styles.formGroup}>
            <label htmlFor="firstName" className={styles.formLabel}>
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              placeholder="John"
              value={formData.firstName}
              onChange={handleChange}
              className={`${styles.formInput} ${errors.firstName ? styles.inputError : ""}`}
            />
            {errors.firstName && (
              <div className={styles.passwordError}>{errors.firstName}</div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="lastName" className={styles.formLabel}>
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              placeholder="Doe"
              value={formData.lastName}
              onChange={handleChange}
              className={`${styles.formInput} ${errors.lastName ? styles.inputError : ""}`}
            />
            {errors.lastName && (
              <div className={styles.passwordError}>{errors.lastName}</div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="phoneNumber" className={styles.formLabel}>
              Phone Number
            </label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={formData.phoneNumber}
              onChange={handleChange}
              className={styles.formInput}
            />
          </div>

          {/* Company Information Section */}
          <div className={styles.formGroup}>
            <label htmlFor="company" className={styles.formLabel}>
              Company
            </label>
            <input
              id="company"
              name="company"
              type="text"
              placeholder="Company Name"
              value={formData.company}
              onChange={handleChange}
              className={styles.formInput}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="department" className={styles.formLabel}>
              Department
            </label>
            <input
              id="department"
              name="department"
              type="text"
              placeholder="Engineering"
              value={formData.department}
              onChange={handleChange}
              className={styles.formInput}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="position" className={styles.formLabel}>
              Position
            </label>
            <input
              id="position"
              name="position"
              type="text"
              placeholder="Operations Manager"
              value={formData.position}
              onChange={handleChange}
              className={styles.formInput}
            />
          </div>

          <div className="mt-6">
            <button
              type="submit"
              className={styles.btnSignin}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </button>

            <div className={styles.registerLinkContainer}>
              <span className={styles.registerText}>
                Already have an account?
              </span>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className={styles.registerLink}
              >
                Sign In
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Confirmation Modal */}
      <Dialog
        open={showConfirmationModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowConfirmationModal(false);
            navigate("/login");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-green-100 dark:bg-green-900 p-3">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">
              Thank You for Your Application!
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-center pt-4">
                <div className="space-y-3">
                  <p className="text-base">
                    Your registration has been successfully submitted.
                  </p>
                  <p className="text-base">
                    An administrator will review your application and you will
                    receive an email confirmation once your access has been
                    approved.
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 pt-2">
                    Please check your email (including spam folder) for the
                    approval notification.
                  </p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={handleModalClose}
              className="w-full sm:w-auto"
            >
              Return to Login
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserRegistrationForm;
