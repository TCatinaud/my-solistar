const requests = new Map<string, number[]>();

interface RateLimitOptions {
  maxRequests?: number;
  windowMs?: number;
}

export const checkRateLimit = (
  identifier: string,
  options: RateLimitOptions = {}
): { allowed: boolean; remaining: number; resetAt: number } => {
  const { maxRequests = 10, windowMs = 60000 } = options; // 10 requêtes par minute par défaut

  const now = Date.now();
  const userRequests = requests.get(identifier) || [];
  
  // Filtrer les requêtes dans la fenêtre de temps
  const recentRequests = userRequests.filter((time) => now - time < windowMs);

  if (recentRequests.length >= maxRequests) {
    // Trouver le moment où la prochaine requête sera autorisée
    const oldestRequest = recentRequests[0];
    const resetAt = oldestRequest + windowMs;

    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  // Ajouter la nouvelle requête
  recentRequests.push(now);
  requests.set(identifier, recentRequests);

  return {
    allowed: true,
    remaining: maxRequests - recentRequests.length,
    resetAt: now + windowMs,
  };
};

// Nettoyer périodiquement les anciennes entrées (optionnel, pour éviter la fuite mémoire)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    const windowMs = 60000; // 1 minute

    for (const [identifier, requestTimes] of requests.entries()) {
      const recentRequests = requestTimes.filter(
        (time) => now - time < windowMs
      );

      if (recentRequests.length === 0) {
        requests.delete(identifier);
      } else {
        requests.set(identifier, recentRequests);
      }
    }
  }, 300000); // Nettoyer toutes les 5 minutes
}

