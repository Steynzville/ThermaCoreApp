import { useState } from "react";


const FormFieldGroup = ({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  error,
  className = "",
  inputClassName = "",
  labelClassName = "",
  errorClassName = "",
  showPasswordToggle = true,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const isPasswordField = type === "password";
  const inputType = isPasswordField && showPassword ? "text" : type;

  // Default styles for different contexts
  const getDefaultStyles = () => {
    // Check if we're in a login context (has specific styling)
    if (
      className.includes("formGroup") ||
      inputClassName.includes("loginScreen")
    ) {
      return {
        container: "formGroup",
        label: "",
        input: "",
        passwordWrapper: "passwordWrapper",
        passwordToggle: "passwordToggle",
        error: "",
      };
    }

    // Default to settings/modern styling
    return {
      container: "space-y-2",
      label: "block text-sm font-medium text-gray-700 dark:text-gray-300",
      input:
        "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
      passwordWrapper: "relative",
      passwordToggle:
        "absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
      error: "text-sm text-red-600 dark:text-red-400 mt-1",
    };
  };

  const styles = getDefaultStyles();

  return (
    <div className={`${styles.container} ${className}`}>
      {label && (
        <label htmlFor={id} className={`${styles.label} ${labelClassName}`}>
          {label}
        </label>
      )}
      <div className={isPasswordField ? styles.passwordWrapper : undefined}>
        <input
          type={inputType}
          id={id}
          name={id}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className={`${styles.input} ${inputClassName} ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
        />
        {isPasswordField && showPasswordToggle && (
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeIcon /> : <EyeIconClosed />}
          </button>
        )}
      </div>
      {error && (
        <div className={`${styles.error} ${errorClassName}`}>{error}</div>
      )}
    </div>
  );
};

export default FormFieldGroup;
