
import { useTheme } from "../context/ThemeContext";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle-responsive p-3 rounded-full bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-gray-200 shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 border border-gray-300 dark:border-gray-600 backdrop-blur-sm"
      aria-label="Toggle Theme"
    >
      {theme === "dark" ? <Sun size={24} /> : <Moon size={24} />}
    </button>
  );
};

export default ThemeToggle;
