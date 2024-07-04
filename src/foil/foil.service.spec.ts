import mongoose from 'mongoose';
import * as Mock from 'mockingoose';
import { HttpException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';

import { FoilService } from './foil.service';
import { FoilSchema } from './schema/foil.schema';

const foilModel = getModelToken('Foil');

const FoilTestModel = mongoose.model('Foil', FoilSchema);

const foilDoc = {
  _id: '507f191e810c19729de860ea',
  treatments: ['foil', 'etched foil', 'foil with bubbles'],
};

describe('FoilService', () => {
  let service: FoilService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoilService,
        {
          provide: foilModel,
          useValue: FoilTestModel,
        },
      ],
    }).compile();

    service = module.get<FoilService>(FoilService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFoils', () => {
    it('should return an array of foil treatments', async () => {
      // Given
      Mock(FoilTestModel).toReturn(foilDoc, 'findOne');

      // When
      const foils = await service.getFoils();
      // Then
      expect(foils).toEqual(foilDoc.treatments);
    });

    it('should throw an HttpException 520', async () => {
      // Given
      Mock(FoilTestModel).toReturn(new Error('Mocked error'), 'findOne');

      // When
      // Then
      await expect(service.getFoils()).rejects.toThrow(HttpException);
    });
  });
});
