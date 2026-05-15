import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;

  const aggregate = jest.fn();
  const userModelMock = { aggregate };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: getModelToken('User'),
          useValue: userModelMock,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getGeoNearStage', () => {
    it('builds a geoNear stage with default distance', () => {
      expect(service.getGeoNearStage('48.8566', '2.3522')).toEqual({
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [48.8566, 2.3522],
          },
          query: {},
          distanceMultiplier: 0.001,
          distanceField: 'distance',
          maxDistance: 10000,
          spherical: true,
        },
      });
    });

    it('adds every optional filter to the query', () => {
      expect(
        service.getGeoNearStage(
          '48.8566',
          '2.3522',
          '25',
          'FR',
          'user-1',
          'Black Lotus',
          'Artifact',
          'LEA',
        ),
      ).toEqual({
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [48.8566, 2.3522],
          },
          query: {
            country: 'FR',
            name: 'Black Lotus',
            type: 'Artifact',
            set: 'LEA',
            _id: { $ne: 'user-1' },
          },
          distanceMultiplier: 0.001,
          distanceField: 'distance',
          maxDistance: 25000,
          spherical: true,
        },
      });
    });
  });

  describe('getCardsNearMe', () => {
    it('returns aggregate results', async () => {
      const cards = [{ cardName: 'Birds of Paradise' }];
      aggregate.mockResolvedValueOnce(cards);

      await expect(
        service.getCardsNearMe('48.8566', '2.3522', '10', 'FR', 'user-1'),
      ).resolves.toEqual(cards);

      expect(aggregate).toHaveBeenCalledTimes(1);
    });

    it('wraps aggregate errors in HttpException', async () => {
      aggregate.mockRejectedValueOnce(new Error('aggregate failed'));

      await expect(
        service.getCardsNearMe('48.8566', '2.3522', '10', 'FR'),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('findCards', () => {
    it('runs the aggregate pipeline', async () => {
      aggregate.mockResolvedValueOnce([{ cardName: 'Mox Emerald' }]);

      await expect(
        service.findCards('48.8566', '2.3522', 'FR', 'Mox Emerald', 'Artifact', 'LEA'),
      ).resolves.toBeUndefined();

      expect(aggregate).toHaveBeenCalledTimes(1);
    });

    it('wraps aggregate errors in HttpException', async () => {
      aggregate.mockRejectedValueOnce(new Error('aggregate failed'));

      await expect(
        service.findCards('48.8566', '2.3522', 'FR', 'Mox Emerald', 'Artifact', 'LEA'),
      ).rejects.toThrow(HttpException);
    });
  });
});
