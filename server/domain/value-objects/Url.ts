export class Url {
  private readonly value: URL;

  private constructor(url: URL) {
    this.value = url;
  }

  static create(urlString: string): Url {
    if (!urlString || urlString.trim().length === 0) {
      throw new Error('URL cannot be empty');
    }

    try {
      const url = new URL(urlString.trim());

      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error(`URL must use http or https protocol, got: ${url.protocol}`);
      }

      return new Url(url);
    } catch (error) {
      if (error instanceof Error && error.message.includes('protocol')) {
        throw error;
      }
      throw new Error(`Invalid URL format: ${urlString}`);
    }
  }

  toString(): string {
    return this.value.toString();
  }

  getProtocol(): string {
    return this.value.protocol;
  }

  getHostname(): string {
    return this.value.hostname;
  }

  getPort(): number {
    if (this.value.port) {
      return parseInt(this.value.port, 10);
    }
    return this.value.protocol === 'https:' ? 443 : 80;
  }

  getPathname(): string {
    return this.value.pathname;
  }

  appendPath(path: string): Url {
    const newUrl = new URL(this.value.toString());
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    newUrl.pathname = newUrl.pathname.replace(/\/$/, '') + cleanPath;
    return new Url(newUrl);
  }

  isSecure(): boolean {
    return this.value.protocol === 'https:';
  }

  equals(other: Url): boolean {
    return this.value.toString() === other.value.toString();
  }
}
