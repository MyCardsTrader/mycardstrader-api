import { of } from 'rxjs';
import { Test, TestingModule } from '@nestjs/testing';

import { FoilService } from './foil.service';
import { FoilController } from './foil.controller';

const foilServiceMock = {
  getFoils: jest.fn(),
}

describe('FoilController', () => {
  let controller: FoilController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FoilController],
      providers: [FoilService],
    })
      .overrideProvider(FoilService)
      .useValue(foilServiceMock)
      .compile();

    controller = module.get<FoilController>(FoilController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('Should call getFoils()', async() => {
    // Given
    jest.spyOn(foilServiceMock, 'getFoils').mockReturnValueOnce(of(['foilMock']));
    // When
    await controller.getFoils();
    // Then
    expect(foilServiceMock.getFoils).toHaveBeenCalledTimes(1);
  });
});
