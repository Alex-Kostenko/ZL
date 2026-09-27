import type { ApiEnv } from '@ml/config';
import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { stdTimeFunctions } from 'pino';
import { API_ENV } from '../config/config.module';
import { resolveRequestId } from './request-id';

// Never log credentials or secrets (§49, rule 13). Request bodies are not logged at all.
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.totp',
  '*.totpCode',
  '*.secret',
];

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [API_ENV],
      useFactory: (env: ApiEnv) => ({
        pinoHttp: {
          level: env.LOG_LEVEL,
          base: { service: 'api', env: env.NODE_ENV },
          timestamp: stdTimeFunctions.isoTime,
          formatters: { level: (label: string) => ({ level: label }) },
          // Human-readable output locally; JSON lines everywhere else.
          transport:
            env.NODE_ENV === 'development'
              ? {
                  target: 'pino-pretty',
                  options: { singleLine: true, translateTime: 'SYS:HH:MM:ss.l' },
                }
              : undefined,
          genReqId: resolveRequestId,
          // Binds `requestId` to req.log, which nestjs-pino uses for every log line in the request.
          quietReqLogger: true,
          customAttributeKeys: { reqId: 'requestId' },
          redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
          serializers: {
            req: (req: { method: string; url: string }) => ({ method: req.method, url: req.url }),
            res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
          },
          customLogLevel: (_req, res, err) =>
            err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
          autoLogging: { ignore: (req) => req.url?.startsWith('/api/docs') ?? false },
        },
      }),
    }),
  ],
})
export class LoggingModule {}
