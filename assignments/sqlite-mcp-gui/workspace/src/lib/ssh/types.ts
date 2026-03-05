/**
 * SSH type definitions
 */

export interface SSHOptions {
  host: string;
  user?: string;
  timeout?: number;
  port?: number;
  keyPath?: string;
  password?: string;
}

export interface SCPOptions extends SSHOptions {
  source: string;
  destination: string;
  recursive?: boolean;
  preserve?: boolean;
}
