import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { UserController } from './user.controller';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateUserDto } from './dto/create-user.dto';
import { DeleteUserDto } from './dto/delete-user.dto';
import { CountryEnum } from './schema/user.schema';
import { verify } from 'crypto';

const userServiceProviderMock = {
  findAll: jest.fn(),
  findOneById: jest.fn(),
  createUser: jest.fn(),
  deleteUser: jest.fn(),
  verifyUser: jest.fn(),
  resetPassword: jest.fn(),
  changePassword: jest.fn(),
}

const jwtAuthGuardMock = {
  canActivate: jest.fn(),
}

describe('UserController', () => {
  let controller: UserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [UserService, JwtAuthGuard],
    })
      .overrideProvider(JwtAuthGuard)
      .useValue(jwtAuthGuardMock)
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
      },
      country: CountryEnum.FR,
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

  it('should call service verifyUser()', () => {
    // Given
    const verify = 'verify';

    // When
    controller.verifyUser(verify);

    // Then
    expect(userServiceProviderMock.verifyUser).toHaveBeenCalledTimes(1);
    expect(userServiceProviderMock.verifyUser).toHaveBeenLastCalledWith(verify);
  });

  it('should call service resetPassword()', () => {
    // Given
    const resetPasswordDto = { email: 'email' };

    // When
    controller.resetPassword(resetPasswordDto);

    // Then
    expect(userServiceProviderMock.resetPassword).toHaveBeenCalledTimes(1);
    expect(userServiceProviderMock.resetPassword).toHaveBeenLastCalledWith(resetPasswordDto.email);
  });

  it('should call service changePassword()', () => {
    // Given
    const changePasswordDto = { resetToken: 'resetToken', password: 'password' };

    // When
    controller.changePassword(changePasswordDto);

    // Then
    expect(userServiceProviderMock.changePassword).toHaveBeenCalledTimes(1);
    expect(userServiceProviderMock.changePassword).toHaveBeenLastCalledWith(
      changePasswordDto.resetToken,
      changePasswordDto.password,

    );
  });

  // it('should call service findOneById()', () => {
  //   // Given
  //   const userId = 'userId';
  //   // When
  //   controller.getUserById(userId);

  //   // Then
  //   expect(userServiceProviderMock.findOneById).toHaveBeenCalledTimes(1);
  //   expect(userServiceProviderMock.findOneById).toHaveBeenLastCalledWith(userId);
  // });
});
