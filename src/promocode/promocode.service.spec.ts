import mongoose from 'mongoose';
import * as Mock from 'mockingoose';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';

import { PromocodeService } from './promocode.service';
import { PromocodeSchema } from './schema/promocode.schema';
import e from 'express';
import { HttpException, NotFoundException } from '@nestjs/common';

const promocodeModel = getModelToken('Promocode');

const PromocodeTestModel = mongoose.model('Promocode', PromocodeSchema);

const promocodeDoc = {
  _id: '507f191e810c19729de860ea',
  code: 'PROMO',
  value: 10,
};

const formatMongo = (doc) => {
  return JSON.parse(JSON.stringify(doc));
}

describe('PromocodeService', () => {
  let service: PromocodeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromocodeService,
        {
          provide: promocodeModel,
          useValue: PromocodeTestModel,
        },
      ],
    }).compile();

    service = module.get<PromocodeService>(PromocodeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPromocode', () => {
    it('should return a promocode', async () => {
      // Given
      Mock(PromocodeTestModel).toReturn(promocodeDoc, 'findOne');

      // When
      const promocode = await service.getPromocode('PROMO');

      // Then
      expect(formatMongo(promocode)).toEqual(promocodeDoc);
    });

    it('should find no promocode on findOne promocode', async () => {
      // Given
      Mock(PromocodeTestModel).toReturn(null, 'findOne');

      // When
      // Then
      await expect(service.getPromocode('PROMO')).rejects.toThrow(NotFoundException);
    });

    it('should find throw HttpException on findOne', async () => {
      // Given
      Mock(PromocodeTestModel).toReturn(new Error('Cannot findOne'), 'findOne');

      // When
      // Then
      await expect(service.getPromocode('PROMO')).rejects.toThrow(HttpException);
    });
  });
});
