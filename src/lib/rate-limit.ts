import { createHash } from 'crypto';
import { createClient } from '@/lib/supabase/server';

const windowMs = 24 * 60 * 60 * 1000; // 24 hours
const maxRequests = 30;

export function hashIp(ip: string): string {
    // Note: parentheses matter — without them, `+` binds before `??` and the fallback never triggers
    return createHash('sha256')
        .update(ip + (process.env.IP_SALT ?? 'trace'))
        .digest('hex');
}

export function getClientIp(req: Request): string | null {
    // x-forwarded-for is a comma-separated list; first entry is the originating client
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return req.headers.get('x-real-ip');
}

/**
 * Returns true if the IP is within the rate limit, false if it has been exceeded.
 * No-ops (returns true) when no IP is available — don't block unidentifiable clients silently.
 */
export async function checkRateLimit(ipHash: string): Promise<boolean> {
    const supabase = await createClient();
    const cutoff = new Date(Date.now() - windowMs).toISOString();

    const { count } = await supabase
        .from('queries')
        .select('*', { count: 'exact', head: true })
        .eq('ip_hash', ipHash)
        .gte('created_at', cutoff);

    return (count ?? 0) < maxRequests;
}
