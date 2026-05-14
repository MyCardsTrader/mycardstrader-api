import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('Jwt Strategy', () => {
  let jwtStrategy: JwtStrategy;
  const configServiceMock = {
    getOrThrow: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    configServiceMock.getOrThrow.mockReturnValue('JWT_SECRET_VALUE');
    jwtStrategy = new JwtStrategy(configServiceMock as unknown as ConfigService);
  });

  it('Should be defined', () => {
    expect(jwtStrategy).toBeDefined();
    expect(configServiceMock.getOrThrow).toHaveBeenCalledWith('auth.jwtSecret');
  });

  it('Should validate', async () => {
    const result = await jwtStrategy.validate({
      sub: 'subValue',
    });

    expect(result).toStrictEqual({
      userId: 'subValue',
    })
  });

  it('Should validate null', async () => {
    const result = await jwtStrategy.validate({
      sub: null,
    });

    expect(result).toStrictEqual({
      userId: null,
    })
  });

  it('Should not validate', async () => {
    expect(jwtStrategy.validate(null)).rejects.toThrow();
  });
});
