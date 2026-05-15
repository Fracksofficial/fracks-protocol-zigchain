'use client';

import { useIdentityContext, type IdentityClaim, type UserIdentity } from '@/contexts/identity-context';

export { type IdentityClaim, type UserIdentity };

export function useIdentity() {
  return useIdentityContext();
}
