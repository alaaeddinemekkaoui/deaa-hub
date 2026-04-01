import { CyclesService } from './cycles.service';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { UpdateCycleDto } from './dto/update-cycle.dto';
export declare class CyclesController {
    private readonly cyclesService;
    constructor(cyclesService: CyclesService);
    findAll(): Promise<({
        _count: {
            classes: number;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        code: string | null;
    })[]>;
    findOne(id: number): Promise<{
        _count: {
            classes: number;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        code: string | null;
    }>;
    create(dto: CreateCycleDto): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        code: string | null;
    }>;
    update(id: number, dto: UpdateCycleDto): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        code: string | null;
    }>;
    remove(id: number): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        code: string | null;
    }>;
}
