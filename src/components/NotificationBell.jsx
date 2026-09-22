import { Bell } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useUnits } from "../context/UnitContext";
export default function NotificationBell() {
  const { alerts, scopeLabel } = useUnits();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifications (${alerts.length})`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="p-2 relative"
      >
        <Bell className="w-5 h-5" />
        {!!alerts.length && (
          <span className="absolute -right-1 -top-1 bg-red-600 text-white rounded-full text-xs px-1">
            {alerts.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 w-80 max-h-96 overflow-auto border rounded-lg bg-background shadow-xl p-4">
          <h2 className="font-semibold">{scopeLabel}</h2>
          {alerts.map((a) => (
            <Link
              key={a.id}
              className="block py-3 border-b"
              to={`/unit-details/${encodeURIComponent(a.unitId)}`}
              onClick={() => setOpen(false)}
            >
              {a.unitName}: {a.message}
            </Link>
          ))}
          {!alerts.length && <p className="py-3">No current notifications.</p>}
          <Link
            className="block underline mt-3"
            to="/alerts"
            onClick={() => setOpen(false)}
          >
            View alerts
          </Link>
        </div>
      )}
    </div>
  );
}
