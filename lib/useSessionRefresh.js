import { useEffect } from 'react';
import { useRouter } from 'next/router';

export function useSessionRefresh() {
  const router = useRouter();
  
  useEffect(() => {
    const refreshSession = async () => {
      try {
        const resp = await fetch('/api/auth/refresh');
        if (!resp.ok) {
          console.log('Session expired, redirecting to login...');
          router.replace('/admin');
        }
      } catch (err) {
        console.error('Failed to refresh session:', err);
      }
    };
    
    refreshSession();
    // Refresh session every 6 hours
    const intervalId = setInterval(refreshSession, 6 * 60 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [router]);
}