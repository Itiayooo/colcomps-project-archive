import type { HydratedDocument } from 'mongoose';
import type { IUser } from '../models/user.model';

declare global {
    namespace Express {
        interface Request {
            user?: HydratedDocument<IUser>;
        }
    }
}

export { };