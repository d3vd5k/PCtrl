import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRY = (process.env.JWT_EXPIRY ?? "15m") as `${number}${"s" | "m" | "h" | "d"}`

export interface JwtPayload {
  user_id: string;
  role: string;
  access: string;
}


export function sign_token(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}
export function verify_token(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}