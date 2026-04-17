import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from './strategies/jwt.strategy';
import { UsersService } from '../modules/users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() payload: JwtPayload) {
    const user = await this.usersService.findOne(payload.sub);
    const departments = await this.usersService.getUserDepartments(payload.sub);
    return {
      ...payload,
      fullName: user?.fullName,
      departments,
    };
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() payload: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.update(payload.sub, dto);
  }
}
