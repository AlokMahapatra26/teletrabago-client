import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const [isHydrated, setIsHydrated] = useState(false);
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);

  useEffect(() => {
    setIsHydrated(_hasHydrated);
  }, [_hasHydrated]);

  return {
    user,
    accessToken,
    isAuthenticated: !!user && !!accessToken,
    isLoading: !isHydrated,
  };
}
