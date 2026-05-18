import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { UsersService } from '../modules/users/users.service';
import { LoginDto } from './dto/login.dto';
import { RedisService } from '../common/cache/redis.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
  ) {}

  async validateUser(identifier: string, password: string) {
    const user = await this.usersService.findByLoginIdentifier(identifier);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(dto: LoginDto) {
    const identifier = (
      dto.identifier ??
      dto.email ??
      dto.username ??
      ''
    ).trim();
    if (!identifier) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.validateUser(identifier, dto.password);
    const departments = user.departments ?? [];
    const departmentIds = departments.map((d) => d.id);

    const sessionId = randomUUID();
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      departmentIds,
      sid: sessionId,
    };

    if (this.redis.isEnabled) {
      await this.redis.setJson(
        this.redis.sessionKey(sessionId),
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          createdAt: new Date().toISOString(),
        },
        this.sessionTtlSeconds(),
      );
    }

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        departments,
      },
    };
  }

  private sessionTtlSeconds() {
    const raw = process.env.JWT_EXPIRES_IN ?? '1d';
    const match = /^(\d+)([smhd])?$/.exec(raw);
    if (!match) return 24 * 60 * 60;
    const value = Number(match[1]);
    const unit = match[2] ?? 's';
    const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * multipliers[unit as keyof typeof multipliers];
  }
}
