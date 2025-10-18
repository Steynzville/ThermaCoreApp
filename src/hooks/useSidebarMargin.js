import { useSidebar } from "../context/SidebarContext";

export const useSidebarMargin = () => {
  const { isCollapsed } = useSidebar();

  // Return appropriate margin classes based on collapsed state
  return isCollapsed ? "lg:ml-16 xl:ml-20" : "lg:ml-56 xl:ml-64";
};
