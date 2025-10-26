import ReportsView from "../components/ReportsView";
import UserReportsView from "../components/UserReportsView";
import { useAuth } from "../context/AuthContext";

const ReportsPage = () => {
  const { userRole } = useAuth();

  return (
    <div className="w-full">
      {userRole === "admin" ? <ReportsView /> : <UserReportsView />}
    </div>
  );
};

export default ReportsPage;
