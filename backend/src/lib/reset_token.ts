import crypto from "node:crypto";

export const generate_reset_token = () => {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    return { rawToken, tokenHash };
}

export const hash_reset_token = (token: string) => {
    return crypto.createHash("sha256").update(token).digest("hex");
}