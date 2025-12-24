import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export type JwtPayload = {
  sub: string;
  role: 'user' | 'admin';
};

export type VideoStreamJwtPayload = {
  vid: string;
};

export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

export function signVideoStreamToken(payload: VideoStreamJwtPayload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '10m' });
}

export function verifyVideoStreamToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as VideoStreamJwtPayload;
}
