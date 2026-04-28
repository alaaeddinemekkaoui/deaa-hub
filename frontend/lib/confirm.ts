export function confirmTwice(firstMessage: string, secondMessage: string) {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.confirm(firstMessage) && window.confirm(secondMessage);
}

export function confirmDelete(label: string, context?: string) {
  const suffix = context ? ` ${context}` : '';
  return confirmTwice(
    `Supprimer ${label}${suffix} ?`,
    `Confirmation finale : supprimer définitivement ${label}${suffix} ?`,
  );
}
