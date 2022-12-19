import { createHash } from 'crypto';

export function currentTimeHash () {
    return createHash('sha256').update(new Date().getHours() + '' + (process.env.JOIN_URL_SALT ?? '')).digest('hex');
}