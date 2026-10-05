import { Schema, model, InferSchemaType } from 'mongoose';

export const PROJECT_STATUSES = ['pending', 'approved', 'revisions_requested', 'rejected'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

const projectSchema = new Schema(
    {
        title: { type: String, required: true, trim: true },
        abstract: { type: String, required: true, trim: true },
        keywords: { type: [String], default: [] },
        department: { type: String, required: true, trim: true },
        year: { type: Number, required: true },
        student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        supervisor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        status: { type: String, enum: PROJECT_STATUSES, default: 'pending' },
        reviewNote: { type: String, trim: true },
        githubUrl: { type: String, trim: true },
        demoUrl: { type: String, trim: true },
        pdfUrl: { type: String, trim: true },
        views: { type: Number, default: 0 },
        downloads: { type: Number, default: 0 },
    },
    { timestamps: true }
);

projectSchema.index({ title: 'text', abstract: 'text', keywords: 'text' });

export type IProject = InferSchemaType<typeof projectSchema>;
export const Project = model('Project', projectSchema);