import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

export interface TokenPayload extends JwtPayload {
  id: string;
  email: string;
  role: 'Manager' | 'Cashier';
}

export interface AuthRequest extends Request {
  user?: TokenPayload;
}
