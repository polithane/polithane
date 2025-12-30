import { getUserHandle } from './userHandle';

export const getProfilePath = (user) => {
  const handle = getUserHandle(user);
  if (handle) return `/${encodeURIComponent(handle)}`;
  const id = user?.user_id ?? user?.id;
  return id ? `/profile/${id}` : '/';
};

