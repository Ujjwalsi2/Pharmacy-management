export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INSUFFICIENT_STOCK'
  | 'INTERNAL';

const CODE_STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INSUFFICIENT_STOCK: 409,
  INTERNAL: 500
};

export class AppError extends Error {
  code: ErrorCode;
  status: number;
  details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = CODE_STATUS[code];
    this.details = details;
  }

  static validation(message: string, details?: unknown) {
    return new AppError('VALIDATION_ERROR', message, details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError('UNAUTHORIZED', message);
  }

  static forbidden(message = 'Forbidden') {
    return new AppError('FORBIDDEN', message);
  }

  static notFound(message = 'Not found') {
    return new AppError('NOT_FOUND', message);
  }

  static conflict(message: string, details?: unknown) {
    return new AppError('CONFLICT', message, details);
  }

  static insufficientStock(message: string, details?: unknown) {
    return new AppError('INSUFFICIENT_STOCK', message, details);
  }
}
