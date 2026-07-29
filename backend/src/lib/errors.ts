// lib/errors.ts
export class PcActionError extends Error {
    status: number;
    constructor(message: string, status = 409) {
        super(message);
        this.status = status;
  }
}