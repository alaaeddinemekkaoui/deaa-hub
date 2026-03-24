import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getHealth: jest.fn().mockReturnValue({
              service: 'DEAA-Hub API',
              status: 'ok',
              timestamp: '2026-03-24T00:00:00.000Z',
            }),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return the health payload', () => {
      expect(appController.getHealth()).toEqual({
        service: 'DEAA-Hub API',
        status: 'ok',
        timestamp: '2026-03-24T00:00:00.000Z',
      });
    });
  });
});
