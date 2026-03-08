/**
 * SSH error class
 */

export class SSHError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "SSHError";
  }
}
