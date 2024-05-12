import { Test, TestingModule } from '@nestjs/testing';

import { SetService } from './set.service';
import { SetController } from './set.controller';

const setServiceMock = {
  findAll: jest.fn(),
}

describe('SetController', () => {
  let controller: SetController;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SetController],
      providers: [SetService],
    })
      .overrideProvider(SetService)
      .useValue(setServiceMock)
      .compile();

    controller = module.get<SetController>(SetController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('Should call setService.findAll()', async() => {
    // Given
    jest.spyOn(setServiceMock, 'findAll').mockReturnValueOnce([{
      name: 'nameMock',
      code: 'codeMock',
      icon_svg_uri: 'icon_svg_uriMock',
    }]);
    // When
    await controller.getSets();
    
    // Then
    expect(setServiceMock.findAll).toHaveBeenCalledTimes(1);
  });
});
