import "../styles/UserRegistration.css";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { register } from "../services/authService";

const UserRegistrationForm = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields validation
    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    // Optional fields - no validation needed for phoneNumber, company, department, position

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setIsSubmitting(true);

    try {
      // Call the register function from authService
      const result = await register(formData);
      
      if (result.status === 'pending') {
        toast.success("Registration submitted! Your account is pending admin approval.");
      } else {
        toast.success("Registration successful! Please log in.");
      }
      
      // Navigate to login page after successful registration
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(error.message || "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate("/login");
  };

  return (
    <div className="registration-outer-container">
      <div className="registration-inner-container">
        <div className="registration-card">
          <div className="registration-header">
            <h1>Create Your Account</h1>
            <p>Fill in your details to get started</p>
          </div>

          <form onSubmit={handleSubmit} className="registration-form">
            {/* Username Field */}
            <div className={`form-field ${errors.username ? "error" : ""}`}>
              <label htmlFor="username">
                Username <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your username"
                disabled={isSubmitting}
              />
              {errors.username && (
                <span className="error-message">{errors.username}</span>
              )}
            </div>

            {/* Email Field */}
            <div className={`form-field ${errors.email ? "error" : ""}`}>
              <label htmlFor="email">
                Email <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                disabled={isSubmitting}
              />
              {errors.email && (
                <span className="error-message">{errors.email}</span>
              )}
            </div>

            {/* Password Field */}
            <div className={`form-field ${errors.password ? "error" : ""}`}>
              <label htmlFor="password">
                Password <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password (min 8 characters)"
                  disabled={isSubmitting}
                  style={{ paddingRight: "40px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    color: "#6b7280",
                  }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
              {errors.password && (
                <span className="error-message">{errors.password}</span>
              )}
            </div>

            {/* First Name Field */}
            <div className={`form-field ${errors.firstName ? "error" : ""}`}>
              <label htmlFor="firstName">
                First Name <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Enter your first name"
                disabled={isSubmitting}
              />
              {errors.firstName && (
                <span className="error-message">{errors.firstName}</span>
              )}
            </div>

            {/* Last Name Field */}
            <div className={`form-field ${errors.lastName ? "error" : ""}`}>
              <label htmlFor="lastName">
                Last Name <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Enter your last name"
                disabled={isSubmitting}
              />
              {errors.lastName && (
                <span className="error-message">{errors.lastName}</span>
              )}
            </div>

            {/* Phone Number Field */}
            <div className="form-field">
              <label htmlFor="phoneNumber">Phone Number</label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="Enter your phone number"
                disabled={isSubmitting}
              />
            </div>

            {/* Company Field */}
            <div className="form-field">
              <label htmlFor="company">Company</label>
              <input
                type="text"
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="Enter your company name"
                disabled={isSubmitting}
              />
            </div>

            {/* Department Field */}
            <div className="form-field">
              <label htmlFor="department">Department</label>
              <input
                type="text"
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="Enter your department"
                disabled={isSubmitting}
              />
            </div>

            {/* Position Field */}
            <div className="form-field">
              <label htmlFor="position">Position</label>
              <input
                type="text"
                id="position"
                name="position"
                value={formData.position}
                onChange={handleChange}
                placeholder="Enter your position"
                disabled={isSubmitting}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={handleCancel}
                className="form-button secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="form-button primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating Account..." : "Create Account"}
              </button>
            </div>

            <div style={{ marginTop: "16px", textAlign: "center" }}>
              <p style={{ fontSize: "14px", color: "#6b7280" }}>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#3b82f6",
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: 0,
                    fontSize: "14px",
                  }}
                >
                  Sign in
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserRegistrationForm;
