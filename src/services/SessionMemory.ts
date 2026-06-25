import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface SerialMemoryDB extends DBSchema {
  logs: {
    key: number;
    value: {
      timestamp: number;
      timeStr: string;
      tag: string;
      text: string;
      raw: string;
    };
    indexes: { 'by-timestamp': number };
  };
}

class SessionMemoryService {
  private dbPromise: Promise<IDBPDatabase<SerialMemoryDB>>;
  private sessionStartTime: number;

  constructor() {
    this.sessionStartTime = Date.now();
    this.dbPromise = openDB<SerialMemoryDB>('satan-serial-memory', 1, {
      upgrade(db) {
        const store = db.createObjectStore('logs', {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('by-timestamp', 'timestamp');
      },
    });
  }

  async addLog(timeStr: string, tag: string, text: string, raw: string) {
    const db = await this.dbPromise;
    await db.add('logs', {
      timestamp: Date.now(),
      timeStr,
      tag,
      text,
      raw
    });
  }

  async getAllLogsForSession() {
    const db = await this.dbPromise;
    const logs = await db.getAllFromIndex('logs', 'by-timestamp');
    // Only return logs from this browser session
    return logs.filter(l => l.timestamp >= this.sessionStartTime);
  }

  async clearSession() {
    const db = await this.dbPromise;
    await db.clear('logs');
    this.sessionStartTime = Date.now();
  }

  async exportSessionHTML(): Promise<string> {
    const logs = await this.getAllLogsForSession();
    let html = `<!DOCTYPE html><html><head><title>S.A.T.A.N. Diagnostic Report</title>`;
    html += `<style>body{background:#0a0a0a;color:#f0f0f0;font-family:monospace;padding:20px;} .tag{color:#00ffff;}</style></head><body>`;
    html += `<h1>Diagnostic Session Export - ${new Date().toLocaleString()}</h1><hr/>`;
    for(const log of logs) {
      html += `<div>[${log.timeStr}] <span class="tag">${log.tag}</span> ${log.text}</div>`;
    }
    html += `</body></html>`;
    return html;
  }
}

export const SessionMemory = new SessionMemoryService();
