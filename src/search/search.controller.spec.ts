import { Test, TestingModule } from '@nestjs/testing';
import { last } from 'rxjs';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

describe('SearchController', () => {
  let controller: SearchController;

  const searchServiceMock = {
    getCardsNearMe: jest.fn(),
    findCards: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [SearchService]
    })
      .overrideProvider(SearchService)
      .useValue(searchServiceMock)
      .compile();

    controller = module.get<SearchController>(SearchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('Should call getCardNearMe()', async() => {
    const lat = '10.111';
    const lng = '10.111';
    const distance = '10000';
    const country = 'fr';
    const userId = 'userId';

    await controller.searchNearMe(lat, lng, distance, country, userId);

    expect(searchServiceMock.getCardsNearMe).toHaveBeenCalledTimes(1);
    expect(searchServiceMock.getCardsNearMe).toHaveBeenCalledWith(lat, lng, distance, country, userId);
  });

  it('Should call findCards()', async() => {
    const lat = '10.111';
    const lng = '10.111';
    const country = 'fr';
    const name = 'Cut down';
    const type = 'instant';
    const set = 'NEO';

    await controller.searchCardByCritera(lat, lng, country, name, type, set);

    expect(searchServiceMock.findCards).toHaveBeenCalledTimes(1);
    expect(searchServiceMock.findCards).toHaveBeenCalledWith(lat, lng, country, name, type, set);
  });
});
