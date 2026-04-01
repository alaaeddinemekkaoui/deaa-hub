import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateObservationDto } from './dto/create-observation.dto';
export declare class StudentObservationsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(studentId: number): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        studentId: number;
        text: string;
    }[]>;
    create(studentId: number, dto: CreateObservationDto): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        studentId: number;
        text: string;
    }>;
    remove(studentId: number, id: number): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        studentId: number;
        text: string;
    }>;
    private ensureStudentExists;
}
