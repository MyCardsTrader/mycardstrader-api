import { AppService } from './app.service';
import { Test, TestingModule } from '@nestjs/testing';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
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
      expect(service.getHealthCheck()).toEqual(`App up and running on http://localhost/${process.env.PORT}`);
    });
  })
});
