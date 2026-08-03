import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

interface ValidateOptions {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Express 5's `req.query` and `req.params` are getter-only accessors on the
 * underlying `IncomingMessage`, so a plain `req.query = parsed` throws
 * ("Cannot set property query which has only a getter"). We redefine the
 * property instead, which works for both plain objects and getters.
 */
function overwrite(target: object, key: string, value: unknown) {
  Object.defineProperty(target, key, {
    value,
    writable: true,
    configurable: true,
    enumerable: true
  });
}

export function validate(schemas: ValidateOptions) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        overwrite(req, 'query', schemas.query.parse(req.query));
      }
      if (schemas.params) {
        overwrite(req, 'params', schemas.params.parse(req.params));
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
