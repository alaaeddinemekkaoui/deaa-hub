import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MealReservation, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { KeyedTtlCache } from '../../common/utils/keyed-ttl-cache';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { UserRole } from '../../common/types/role.type';
import { CreateMealDto } from './dto/create-meal.dto';
import { UpdateMealDto } from './dto/update-meal.dto';
import {
  ConsumeTicketDto,
  IssueTicketDto,
  ReserveMealDto,
  ReserveMealsDto,
} from './dto/reserve-meal.dto';
import { AdjustWalletDto, CreditWalletDto } from './dto/update-wallet.dto';

const MONEY_PRECISION = 100;

function roundMoney(value: number): number {
  return Math.round(value * MONEY_PRECISION) / MONEY_PRECISION;
}

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

@Injectable()
export class RestaurationService {
  private readonly studentReservationLocks = new Map<number, Promise<void>>();
  private readonly reservationsCache = new KeyedTtlCache<unknown>({
    prefix: 'restauration:reservations',
    ttlMs: 20 * 1000,
    staleTtlMs: 90 * 1000,
  });

  private readonly transactionsCache = new KeyedTtlCache<unknown>({
    prefix: 'restauration:transactions',
    ttlMs: 20 * 1000,
    staleTtlMs: 90 * 1000,
  });

  constructor(private readonly prisma: PrismaService) {}

  async findMeals(includeInactive = false) {
    return this.prisma.meal.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
  }

  createMeal(dto: CreateMealDto) {
    return this.prisma.meal.create({
      data: {
        name: dto.name.trim(),
        price: roundMoney(dto.price),
        active: dto.active ?? true,
      },
    });
  }

  async updateMeal(id: number, dto: UpdateMealDto) {
    await this.ensureMealExists(id);
    return this.prisma.meal.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.price !== undefined ? { price: roundMoney(dto.price) } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  async removeMeal(id: number) {
    await this.ensureMealExists(id);
    return this.prisma.meal.delete({ where: { id } });
  }

  async getWallet(studentId: number, user: JwtPayload) {
    await this.ensureCanAccessStudent(studentId, user);
    return this.getOrCreateWallet(studentId);
  }

  async getMyWallet(user: JwtPayload) {
    const studentId = await this.resolveStudentIdForUser(user);
    return this.getOrCreateWallet(studentId);
  }

  async creditWallet(dto: CreditWalletDto, actor: JwtPayload) {
    this.ensureCanManageRestauration(actor);
    await this.ensureStudentExists(dto.studentId);

    const result = await this.prisma.$transaction(async (tx) => {
      const wallet = await this.getOrCreateWallet(dto.studentId, tx);
      const nextBalance = roundMoney(wallet.balance + dto.amount);

      await tx.mealWallet.update({
        where: { studentId: dto.studentId },
        data: { balance: nextBalance },
      });

      await tx.mealTransaction.create({
        data: {
          studentId: dto.studentId,
          actorUserId: actor.sub,
          type: 'credit',
          amount: roundMoney(dto.amount),
          balanceAfter: nextBalance,
          description: dto.description?.trim() || 'Recharge solde restauration',
        },
      });

      return { studentId: dto.studentId, balance: nextBalance };
    });

    this.invalidateStudentViews(dto.studentId);
    return result;
  }

  async adjustWallet(dto: AdjustWalletDto, actor: JwtPayload) {
    this.ensureCanManageRestauration(actor);
    await this.ensureStudentExists(dto.studentId);

    const result = await this.prisma.$transaction(async (tx) => {
      await this.getOrCreateWallet(dto.studentId, tx);
      const nextBalance = roundMoney(dto.balance);

      await tx.mealWallet.update({
        where: { studentId: dto.studentId },
        data: { balance: nextBalance },
      });

      await tx.mealTransaction.create({
        data: {
          studentId: dto.studentId,
          actorUserId: actor.sub,
          type: 'adjustment',
          amount: nextBalance,
          balanceAfter: nextBalance,
          description:
            dto.description?.trim() || 'Ajustement solde restauration',
        },
      });

      return { studentId: dto.studentId, balance: nextBalance };
    });

    this.invalidateStudentViews(dto.studentId);
    return result;
  }

  async searchStudents(user: JwtPayload, search: string, limit = 20) {
    this.ensureCanManageRestauration(user);

    const normalizedSearch = search.trim();
    if (normalizedSearch.length < 2) {
      return [];
    }

    return this.prisma.student.findMany({
      where: {
        OR: [
          { fullName: { contains: normalizedSearch, mode: 'insensitive' } },
          { codeMassar: { contains: normalizedSearch, mode: 'insensitive' } },
          { codeEtudiant: { contains: normalizedSearch, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        fullName: true,
        codeMassar: true,
        codeEtudiant: true,
      },
      orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
      take: Math.min(Math.max(limit, 1), 20),
    });
  }

  async reserve(dto: ReserveMealDto, user: JwtPayload) {
    return this.reserveMany(
      {
        studentId: dto.studentId,
        items: [
          {
            mealId: dto.mealId,
            reservationDate: dto.reservationDate ?? todayIso(),
          },
        ],
      },
      user,
    );
  }

  async reserveMany(dto: ReserveMealsDto, user: JwtPayload) {
    if (!dto.items?.length) {
      throw new BadRequestException('Aucun repas sélectionné');
    }

    const studentId = await this.resolveReservationStudentId(
      dto.studentId,
      user,
    );
    const uniqueItems = this.uniqueReservationItems(dto.items);
    const today = todayIso();

    const invalidPastDate = uniqueItems.find(
      (item) => item.reservationDate < today,
    );
    if (invalidPastDate) {
      throw new BadRequestException(
        'Impossible de réserver un repas pour une date passée',
      );
    }

    const result = await this.withStudentReservationLock(
      studentId,
      async () => {
        const duplicates = await this.prisma.mealReservation.findMany({
          where: {
            studentId,
            status: { in: ['confirmed', 'consumed'] },
            OR: uniqueItems.map((item) => ({
              mealId: item.mealId,
              reservationDate: item.reservationDate,
            })),
          },
          include: { meal: true },
        });

        const duplicateKeySet = new Set(
          duplicates.map((item) => `${item.mealId}:${item.reservationDate}`),
        );
        const itemsToReserve = uniqueItems.filter(
          (item) =>
            !duplicateKeySet.has(`${item.mealId}:${item.reservationDate}`),
        );

        if (itemsToReserve.length === 0) {
          throw new BadRequestException(
            'Tous les repas sélectionnés sont déjà réservés',
          );
        }

        const wallet = await this.getOrCreateWallet(studentId);
        const meals = await this.prisma.meal.findMany({
          where: {
            id: { in: itemsToReserve.map((item) => item.mealId) },
            active: true,
          },
        });
        const mealById = new Map(meals.map((meal) => [meal.id, meal]));

        for (const item of itemsToReserve) {
          if (!mealById.has(item.mealId)) {
            throw new NotFoundException('Repas introuvable ou inactif');
          }
        }

        const totalPrice = roundMoney(
          itemsToReserve.reduce(
            (sum, item) => sum + (mealById.get(item.mealId)?.price ?? 0),
            0,
          ),
        );
        if (wallet.balance < totalPrice) {
          throw new BadRequestException('Solde insuffisant');
        }

        const balanceAfter = roundMoney(wallet.balance - totalPrice);
        const reservationRows = itemsToReserve.map((item) => {
          const meal = mealById.get(item.mealId)!;
          return {
            mealId: meal.id,
            studentId,
            reservedById: user.sub,
            reservationDate: item.reservationDate,
            quantity: 1,
            totalPrice: roundMoney(meal.price),
            receiptNumber: this.createReceiptNumber(),
          };
        });

        let walletDebited = false;
        let reservationsCreated = false;

        try {
          const walletUpdate = await this.prisma.mealWallet.updateMany({
            where: {
              studentId,
              balance: { gte: totalPrice },
            },
            data: {
              balance: { decrement: totalPrice },
            },
          });

          if (walletUpdate.count !== 1) {
            throw new BadRequestException('Solde insuffisant');
          }
          walletDebited = true;

          const createResult = await this.prisma.mealReservation.createMany({
            data: reservationRows,
          });

          if (createResult.count !== reservationRows.length) {
            throw new BadRequestException(
              'Impossible de finaliser toutes les réservations',
            );
          }
          reservationsCreated = true;

          await this.prisma.mealTransaction.create({
            data: {
              studentId,
              actorUserId: user.sub,
              type: 'debit',
              amount: totalPrice,
              balanceAfter,
              description: `Réservation restauration (${reservationRows.length} repas)`,
            },
          });
        } catch (error) {
          if (reservationsCreated) {
            await this.prisma.mealReservation.deleteMany({
              where: {
                receiptNumber: {
                  in: reservationRows.map((row) => row.receiptNumber),
                },
              },
            });
          }

          if (walletDebited) {
            await this.prisma.mealWallet.update({
              where: { studentId },
              data: {
                balance: { increment: totalPrice },
              },
            });
          }

          throw error;
        }

        return {
          reservations: await this.prisma.mealReservation.findMany({
            where: {
              receiptNumber: {
                in: reservationRows.map((row) => row.receiptNumber),
              },
            },
            include: this.reservationInclude(),
            orderBy: [{ reservationDate: 'asc' }, { id: 'asc' }],
          }),
          skipped: duplicates.map((item) => ({
            mealId: item.mealId,
            mealName: item.meal.name,
            reservationDate: item.reservationDate,
          })),
          balanceAfter,
          totalPrice,
        };
      },
    );

    this.invalidateStudentViews(studentId);
    return result;
  }

  async cancelReservation(id: number, user: JwtPayload) {
    const reservation = await this.prisma.mealReservation.findUnique({
      where: { id },
      include: { meal: true },
    });
    if (!reservation) throw new NotFoundException('Réservation introuvable');
    await this.ensureCanAccessStudent(reservation.studentId, user);

    if (reservation.status !== 'confirmed') {
      throw new BadRequestException('Réservation non annulable');
    }
    if (reservation.consumedAt) {
      throw new BadRequestException('Repas déjà consommé');
    }
    if (reservation.reservationDate < todayIso()) {
      await this.markExpiredReservations(reservation.studentId);
      throw new BadRequestException('Réservation expirée');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const wallet = await this.getOrCreateWallet(reservation.studentId, tx);
      const balanceAfter = roundMoney(wallet.balance + reservation.totalPrice);

      const cancelled = await tx.mealReservation.update({
        where: { id },
        data: { status: 'cancelled', cancelledAt: new Date() },
        include: this.reservationInclude(),
      });

      await tx.mealWallet.update({
        where: { studentId: reservation.studentId },
        data: { balance: balanceAfter },
      });

      await tx.mealTransaction.create({
        data: {
          studentId: reservation.studentId,
          actorUserId: user.sub,
          reservationId: id,
          type: 'credit',
          amount: roundMoney(reservation.totalPrice),
          balanceAfter,
          description: `Annulation ${reservation.meal.name} ${reservation.reservationDate}`,
        },
      });

      return { reservation: cancelled, balanceAfter };
    });

    this.invalidateStudentViews(reservation.studentId);
    return result;
  }

  async listReservations(user: JwtPayload, studentId?: number) {
    const where: Prisma.MealReservationWhereInput = {};
    let targetStudentId: number | undefined;

    if (this.isStudent(user)) {
      targetStudentId = await this.resolveStudentIdForUser(user);
      where.studentId = targetStudentId;
    } else if (studentId) {
      targetStudentId = studentId;
      where.studentId = studentId;
    }

    if (targetStudentId) {
      await this.markExpiredReservations(targetStudentId);
    }

    const cacheKey = JSON.stringify({
      studentId: targetStudentId ?? null,
      role: user.role,
    });

    return this.reservationsCache.getOrLoad(cacheKey, () =>
      this.prisma.mealReservation.findMany({
        where,
        include: this.reservationInclude(),
        orderBy: [{ reservationDate: 'desc' }, { createdAt: 'desc' }],
        take: 500,
      }),
    );
  }

  async listTransactions(user: JwtPayload, studentId?: number) {
    const targetStudentId = this.isStudent(user)
      ? await this.resolveStudentIdForUser(user)
      : studentId;

    if (!targetStudentId) {
      this.ensureCanManageRestauration(user);
    } else {
      await this.ensureCanAccessStudent(targetStudentId, user);
    }

    const cacheKey = JSON.stringify({
      studentId: targetStudentId ?? null,
      role: user.role,
    });

    return this.transactionsCache.getOrLoad(cacheKey, () =>
      this.prisma.mealTransaction.findMany({
        where: targetStudentId ? { studentId: targetStudentId } : {},
        include: {
          actor: { select: { id: true, fullName: true, role: true } },
          student: { select: { id: true, fullName: true, codeMassar: true } },
          reservation: {
            select: {
              id: true,
              receiptNumber: true,
              ticketCode: true,
              meal: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 300,
      }),
    );
  }

  async issueTicket(dto: IssueTicketDto, user: JwtPayload) {
    this.ensureCanManageRestauration(user);

    const reservation = await this.prisma.mealReservation.findUnique({
      where: { id: dto.reservationId },
      include: this.reservationInclude(),
    });
    if (!reservation) throw new NotFoundException('Réservation introuvable');
    if (reservation.reservationDate !== todayIso()) {
      throw new BadRequestException(
        'Ticket disponible seulement le jour du repas',
      );
    }
    if (reservation.status !== 'confirmed') {
      throw new BadRequestException(
        'Ticket non disponible pour cette réservation',
      );
    }

    if (reservation.ticketCode && reservation.ticketIssuedAt) {
      return reservation;
    }

    const updated = await this.prisma.mealReservation.update({
      where: { id: reservation.id },
      data: {
        ticketCode: await this.createUniqueTicketCode(),
        ticketIssuedAt: new Date(),
      },
      include: this.reservationInclude(),
    });

    this.invalidateStudentViews(reservation.studentId);
    return updated;
  }

  async validateTicket(code: string) {
    const reservation = await this.findReservationByTicketCode(code);
    if (!reservation) {
      return { valid: false, reason: 'Ticket introuvable' };
    }
    if (reservation.reservationDate !== todayIso()) {
      return { valid: false, reason: 'Ticket hors date', reservation };
    }
    if (reservation.status !== 'confirmed') {
      return {
        valid: false,
        reason: `Ticket ${reservation.status}`,
        reservation,
      };
    }
    if (reservation.consumedAt) {
      return { valid: false, reason: 'Ticket déjà utilisé', reservation };
    }
    return { valid: true, reason: 'Ticket valide', reservation };
  }

  async consumeTicket(dto: ConsumeTicketDto, user: JwtPayload) {
    this.ensureCanManageRestauration(user);
    const validation = await this.validateTicket(dto.code.trim());
    if (!validation.valid || !validation.reservation) {
      throw new BadRequestException(validation.reason);
    }

    const updated = await this.prisma.mealReservation.update({
      where: { id: validation.reservation.id },
      data: { status: 'consumed', consumedAt: new Date() },
      include: this.reservationInclude(),
    });

    this.invalidateStudentViews(validation.reservation.studentId);
    return updated;
  }

  async getReceipt(id: number, user: JwtPayload) {
    const reservation = await this.prisma.mealReservation.findUnique({
      where: { id },
      include: this.reservationInclude(),
    });

    if (!reservation) throw new NotFoundException('Reçu introuvable');
    await this.ensureCanAccessStudent(reservation.studentId, user);
    const wallet = await this.getOrCreateWallet(reservation.studentId);

    return {
      ...reservation,
      balanceAfter: wallet.balance,
      school: 'DEAA Hub',
      printedAt: new Date().toISOString(),
    };
  }

  private uniqueReservationItems(items: ReserveMealsDto['items']) {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = `${item.mealId}:${item.reservationDate}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private async markExpiredReservations(studentId?: number) {
    await this.prisma.mealReservation.updateMany({
      where: {
        ...(studentId ? { studentId } : {}),
        status: 'confirmed',
        consumedAt: null,
        reservationDate: { lt: todayIso() },
      },
      data: { status: 'expired' },
    });

    this.invalidateStudentViews(studentId);
  }

  private async findReservationByTicketCode(code: string) {
    return this.prisma.mealReservation.findUnique({
      where: { ticketCode: code.trim() },
      include: this.reservationInclude(),
    });
  }

  private reservationInclude() {
    return {
      meal: true,
      student: {
        select: {
          id: true,
          fullName: true,
          codeMassar: true,
          codeEtudiant: true,
        },
      },
      reservedBy: { select: { id: true, fullName: true, role: true } },
    } satisfies Prisma.MealReservationInclude;
  }

  private createReceiptNumber() {
    const stamp = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, '')
      .slice(0, 14);
    const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `RECU-${stamp}-${suffix}`;
  }

  private async createUniqueTicketCode() {
    for (let i = 0; i < 5; i++) {
      const stamp = new Date()
        .toISOString()
        .replace(/[-:.TZ]/g, '')
        .slice(0, 14);
      const suffix = Math.random().toString(36).slice(2, 10).toUpperCase();
      const code = `TCK-${stamp}-${suffix}`;
      const exists = await this.prisma.mealReservation.findUnique({
        where: { ticketCode: code },
        select: { id: true },
      });
      if (!exists) return code;
    }
    throw new BadRequestException('Impossible de générer ticket');
  }

  private isStudent(user: JwtPayload) {
    return user.role === UserRole.STUDENT;
  }

  private ensureCanManageRestauration(user: JwtPayload) {
    if (
      user.role === UserRole.ADMIN ||
      user.role === UserRole.STAFF ||
      user.role === UserRole.RESTAURATION
    ) {
      return;
    }
    throw new ForbiddenException('Insufficient role permissions');
  }

  private async resolveReservationStudentId(
    studentId: number | undefined,
    user: JwtPayload,
  ) {
    if (this.isStudent(user)) {
      return this.resolveStudentIdForUser(user);
    }

    this.ensureCanManageRestauration(user);
    if (!studentId) throw new BadRequestException('studentId is required');
    await this.ensureStudentExists(studentId);
    return studentId;
  }

  private async ensureCanAccessStudent(studentId: number, user: JwtPayload) {
    if (!this.isStudent(user)) {
      this.ensureCanManageRestauration(user);
      return;
    }

    const ownStudentId = await this.resolveStudentIdForUser(user);
    if (ownStudentId !== studentId) {
      throw new ForbiddenException('Insufficient role permissions');
    }
  }

  private async resolveStudentIdForUser(user: JwtPayload) {
    const student = await this.prisma.student.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    });
    if (!student) throw new NotFoundException('Profil étudiant introuvable');
    return student.id;
  }

  private async ensureStudentExists(studentId: number) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true },
    });
    if (!student) throw new NotFoundException('Étudiant introuvable');
  }

  private async ensureMealExists(id: number) {
    const meal = await this.prisma.meal.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!meal) throw new NotFoundException('Repas introuvable');
  }

  private async getOrCreateWallet(
    studentId: number,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return client.mealWallet.upsert({
      where: { studentId },
      update: {},
      create: { studentId, balance: 0 },
    });
  }

  private invalidateStudentViews(studentId?: number) {
    this.reservationsCache.invalidate();
    this.transactionsCache.invalidate();
  }

  private async withStudentReservationLock<T>(
    studentId: number,
    task: () => Promise<T>,
  ): Promise<T> {
    const previous =
      this.studentReservationLocks.get(studentId) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(task);
    const sentinel = run.then(
      () => undefined,
      () => undefined,
    );

    this.studentReservationLocks.set(studentId, sentinel);

    try {
      return await run;
    } finally {
      if (this.studentReservationLocks.get(studentId) === sentinel) {
        this.studentReservationLocks.delete(studentId);
      }
    }
  }
}
