import { of } from 'rxjs';
import { Test, TestingModule } from '@nestjs/testing';

import { PromocodeService } from './promocode.service';
import { PromocodeController } from './promocode.controller';

const promocodeServiceMock = {
  getPromocode: jest.fn(),
};

describe('PromocodeController', () => {
  let controller: PromocodeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromocodeController],
      providers: [PromocodeService],
    })
      .overrideProvider(PromocodeService)
      .useValue(promocodeServiceMock)
      .compile();

    controller = module.get<PromocodeController>(PromocodeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('Should call getPromocode()', async() => {
    // Given
    jest.spyOn(promocodeServiceMock, 'getPromocode').mockReturnValueOnce(of({
      code: 'CODE',
      value: 10,
    }));
    // When
    await controller.getPromocode('code');
    // Then
    expect(promocodeServiceMock.getPromocode).toHaveBeenCalledTimes(1);
    expect(promocodeServiceMock.getPromocode).toHaveBeenCalledWith('code');
  });
});
