import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

export function verifyToken(req) {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.token;
    if (!token) return null;
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return null;
    }
}