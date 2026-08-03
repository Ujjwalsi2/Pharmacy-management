export type Role = 'ADMIN' | 'PHARMACIST';
export type DrugType =
  | 'TABLET'
  | 'CAPSULE'
  | 'SYRUP'
  | 'INJECTION'
  | 'OINTMENT'
  | 'DROPS'
  | 'INHALER'
  | 'OTHER';
export type PaymentMode = 'CASH' | 'CARD' | 'UPI';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

export interface RefreshTokenPayload {
  sub: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
      };
    }
  }
}

export {};
