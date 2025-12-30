export const getUserHandle = (userOrString) => {
  try {
    if (!userOrString) return '';
    const raw =
      typeof userOrString === 'string'
        ? userOrString
        : userOrString?.username ??
          userOrString?.unique_name ??
          userOrString?.user_name ??
          userOrString?.handle ??
          '';
    return String(raw || '')
      .trim()
      .replace(/^@+/, '');
  } catch {
    return '';
  }
};

