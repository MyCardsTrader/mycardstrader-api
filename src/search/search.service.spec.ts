import * as mongoose from 'mongoose';
import { SearchService } from './search.service';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { UserSchema } from '../user/schema/user.schema';

const userModel = getModelToken('User');

const UserTestModel = mongoose.model('User', UserSchema);

describe('SearchService', () => {
  let service: SearchService;

  

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: userModel,
          useValue: UserTestModel,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
