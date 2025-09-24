import styles from "./LoginScreen.module.css";

const SocialButton = ({ provider, icon, onClick }) => {
  const buttonClass =
    provider === "Google"
      ? `${styles.socialBtn} ${styles.googleBtn}`
      : `${styles.socialBtn} ${styles.appleBtn}`;

  return (
    <button className={buttonClass} onClick={onClick}>
      <img src={icon} alt={`${provider} logo`} />
      <span>Sign in with {provider}</span>
    </button>
  );
};

export default SocialButton;
