import * as Mock from 'mockingoose';
import * as mongoose from 'mongoose';
import { HttpException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MailerService } from '@nestjs-modules/mailer';

import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CountryEnum, UserSchema } from './schema/user.schema';
import { verify } from 'crypto';
import { NotFoundError } from 'rxjs';

const userModel = getModelToken('User');

const UserTestModel = mongoose.model('User', UserSchema);

const formatMongo = (doc) => {
  return JSON.parse(JSON.stringify(doc));
}

const userDoc = {
  _id: '507f191e810c19729de860ea',
  email: 'captain.nemo@nautilus.sub',
  password: 'aronnax',
  availableTreasures: 0,
  holdTreasures: 0,
  country: 'fr',
  verify: 'verify',
}

const mailerServiceMock = {
  sendMail: jest.fn(),
}

const userDeleteDoc = {
  id: '507f191e810c19729de860ea',
}

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    Mock.resetAll();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: userModel,
          useValue: UserTestModel,
        },
        {
          provide: MailerService,
          useValue: mailerServiceMock,
        }
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Create user', () => {
    
    const userDto: CreateUserDto = {
      email: 'captain.nemo@nautilus.sub',
      password: 'aronnax',
      location: {
        type: 'Point',
        coordinates: [-123.1264691, 49.2290631],
      },
      country: CountryEnum.FR,
    };

    beforeEach(() => {
      Mock.resetAll();
    });

    it('should create a user', async() => {
      // Given
      Mock(UserTestModel).toReturn(userDoc, 'save');
      
      // When
      const result = await service.createUser(userDto);
  
      // Then
      expect(mailerServiceMock.sendMail).toHaveBeenCalled();
      expect(formatMongo(result)).toEqual(userDoc);
    });

    it('should throw an HttpException', async() => {
      // Given
      Mock(UserTestModel).toReturn(new Error('Cannot save'), 'save');
      // When
      // Then
      await expect(service.createUser(userDto)).rejects.toThrow(HttpException); 
    })
  })

  describe('Find all user', () => {
    it('should find all user', async() => {
      // Given
      const valueReturn = [userDoc];
      Mock(UserTestModel).toReturn(valueReturn, 'find');
  
      // When
      const result = await service.findAll();
  
      // Then
      expect(formatMongo(result)).toEqual(valueReturn);
    });

    it('should throw an HttpException on find all user', async() => {
      // Given
      Mock(UserTestModel).toReturn(new Error('Cannot find all'), 'find');
  
      // When
      // Then
      await expect(service.findAll()).rejects.toThrow(HttpException);
    });
  })

  describe('findOne user', ()=> {
    it('should findOne user', async() => {
      // Given
      Mock(UserTestModel).toReturn(userDoc, 'findOne');
  
      // When
      const result = await service.findOneByEmail('captain.nemo@nautilus.sub');
  
      //then
      expect(formatMongo(result)).toEqual(userDoc);
    });

    it('should throw HttpException on findOne user', async() => {
      // Given
      Mock(UserTestModel).toReturn(new Error('Cannot findOne user'), 'findOne');

      // When
      // Then
      await expect(service.findOneByEmail('nemo@nautilus.sub')).rejects.toThrow(HttpException);
    });

    it('should find no user on findOne user', async() => {
      // Given
      Mock(UserTestModel).toReturn(null, 'findOne');

      // When
      // Then
      expect(await service.findOneByEmail('nemo@nautilus.sub')).toBeNull();
    });
  })

  describe('findOneAndDelete user', () => {
    it('should findOneAndDelete user', async() => {
      // Given
      Mock(UserTestModel).toReturn(userDoc, 'findOneAndDelete');
  
      // When
      const result = await service.deleteUser({ id: 'userId' });
  
      // Then
      expect(formatMongo(result)).toEqual(userDoc);
    });

    it('should throw HttpException on findOneAndDelete user', async() => {
      // Given
      Mock(UserTestModel).toReturn(new Error('Cannot findOneAndDelete'), 'findOneAndDelete');

      // When
      // Then
      await expect(service.deleteUser(userDeleteDoc)).rejects.toThrow(HttpException);
    });
  });

  describe('verify user', () => {
    it('should verify user', async() => {
      // Given
      const userVerified = {
       ...userDoc,
        verify: null
      }
      Mock(UserTestModel).toReturn({ userDoc }, 'findOne');
      Mock(UserTestModel).toReturn(userVerified, 'findOneAndUpdate');

      // When
      const result = await service.verifyUser('verify');
      // Then
      expect(result.verify).toEqual(userVerified.verify);
    });

    it('should find no user on verify', async() => {
      // Given
      Mock(UserTestModel).toReturn(null, 'findOne');
      // When
      // Then
      await expect(service.verifyUser('nemo')).rejects.toThrow(NotFoundException);
    });

    it('should throw HttpException on findOne', async() => {
      // Given
      Mock(UserTestModel).toReturn(new Error('cannot findOne'), 'findOne');
      // When
      // Then
      await expect(service.verifyUser('nemo')).rejects.toThrow(HttpException);
    });
  });
});
