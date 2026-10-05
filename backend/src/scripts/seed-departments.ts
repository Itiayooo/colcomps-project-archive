import 'dotenv/config';
import mongoose from 'mongoose';
import { Department } from '../models/department.model';
import { connectDB } from '../config/db';

const NAMES = ['Computer Science', 'Software Engineering', 'Information Systems', 'Cyber Security', 'Data Science', 'Information Technology', 'Information Communication Technology'];

async function seed() {
    await connectDB();
    for (const name of NAMES) {
        await Department.updateOne({ name }, { $setOnInsert: { name } }, { upsert: true });
    }
    console.log('Departments ready');
}

seed()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());