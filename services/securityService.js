
export const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

export const createSession = (user) => {
    const session = {
        user: { ...user, password: '' }, // Never store password in session
        token: Math.random().toString(36).substring(2) + Date.now().toString(36),
        expiresAt: Date.now() + (1000 * 60 * 60 * 8) // 8 Hours
    };
    localStorage.setItem('SECURE_SESSION', JSON.stringify(session));
    return session.user;
};

export const getSession = () => {
    const stored = localStorage.getItem('SECURE_SESSION');
    if (!stored) return null;
    
    try {
        const session = JSON.parse(stored);
        if (Date.now() > session.expiresAt) {
            localStorage.removeItem('SECURE_SESSION');
            return null;
        }
        return session.user;
    } catch {
        return null;
    }
};

export const destroySession = () => {
    localStorage.removeItem('SECURE_SESSION');
};
