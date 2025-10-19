import { useAuth } from "../context/AuthContext";
import { useSidebarMargin } from "../hooks/useSidebarMargin";

const ReportsPage = () => {
  const { userRole } = useAuth();
  const sidebarMargin = useSidebarMargin();

  return (
    <div className={`transition-all duration-300 ${sidebarMargin}`}>
      {userRole === "admin" ? <ReportsView /> : <UserReportsView />}
    </div>
  );
};

export default ReportsPage;
