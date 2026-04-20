declare module "ssl-checker" {
  type SslCheckerOptions = {
    method?: string;
    port?: number;
    protocol?: string;
    timeout?: number;
  };

  type SslCheckerResult = {
    valid: boolean;
    daysRemaining: number;
    validFrom: string;
    validTo: string;
  };

  export default function sslChecker(hostname: string, options?: SslCheckerOptions): Promise<SslCheckerResult>;
}
