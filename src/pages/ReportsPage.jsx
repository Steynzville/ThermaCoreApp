import React from "react";

import ReportsView from "../components/ReportsView";
import UserReportsView from "../components/UserReportsView";
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
