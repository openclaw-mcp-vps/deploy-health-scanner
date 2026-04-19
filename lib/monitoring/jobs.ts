import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/db/schema";
import { monitorQueue } from "@/lib/monitoring/queue";

interface MonitorJobRecord {
  id: string;
  owner_key: string;
  url: string;
  name: string;
}

export async function enqueueMonitorChecks(monitorId?: string): Promise<number> {
  await ensureSchema();

  const values: unknown[] = [];
  let filterSql = "";

  if (monitorId) {
    filterSql = "AND m.id = $1";
    values.push(monitorId);
  }

  const monitors = await query<MonitorJobRecord>(
    `
      SELECT m.id, m.owner_key, m.url, m.name
      FROM monitors m
      JOIN subscriptions s ON s.owner_key = m.owner_key
      WHERE m.active = TRUE
        AND s.status = 'active'
        ${filterSql}
    `,
    values
  );

  if (monitors.rowCount === 0) {
    return 0;
  }

  await Promise.all(
    monitors.rows.map((monitor) =>
      monitorQueue.add("check-monitor", {
        monitorId: monitor.id,
        ownerKey: monitor.owner_key,
        url: monitor.url,
        name: monitor.name,
      })
    )
  );

  return monitors.rowCount ?? monitors.rows.length;
}
