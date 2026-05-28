import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function useNotifications(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    let es: EventSource;
    let retryDelay = 1000;

    function connect() {
      es = new EventSource(`${API_BASE}/api/notifications/stream`, { withCredentials: true });

      es.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as { type: string };
          if (msg.type === 'event_state_changed') queryClient.invalidateQueries({ queryKey: ['events'] });
          else if (msg.type === 'exception_submitted') queryClient.invalidateQueries({ queryKey: ['exceptions'] });
          else if (msg.type === 'proposal_pending') queryClient.invalidateQueries({ queryKey: ['admin', 'proposals'] });
        } catch { /* ignore parse errors */ }
      };

      es.onopen = () => { retryDelay = 1000; };

      es.onerror = () => {
        es.close();
        setTimeout(connect, Math.min(retryDelay, 30_000));
        retryDelay = Math.min(retryDelay * 2, 30_000);
      };
    }

    connect();
    return () => es?.close();
  }, [queryClient]);
}
