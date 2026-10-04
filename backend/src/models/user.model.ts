import { Schema, model, InferSchemaType } from 'mongoose';

export const ROLES = ['student', 'supervisor', 'admin'] as const;
export type Role = (typeof ROLES)[number];

const userSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        passwordHash: { type: String, required: true, select: false },
        role: { type: String, enum: ROLES, required: true },
        department: { type: String, trim: true },
        matricNo: { type: String, trim: true, unique: true, sparse: true },
        mustChangePassword: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export type IUser = InferSchemaType<typeof userSchema>;
export const User = model('User', userSchema);