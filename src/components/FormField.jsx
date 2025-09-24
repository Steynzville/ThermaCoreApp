import React, { useState } from "react";
import styles from "./LoginScreen.module.css";
import EyeIcon from "./EyeIcon";
import EyeIconClosed from "./EyeIconClosed";

const FormField = ({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  required = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const isPasswordField = type === "password";
  const inputType = isPasswordField && showPassword ? "text" : type;

  return (
    <div className={styles.formGroup}>
      <label htmlFor={id}>{label}</label>
      <div className={isPasswordField ? styles.passwordWrapper : undefined}>
        <input
          type={inputType}
          id={id}
          name={id}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
        />
        {isPasswordField && (
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeIcon /> : <EyeIconClosed />}
          </button>
        )}
      </div>
    </div>
  );
};

export default FormField;
