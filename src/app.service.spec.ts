import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

describe('AppService', () => {
  let service: AppService;
  const configServiceMock = {
    getOrThrow: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    configServiceMock.getOrThrow.mockReturnValue(3000);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    })
      .compile();

    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHello', () => {

    it('should return healthcheck message', async() => {
      // Given
      // When
      // Then
      expect(service.getHealthCheck()).toEqual('App up and running on http://localhost/3000');
      expect(configServiceMock.getOrThrow).toHaveBeenCalledWith('app.port');
    });
  })
});
