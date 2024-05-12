import { of } from 'rxjs';
import mongoose from 'mongoose';
import * as Mock from 'mockingoose';
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { HttpException, HttpService } from "@nestjs/common";

import { SetService } from "./set.service";
import { SetSchema } from './schema/set.schema';

const setModel = getModelToken('Set');

const SetTestModel = mongoose.model('Set', SetSchema);

const mockedHttpService = {
  get: jest.fn(),
};

const formatMongo = (doc) => {
  return JSON.parse(JSON.stringify(doc));
}

const mongoReturnedMock = [{
  "_id": "6640ceaa4ae7f3105c0c4c12",
  name: 'nameMock',
  code: 'codeMock',
  icon_svg_uri: 'icon_svg_uriMock',
}];

describe('SetService', () => {
  let service: SetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetService,
        {
          provide: setModel,
          useValue: SetTestModel,
        },
        {
          provide: HttpService,
          useValue: mockedHttpService,
        }
      ],
    }).compile();

     service = module.get<SetService>(SetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('Should call SetTestModel.find()', async() => {
      // Given
      Mock(SetTestModel).toReturn(mongoReturnedMock, 'find');
      // When
      const result = await service.findAll();
      // Then
      expect(formatMongo(result)).toEqual(mongoReturnedMock);
    });
  
    it('Should fail on SetTestModel.find()', async() => {
      // Given
      Mock(SetTestModel).toReturn(new Error('Mocked error'), 'find');
      // When
      // Then
      await expect(service.findAll()).rejects.toThrow(HttpException);
    });
  });

  describe('getSets', () => {
    afterEach(() => {
      jest.clearAllMocks();
    }); 
    it('Should get sets from scryfall api', async () => {
      // Given

      const expectedResultFromScryfallApi = [
        {
          name: 'nameMock',
          code: 'codeMock',
          icon_svg_uri: 'icon_svg_uriMock',
        },
        {
          name: 'nameMock2',
          code: 'codeMock2',
          icon_svg_uri: 'icon_svg_uriMock2',
        },
      ];
      Mock(SetTestModel).toReturn(mongoReturnedMock, 'find');
      jest.spyOn(mockedHttpService, 'get').mockImplementationOnce(() => of({
        data: {
          data: expectedResultFromScryfallApi,
        },
      }));

      // When
      const result = await service.getSets();
      // Then
      expect(mockedHttpService.get).toHaveBeenCalledTimes(1);
      expect(mockedHttpService.get).toHaveBeenCalledWith('https://api.scryfall.com/sets');
      expect(SetTestModel.insertMany).toHaveBeenCalledTimes(1);
      expect(SetTestModel.insertMany).toHaveBeenCalledWith([
        {
          name: 'nameMock2',
          code: 'codeMock2',
          icon_svg_uri: 'icon_svg_uriMock2',
        },
      ]);
    });

    it('Should throw error when trying to insertMany', async () => {
      // Given

      const expectedResultFromScryfallApi = [
        {
          name: 'nameMock',
          code: 'codeMock',
          icon_svg_uri: 'icon_svg_uriMock',
        },
        {
          name: 'nameMock2',
          code: 'codeMock2',
          icon_svg_uri: 'icon_svg_uriMock2',
        },
      ];
      Mock(SetTestModel).toReturn(mongoReturnedMock, 'find');
      jest.spyOn(mockedHttpService, 'get').mockImplementationOnce(() => of({
        data: {
          data: expectedResultFromScryfallApi,
        },
      }));
      jest.spyOn(SetTestModel, 'insertMany').mockImplementationOnce(() => {
        throw new Error('Mocked error');
      });

      // When
      // Then
      await expect(service.getSets()).rejects.toThrow(HttpException);
    });

    it('Should not insert new sets into the database if there are no new sets', async () => {
      // Given

      const expectedResultFromScryfallApi = [
        {
          name: 'nameMock',
          code: 'codeMock',
          icon_svg_uri: 'icon_svg_uriMock',
        },
      ];
      Mock(SetTestModel).toReturn(mongoReturnedMock, 'find');
      jest.spyOn(mockedHttpService, 'get').mockImplementationOnce(() => of({
        data: {
          data: expectedResultFromScryfallApi,
        },
      }));

      // When
      await service.getSets();

      // Then
      expect(SetTestModel.insertMany).not.toHaveBeenCalled();
    });
  });

});