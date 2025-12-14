import { normalizeUsername } from './validators';

export const getProfilePath = (user) => {
  const raw = user?.username || '';
  const normalized = normalizeUsername(raw);
  if (normalized) return `/${normalized}`;
  const id = user?.user_id ?? user?.id;
  return id ? `/profile/${id}` : '/';
};

