import { Test, TestingModule } from '@nestjs/testing';
import { CreateUserDto } from './dto/create-user.dto';
import { DeleteUserDto } from './dto/delete-user.dto';
import { UserController } from './user.controller';
import { UserService } from './user.service';

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
      id: 'monId', 
    };
    // When
    controller.deleteUser(deleteUserDto);

    // Then
    expect(userServiceProviderMock.deleteUser).toHaveBeenCalledTimes(1);
    expect(userServiceProviderMock.deleteUser).toHaveBeenLastCalledWith(deleteUserDto);
  });
});
