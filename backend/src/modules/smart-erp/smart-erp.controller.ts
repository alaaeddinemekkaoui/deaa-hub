import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/types/role.type';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { SmartErpService } from './smart-erp.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class SmartErpController {
  constructor(private readonly erp: SmartErpService) {}

  @Get('housing/requests')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.INTERNAT, UserRole.STUDENT)
  listHousingRequests(@Query() query: Record<string, string>, @CurrentUser() user: JwtPayload) {
    return this.erp.listHousingRequests(query, user);
  }

  @Post('housing/requests')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.INTERNAT, UserRole.STUDENT)
  createHousingRequest(@Body() body: Record<string, unknown>, @CurrentUser() user: JwtPayload) {
    return this.erp.createHousingRequest(body, user);
  }

  @Patch('housing/requests/:id/status')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.INTERNAT)
  updateHousingStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.erp.updateHousingStatus(id, body, user);
  }

  @Get('housing/requests/:id/pdf')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.INTERNAT, UserRole.STUDENT)
  async exportHousingRequest(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.erp.exportHousingRequestPdf(id, user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    return new StreamableFile(file.buffer);
  }

  @Get('housing/quotas')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.INTERNAT)
  listHousingQuotas(@Query() query: Record<string, string>) {
    return this.erp.listHousingQuotas(query);
  }

  @Post('housing/quotas')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.INTERNAT)
  upsertHousingQuota(@Body() body: Record<string, unknown>) {
    return this.erp.upsertHousingQuota(body);
  }

  @Get('housing/stats')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.INTERNAT)
  housingStats(@Query() query: Record<string, string>) {
    return this.erp.housingStats(query);
  }

  @Get('document-requests')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.STUDENT, UserRole.INSPECTOR)
  listDocumentRequests(@Query() query: Record<string, string>, @CurrentUser() user: JwtPayload) {
    return this.erp.listDocumentRequests(query, user);
  }

  @Post('document-requests')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.STUDENT, UserRole.INSPECTOR)
  createDocumentRequest(@Body() body: Record<string, unknown>, @CurrentUser() user: JwtPayload) {
    return this.erp.createDocumentRequest(body, user);
  }

  @Patch('document-requests/:id/status')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.INSPECTOR)
  updateDocumentRequestStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.erp.updateDocumentRequestStatus(id, body, user);
  }

  @Post('document-requests/:id/generate')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.INSPECTOR)
  generateDocumentRequest(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    return this.erp.generateDocumentRequest(id, user);
  }

  @Get('student-history/:studentId')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.STUDENT, UserRole.TEACHER, UserRole.INSPECTOR)
  studentHistory(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query() query: Record<string, string>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.erp.studentHistory(studentId, query, user);
  }

  @Get('maquettes')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.TEACHER, UserRole.INSPECTOR)
  listMaquettes(@Query() query: Record<string, string>) {
    return this.erp.listMaquettes(query);
  }

  @Patch('maquettes/modules/:id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.INSPECTOR)
  updateMaquetteModule(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>) {
    return this.erp.updateMaquetteModule(id, body);
  }

  @Get('maquettes/pdf')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.TEACHER, UserRole.INSPECTOR)
  async exportMaquettePdf(@Query() query: Record<string, string>, @Res({ passthrough: true }) res: Response) {
    const file = await this.erp.exportMaquettePdf(query);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    return new StreamableFile(file.buffer);
  }

  @Get('validation-parameters')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.INSPECTOR)
  listValidationParameters(@Query() query: Record<string, string>) {
    return this.erp.listValidationParameters(query);
  }

  @Post('validation-parameters')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.INSPECTOR)
  upsertValidationParameter(@Body() body: Record<string, unknown>, @CurrentUser() user: JwtPayload) {
    return this.erp.upsertValidationParameter(body, user);
  }

  @Get('apesa/orientations')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.STUDENT, UserRole.INSPECTOR)
  listApesaOrientations(@Query() query: Record<string, string>) {
    return this.erp.listApesaOrientations(query);
  }

  @Post('apesa/orientations')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.INSPECTOR)
  upsertApesaOrientation(@Body() body: Record<string, unknown>) {
    return this.erp.upsertApesaOrientation(body);
  }

  @Get('apesa/choices')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.STUDENT, UserRole.INSPECTOR)
  listApesaChoices(@Query() query: Record<string, string>, @CurrentUser() user: JwtPayload) {
    return this.erp.listApesaChoices(query, user);
  }

  @Post('apesa/choices')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.STUDENT, UserRole.INSPECTOR)
  submitApesaChoices(@Body() body: Record<string, unknown>, @CurrentUser() user: JwtPayload) {
    return this.erp.submitApesaChoices(body, user);
  }

  @Post('apesa/assignments')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.INSPECTOR)
  assignApesaOrientation(@Body() body: Record<string, unknown>, @CurrentUser() user: JwtPayload) {
    return this.erp.assignApesaOrientation(body, user);
  }

  @Get('apesa/students')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.INSPECTOR)
  listApesaStudents(@Query() query: Record<string, string>) {
    return this.erp.listApesaStudents(query);
  }

  @Get('online-exams')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.TEACHER, UserRole.STUDENT, UserRole.INSPECTOR)
  listOnlineExams(@Query() query: Record<string, string>, @CurrentUser() user: JwtPayload) {
    return this.erp.listOnlineExams(query, user);
  }

  @Post('online-exams')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.TEACHER, UserRole.INSPECTOR)
  createOnlineExam(@Body() body: Record<string, unknown>, @CurrentUser() user: JwtPayload) {
    return this.erp.createOnlineExam(body, user);
  }

  @Post('online-exams/:id/questions')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.TEACHER, UserRole.INSPECTOR)
  addOnlineExamQuestion(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>) {
    return this.erp.addOnlineExamQuestion(id, body);
  }

  @Post('online-exams/:id/attempts')
  @Roles(UserRole.STUDENT)
  startExamAttempt(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    return this.erp.startExamAttempt(id, user);
  }

  @Get('student-lists')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.TEACHER, UserRole.INSPECTOR)
  generateStudentList(@Query() query: Record<string, string>) {
    return this.erp.generateStudentList(query);
  }

  @Get('student-lists/pdf')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.TEACHER, UserRole.INSPECTOR)
  async exportStudentListPdf(@Query() query: Record<string, string>, @Res({ passthrough: true }) res: Response) {
    const file = await this.erp.exportStudentListPdf(query);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    return new StreamableFile(file.buffer);
  }

  @Get('workload')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.TEACHER, UserRole.INSPECTOR)
  workloadDashboard(@Query() query: Record<string, string>) {
    return this.erp.workloadDashboard(query);
  }
}
