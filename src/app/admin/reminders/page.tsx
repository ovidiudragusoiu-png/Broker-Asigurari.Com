import ReminderPanel from "@/components/admin/ReminderPanel";
import {
  fetchRecentReminderHistory,
  fetchUpcomingReminders,
  getReminderSystemStatus,
} from "@/lib/admin/reminderData";

export default async function AdminRemindersPage() {
  const [status, upcoming, history] = await Promise.all([
    getReminderSystemStatus(),
    fetchUpcomingReminders(),
    fetchRecentReminderHistory(50),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900">Reminder-e expirare</h2>
        <p className="mt-1 text-sm text-gray-500">
          Configurare, programări și istoric trimiteri.
        </p>
      </div>

      <ReminderPanel
        status={status}
        upcoming={upcoming}
        history={history}
      />
    </div>
  );
}
