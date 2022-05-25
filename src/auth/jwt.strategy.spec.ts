import { ExtractJwt } from "passport-jwt";
import { JwtStrategy } from "./jwt.strategy";

// jest.mock('passport-jwt', () => ({
//   ...jest.requireActual('passport-jwt') as any,
//   ExtractJwt: {
//     fromAuthHeaderAsBearerToken: jest.fn(),
//   },
// }))

describe('Jwt Strategy', () => {
  let jwtStrategy;
  const JWT_SECRET = 'JWT_SECRET_VALUE';

  beforeEach(() => {
    jest.resetAllMocks();
    jest.resetAllMocks();
    process.env.JWT_SECRET = JWT_SECRET;

    // extractJwtMock = jest.spyOn(ExtractJwt, 'fromAuthHeaderAsBearerToken');
    // extractJwtMock.mockReturnValueOnce(() => null);

    jwtStrategy = new JwtStrategy();
  });

  it('Should be defined', () => {
    expect(jwtStrategy).toBeDefined();
  });

  describe('getStrategy', () => {
    it('Should return stategy params', () => {
      const result = JwtStrategy['getStrategy']();

      expect(result).toStrictEqual({
        jwtFromRequest: expect.any(Function),
        ignoreExpiration: false,
        secretOrKey: JWT_SECRET,
      })
    });
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
})