import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/types/role.type';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { RestaurationService } from './restauration.service';
import { CreateMealDto } from './dto/create-meal.dto';
import { UpdateMealDto } from './dto/update-meal.dto';
import {
  AutoConsumeTicketDto,
  ConsumeTicketDto,
  IssueTicketDto,
  ReserveMealDto,
  ReserveMealsDto,
} from './dto/reserve-meal.dto';
import { AdjustWalletDto, CreditWalletDto } from './dto/update-wallet.dto';

@Controller('restauration')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RestaurationController {
  constructor(private readonly restaurationService: RestaurationService) {}

  @Get('meals')
  @Roles(
    UserRole.ADMIN,
    UserRole.STAFF,
    UserRole.RESTAURATION,
    UserRole.STUDENT,
  )
  findMeals(
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive = false,
  ) {
    return this.restaurationService.findMeals(includeInactive);
  }

  @Get('students/search')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.RESTAURATION)
  searchStudents(
    @CurrentUser() user: JwtPayload,
    @Query('q') query = '',
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.restaurationService.searchStudents(user, query, parsedLimit);
  }

  @Post('meals')
  @Roles(UserRole.ADMIN)
  createMeal(@Body() dto: CreateMealDto) {
    return this.restaurationService.createMeal(dto);
  }

  @Patch('meals/:id')
  @Roles(UserRole.ADMIN)
  updateMeal(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMealDto,
  ) {
    return this.restaurationService.updateMeal(id, dto);
  }

  @Delete('meals/:id')
  @Roles(UserRole.ADMIN)
  removeMeal(@Param('id', ParseIntPipe) id: number) {
    return this.restaurationService.removeMeal(id);
  }

  @Get('wallets/me')
  @Roles(UserRole.STUDENT)
  myWallet(@CurrentUser() user: JwtPayload) {
    return this.restaurationService.getMyWallet(user);
  }

  @Get('wallets/:studentId')
  @Roles(
    UserRole.ADMIN,
    UserRole.STAFF,
    UserRole.RESTAURATION,
    UserRole.STUDENT,
  )
  wallet(
    @Param('studentId', ParseIntPipe) studentId: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.restaurationService.getWallet(studentId, user);
  }

  @Post('wallets/credit')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.RESTAURATION)
  creditWallet(@Body() dto: CreditWalletDto, @CurrentUser() user: JwtPayload) {
    return this.restaurationService.creditWallet(dto, user);
  }

  @Post('wallets/adjust')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.RESTAURATION)
  adjustWallet(@Body() dto: AdjustWalletDto, @CurrentUser() user: JwtPayload) {
    return this.restaurationService.adjustWallet(dto, user);
  }

  @Post('reservations')
  @Roles(
    UserRole.ADMIN,
    UserRole.STAFF,
    UserRole.RESTAURATION,
    UserRole.STUDENT,
  )
  reserve(@Body() dto: ReserveMealDto, @CurrentUser() user: JwtPayload) {
    return this.restaurationService.reserve(dto, user);
  }

  @Post('reservations/bulk')
  @Roles(
    UserRole.ADMIN,
    UserRole.STAFF,
    UserRole.RESTAURATION,
    UserRole.STUDENT,
  )
  reserveMany(@Body() dto: ReserveMealsDto, @CurrentUser() user: JwtPayload) {
    return this.restaurationService.reserveMany(dto, user);
  }

  @Get('reservations')
  @Roles(
    UserRole.ADMIN,
    UserRole.STAFF,
    UserRole.RESTAURATION,
    UserRole.STUDENT,
  )
  reservations(
    @CurrentUser() user: JwtPayload,
    @Query('studentId') studentId?: string,
  ) {
    const parsedStudentId = studentId ? Number(studentId) : undefined;
    return this.restaurationService.listReservations(user, parsedStudentId);
  }

  @Patch('reservations/:id/cancel')
  @Roles(
    UserRole.ADMIN,
    UserRole.STAFF,
    UserRole.RESTAURATION,
    UserRole.STUDENT,
  )
  cancelReservation(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.restaurationService.cancelReservation(id, user);
  }

  @Get('reservations/:id/receipt')
  @Roles(
    UserRole.ADMIN,
    UserRole.STAFF,
    UserRole.RESTAURATION,
    UserRole.STUDENT,
  )
  receipt(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.restaurationService.getReceipt(id, user);
  }

  @Post('tickets/issue')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.RESTAURATION, UserRole.STUDENT)
  issueTicket(@Body() dto: IssueTicketDto, @CurrentUser() user: JwtPayload) {
    return this.restaurationService.issueTicket(dto, user);
  }

  @Get('tickets/validate/:code')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.RESTAURATION)
  validateTicket(@Param('code') code: string) {
    return this.restaurationService.validateTicket(code);
  }

  @Post('tickets/preview')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.RESTAURATION)
  previewTicket(
    @Body() dto: AutoConsumeTicketDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.restaurationService.previewTicket(dto, user);
  }

  @Post('tickets/consume')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.RESTAURATION)
  consumeTicket(
    @Body() dto: ConsumeTicketDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.restaurationService.consumeTicket(dto, user);
  }

  @Post('tickets/auto-consume')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.RESTAURATION)
  autoConsumeTicket(
    @Body() dto: AutoConsumeTicketDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.restaurationService.autoConsumeTicket(dto, user);
  }

  @Get('transactions')
  @Roles(
    UserRole.ADMIN,
    UserRole.STAFF,
    UserRole.RESTAURATION,
    UserRole.STUDENT,
  )
  transactions(
    @CurrentUser() user: JwtPayload,
    @Query('studentId') studentId?: string,
  ) {
    const parsedStudentId = studentId ? Number(studentId) : undefined;
    return this.restaurationService.listTransactions(user, parsedStudentId);
  }
}
