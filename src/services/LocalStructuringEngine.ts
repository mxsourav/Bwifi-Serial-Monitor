type WarningType = 'Brownout' | 'Guru Meditation' | 'Watchdog Timeout' | 'SD Mount Failure' | 'SPI Conflict' | 'LoadProhibited';

export interface CrashWarning {
  type: WarningType;
  message: string;
  timestamp: number;
}

class LocalStructuringEngineService {
  private warnings: CrashWarning[] = [];
  private warningListeners: ((warnings: CrashWarning[]) => void)[] = [];

  parseLine(timeStr: string, tag: string, text: string) {
    let warningDetected: WarningType | null = null;
    let message = '';

    const lowerText = text.toLowerCase();

    if (lowerText.includes('brownout detector was triggered')) {
      warningDetected = 'Brownout';
      message = 'System power dropped below stable thresholds.';
    } else if (lowerText.includes('guru meditation error')) {
      warningDetected = 'Guru Meditation';
      message = 'Fatal CPU exception occurred.';
    } else if (lowerText.includes('task watchdog got triggered')) {
      warningDetected = 'Watchdog Timeout';
      message = 'A FreeRTOS task starved the CPU for too long.';
    } else if (lowerText.includes('sd') && (lowerText.includes('mount failed') || lowerText.includes('init failed'))) {
      warningDetected = 'SD Mount Failure';
      message = 'Failed to mount SD card filesystem.';
    } else if (lowerText.includes('loadprohibited') || lowerText.includes('storeprohibited')) {
      warningDetected = 'LoadProhibited';
      message = 'Memory access violation detected.';
    } else if (lowerText.includes('spi') && lowerText.includes('conflict')) {
      warningDetected = 'SPI Conflict';
      message = 'Multiple devices competing for SPI bus.';
    }

    if (warningDetected) {
      const newWarning: CrashWarning = { type: warningDetected, message, timestamp: Date.now() };
      this.warnings.push(newWarning);
      this.notifyListeners();
    }
  }

  getWarnings() {
    return this.warnings;
  }

  clearWarnings() {
    this.warnings = [];
    this.notifyListeners();
  }

  subscribe(listener: (warnings: CrashWarning[]) => void) {
    this.warningListeners.push(listener);
    return () => {
      this.warningListeners = this.warningListeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.warningListeners.forEach(l => l(this.warnings));
  }

  formatContextForAI(logs: {timeStr: string, tag: string, text: string}[]) {
    // Basic compression: deduplicate spam, group panics
    let context = "--- SERIAL LOG SESSION ---\n";
    let lastText = "";
    let duplicateCount = 0;

    for (const log of logs) {
      if (log.text === lastText) {
        duplicateCount++;
        continue;
      }
      
      if (duplicateCount > 0) {
        context += `... [Previous line repeated ${duplicateCount} times]\n`;
        duplicateCount = 0;
      }

      context += `[${log.timeStr}] [${log.tag}] ${log.text}\n`;
      lastText = log.text;
    }

    if (this.warnings.length > 0) {
      context += "\n--- DETECTED HARDWARE/SOFTWARE CRASHES ---\n";
      this.warnings.forEach(w => {
        context += `- ${w.type}: ${w.message}\n`;
      });
    }

    return context;
  }
}

export const LocalStructuringEngine = new LocalStructuringEngineService();
