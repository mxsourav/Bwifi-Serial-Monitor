// Lightweight keep-alive pinger for Render free-tier backends

class KeepAliveService {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private backendUrl: string = '';

  start(url: string, intervalSeconds: number = 30) {
    this.backendUrl = url;
    
    // Stop any existing interval
    this.stop();

    // Start background ping
    this.intervalId = setInterval(() => {
      this.ping();
    }, intervalSeconds * 1000);

    // Initial ping
    this.ping();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async ping() {
    if (!this.backendUrl) return;

    try {
      // Use HEAD request for minimal bandwidth. 
      // Cache-control no-cache ensures it actually hits the server and doesn't get swallowed by Vercel CDN.
      fetch(`${this.backendUrl}/api/health`, {
        method: 'HEAD',
        cache: 'no-store'
      }).catch(() => {
        // Silent catch: UI doesn't need to know if the ping fails
      });
    } catch (err) {
      // Silent catch
    }
  }
}

export const KeepAlive = new KeepAliveService();
