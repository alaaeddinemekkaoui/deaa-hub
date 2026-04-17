import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';

@Controller('messaging')
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  // ─── Groups ────────────────────────────────────────────────────────────────

  @Get('groups')
  listGroups(@CurrentUser() user: JwtPayload) {
    return this.messagingService.listGroups(user);
  }

  @Post('groups')
  createGroup(@Body() dto: CreateGroupDto, @CurrentUser() user: JwtPayload) {
    return this.messagingService.createGroup(dto, user);
  }

  @Get('groups/:id/members')
  getGroupMembers(@Param('id', ParseIntPipe) id: number) {
    return this.messagingService.getGroupMembers(id);
  }

  @Post('groups/:id/members/:userId')
  addMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.messagingService.addGroupMember(id, userId, user);
  }

  @Delete('groups/:id/members/:userId')
  removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.messagingService.removeGroupMember(id, userId, user);
  }

  @Patch('groups/:id/members/:userId/can-send')
  setCanSend(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body('canSend') canSend: boolean,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.messagingService.setMemberCanSend(id, userId, canSend, user);
  }

  // ─── Messages ──────────────────────────────────────────────────────────────

  @Get('inbox')
  getInbox(@CurrentUser() user: JwtPayload) {
    return this.messagingService.getInbox(user);
  }

  @Post('send')
  send(@Body() dto: SendMessageDto, @CurrentUser() user: JwtPayload) {
    return this.messagingService.sendMessage(dto, user);
  }

  @Get('conversation/:userId')
  getConversation(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('limit') limit: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.messagingService.getConversation(userId, user, Number(limit) || 50);
  }

  @Get('groups/:id/messages')
  getGroupMessages(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.messagingService.getGroupMessages(id, user, Number(limit) || 50);
  }
}
