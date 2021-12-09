import { UserService } from './user.service';
import { UserController } from './user.controller';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateUserDto } from './dto/create-user.dto';
import { DeleteUserDto } from './dto/delete-user.dto';

const userServiceProviderMock = {
  findAll: jest.fn(),
  createUser: jest.fn(),
  deleteUser: jest.fn(),
}

describe('UserController', () => {
  let controller: UserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [UserService],
    })
      .overrideProvider(UserService)
      .useValue(userServiceProviderMock)
      .compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service findAll()', () => {
    // When
    controller.getUsers();

    // Then
    expect(userServiceProviderMock.findAll).toHaveBeenCalledTimes(1);
  });

  it('should call service createUser()', () => {
    // Given
    const userDto: CreateUserDto = {
      email: 'captain.nemo@nautilus.sub',
      password: 'aronnax',
      location: {
        type: 'Point',
        coordinates: [-123.1264691, 49.2290631],
      }
    };
    // When
    controller.createUser(userDto);

    // Then
    expect(userServiceProviderMock.createUser).toHaveBeenCalledTimes(1);
    expect(userServiceProviderMock.createUser).toHaveBeenLastCalledWith(userDto);
  });

  it('should call service deleteUser()', () => {
    // Given
    const deleteUserDto: DeleteUserDto = {
      id: 'userId', 
    };
    // When
    controller.deleteUser(deleteUserDto);

    // Then
    expect(userServiceProviderMock.deleteUser).toHaveBeenCalledTimes(1);
    expect(userServiceProviderMock.deleteUser).toHaveBeenLastCalledWith(deleteUserDto);
  });
});
