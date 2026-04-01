import { StudentObservationsService } from './student-observations.service';
import { CreateObservationDto } from './dto/create-observation.dto';
export declare class StudentObservationsController {
    private readonly service;
    constructor(service: StudentObservationsService);
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
}
