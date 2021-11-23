import { scryptSync, randomBytes } from 'crypto';
import { mocked } from 'ts-jest/utils';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';

jest.mock('crypto', () => ({
  ...(jest.requireActual('crypto') as any),
  scryptSync: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const userDoc = {
    _id: '507f191e810c19729de860ea',
    email: 'captain.nemo@nautilus.sub',
    password: 'aronnax',
  };

  const userServiceMock = {
    createUser: jest.fn(),
    findAll: jest.fn(),
    findOneByEmail: jest.fn(),
  };

  const jwtServiceMock = {
    sign: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, UserService, JwtService],
    
    })
    .overrideProvider(UserService)
    .useValue(userServiceMock)
    .overrideProvider(JwtService)
    .useValue(jwtServiceMock)
    .compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    const email = 'toto@toto.com';
    const pass = 'secret';
    const user = {
      _id: 123456,
      email,
      password: pass,
      salt: 'willNotFindIt',
    }; 

    beforeEach(() => {
      jest.resetAllMocks();
      jest.restoreAllMocks();
    });
    it('should call uservice findOneByEmail', async () => {
      // WHEN
      await service['validateUser'](email, pass);

      // THEN
      expect(userServiceMock.findOneByEmail).toHaveBeenCalledTimes(1);
      expect(userServiceMock.findOneByEmail).toHaveBeenCalledWith(email);
    });

    it('should call verifyPassword if a user is found within mongo', async () => {
      // GIVEN
      userServiceMock.findOneByEmail.mockResolvedValueOnce(user);
      service['verifyPassword'] = jest.fn().mockResolvedValueOnce(true);

      // WHEN
      await service['validateUser'](email, pass);

      // THEN
      expect(service['verifyPassword']).toHaveBeenCalledTimes(1);
      expect(service['verifyPassword']).toHaveBeenCalledWith(pass, user.salt, user.password);
    });

    it("should return the user's id and email if his password is verified", async () => {
      // GIVEN
      userServiceMock.findOneByEmail.mockResolvedValueOnce(user);
      service['verifyPassword'] = jest.fn().mockResolvedValueOnce(true);

      // WHEN
      const result = await service['validateUser'](email, pass);

      // THEN
      expect(result).toEqual({
        _id: user._id,
        email: user.email,
      });
    });

    it("should return null if the user'password is not verified", async () => {
      // GIVEN
      userServiceMock.findOneByEmail.mockResolvedValueOnce(user);
      service['verifyPassword'] = jest.fn().mockReturnValueOnce(false);

      // WHEN
      const result = await service['validateUser'](email, pass);

      // THEN
      expect(result).toEqual(null);
    });
  });

  describe('verifyPassword', () => {
    const password = "secret";
    const salt = randomBytes(16).toString('hex');;
    const hash = "b1e72b7a";
    let scryptSyncMock;

    beforeEach(() => {
      jest.resetAllMocks();
      jest.restoreAllMocks();
      scryptSyncMock = mocked(scryptSync);
    })

    it('should call scryptSync', () => {
      // GIVEN
      scryptSyncMock.mockReturnValueOnce(Buffer.from('toto', 'base64'));

      // WHEN
      service['verifyPassword'](password, salt, hash);

      // THEN
      expect(scryptSyncMock).toHaveBeenCalledTimes(1);
    })

    it('should return true if the password is verified', async () => {
      // GIVEN
      scryptSyncMock.mockReturnValueOnce(Buffer.from('secret', 'base64'));

      // WHEN
      const result = service['verifyPassword'](password, salt, hash);

      // // THEN
      expect(result).toBe(true);
    });

    it('should return false if the password is not verified', async () => {
      // GIVEN
      scryptSyncMock.mockReturnValueOnce(Buffer.from('shut', 'base64'));

      // WHEN
      const result = service['verifyPassword'](password, salt, hash);

      // // THEN
      expect(result).toBe(false);
    });
  });

  describe('login', () => {
    const user = {
      _id: 123456,
      email: 'trotro@trotro.com'
    };

    beforeEach(() => {
      jest.resetAllMocks();
      jest.restoreAllMocks();
    });

    it('should call validateUser', async () => {
      // GIVEN
      service['validateUser'] = jest.fn().mockResolvedValueOnce(user);

      // WHEN
      await service.login(userDoc);

      // THEN
      expect(service['validateUser']).toHaveBeenCalledTimes(1);
      expect(service['validateUser']).toHaveBeenCalledWith(userDoc.email, userDoc.password);
    });

    it('should throw an error if the user is not validated', async () => {
      // GIVEN
      service['validateUser'] = jest.fn().mockResolvedValueOnce(null)

      // WHEN
      // THEN
      await expect(service.login(userDoc)).rejects.toThrow(UnauthorizedException); 
    });

    it('should call jwtService sign function', async () => {
      // GIVEN
      service['validateUser'] = jest.fn().mockResolvedValueOnce(user);

      // WHEN
      await service.login(userDoc);

      // THEN
      expect(jwtServiceMock.sign).toHaveBeenCalledTimes(1);
      expect(jwtServiceMock.sign).toHaveBeenCalledWith({ sub: 123456});
    });

    it('should return an object with an access token', async () => {
      // GIVEN
      service['validateUser'] = jest.fn().mockResolvedValueOnce(user);
      jwtServiceMock.sign.mockReturnValueOnce('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');

      // WHEN
      const result = await service.login(userDoc);

      // THEN
      expect(result).toEqual({ access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'});
    });
  });
});
