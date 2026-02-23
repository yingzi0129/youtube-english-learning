import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

function normalize(value?: string | null) {
  return value?.trim();
}

export function isTrialUser(user: User | null): boolean {
  if (!user) return false;

  const trialUserId = normalize(process.env.TRIAL_USER_ID);
  if (trialUserId && user.id === trialUserId) {
    return true;
  }

  const trialPhone = normalize(process.env.TRIAL_PHONE);
  if (!trialPhone) return false;

  if (user.user_metadata?.phone === trialPhone) {
    return true;
  }

  if (user.email && user.email.startsWith(`${trialPhone}@`)) {
    return true;
  }

  return false;
}

export async function getTrialContext() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, isTrial: false };
  }

  return { user, isTrial: isTrialUser(user) };
}
