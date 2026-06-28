import React from "react";
import styles from "./LoginScreen.module.css";

const SocialButton = React.forwardRef(({ provider, icon, onClick, ...props }, ref) => {
  const buttonClass =
    provider === "Google"
      ? `${styles.socialBtn} ${styles.googleBtn}`
      : `${styles.socialBtn} ${styles.appleBtn}`;

  return (
    <button
      ref={ref}
      className={buttonClass}
      onClick={onClick}
      type="button"
      {...props}
    >
      <img src={icon} alt={`${provider} logo`} />
      <span>Sign in with {provider}</span>
    </button>
  );
});

SocialButton.displayName = "SocialButton";

export default SocialButton;
