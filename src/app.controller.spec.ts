import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthService } from './auth/auth.service';
import { LoginDto } from './auth/dto/login.dto';

describe('AppController', () => {
  let appController: AppController;

  const appServiceMock = {
    getHealthCheck: jest.fn(),
  };

  const authServiceMock = {
    login: jest.fn(),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, AuthService],
    })
    .overrideProvider(AppService)
    .useValue(appServiceMock)
    .overrideProvider(AuthService)
    .useValue(authServiceMock)
    .compile();

    appController = app.get<AppController>(AppController);
  });

  describe('getHealthCheck', () => {
    it('should call getHealthCheck function', () => {
      // WHEN
      appController.getHealthCheck();

      //THEN
      expect(appServiceMock.getHealthCheck).toHaveBeenCalledTimes(1);
    });
  });

  describe('login', () => {
    it('should call authServiec login function', async () => {
      // GIVEN
        const user: LoginDto =  {
          email: 'toto@toto.com',
          password: 'secret',
        } ;

      // WHEN
      await appController.login(user);

      // THEN
      expect(authServiceMock.login).toHaveBeenCalledTimes(1);
      expect(authServiceMock.login).toHaveBeenCalledWith(user);
    })
  })
});
