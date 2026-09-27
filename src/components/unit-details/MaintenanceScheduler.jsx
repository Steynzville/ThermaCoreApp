import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useUnits } from "../../context/UnitContext";
import { apiGetJson, apiPostJson } from "../../utils/apiFetch";
export default function MaintenanceScheduler({ unit, onClose }) {
  const { user, permissions } = useAuth();
  const { isDemoMode } = useUnits();
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [records, setRecords] = useState([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const key = `thermacore:demo:maintenance:${user?.id}:${unit.tenantId}:${unit.id}`;
  const endpoint = `/api/v1/units/${encodeURIComponent(unit.id)}/maintenance`;
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = isDemoMode
          ? JSON.parse(localStorage.getItem(key) || "[]")
          : (await apiGetJson(endpoint)).data;
        if (active)
          setRecords((previous) => [
            ...new Map(
              [...rows, ...previous].map((record) => [record.id, record]),
            ).values(),
          ]);
      } catch (error) {
        if (active) setError(error.message);
      }
    })();
    return () => {
      active = false;
    };
  }, [key, endpoint, isDemoMode]);
  const submit = async (event) => {
    event.preventDefault();
    if (!permissions?.canControlUnits) return;
    setError("");
    setMessage("");
    setPending(true);
    try {
      const time = new Date(date);
      if (!Number.isFinite(+time) || time <= new Date())
        throw new Error("Choose a future maintenance date.");
      const body = {
        scheduledAt: time.toISOString(),
        description: description.trim(),
      };
      if (body.description.length < 3 || body.description.length > 2000)
        throw new Error("Enter a description of 3–2000 characters.");
      let record;
      if (isDemoMode) {
        record = {
          ...body,
          id: crypto.randomUUID(),
          unitId: unit.id,
          status: "scheduled",
        };
        const saved = JSON.parse(localStorage.getItem(key) || "[]");
        localStorage.setItem(key, JSON.stringify([record, ...saved]));
      } else record = await apiPostJson(endpoint, body);
      setRecords((previous) => [record, ...previous]);
      setMessage(
        isDemoMode
          ? "Demo maintenance schedule saved on this device."
          : "Maintenance scheduled.",
      );
    } catch (error) {
      setError(error.message);
    } finally {
      setPending(false);
    }
  };
  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-label="Schedule Maintenance"
      className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center p-4"
    >
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-auto space-y-4">
        <h2 className="text-xl font-bold">
          Schedule Maintenance — {unit.name}
        </h2>
        {permissions?.canControlUnits && (
          <form onSubmit={submit} className="space-y-3">
            <label className="block">
              Scheduled date and time (local)
              <input
                className="block border p-2"
                aria-label="Maintenance date"
                type="datetime-local"
                required
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <label className="block">
              Maintenance description
              <textarea
                className="block border p-2 w-full"
                aria-label="Maintenance description"
                required
                minLength={3}
                maxLength={2000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <button
              disabled={pending}
              className="bg-blue-600 text-white rounded px-4 py-2"
              type="submit"
            >
              {pending ? "Saving…" : "Save maintenance schedule"}
            </button>
          </form>
        )}
        {error && <p role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}
        <h3 className="font-semibold">Maintenance records</h3>
        {records.map((record) => (
          <p key={record.id}>
            {new Date(record.scheduledAt).toLocaleString()} —{" "}
            {record.description} ({record.status})
          </p>
        ))}
        <button
          type="button"
          onClick={onClose}
          className="border rounded px-4 py-2"
        >
          Close
        </button>
      </div>
    </section>
  );
}
