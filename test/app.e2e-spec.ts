import request from 'supertest';
import { INestApplication, NotFoundException, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule, PassportStrategy } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { AuthService } from '../src/auth/auth.service';
import { JwtAuthGuard } from '../src/auth/jwt.guard';
import { UserController } from '../src/user/user.controller';
import { UserService } from '../src/user/user.service';
import { CardController } from '../src/card/card.controller';
import { CardService } from '../src/card/card.service';
import { PoliciesGuard } from '../src/casl/policies.guard';
import { CaslService } from '../src/casl/casl.service';
import { CaslAbilityFactory } from '../src/casl/casl-ability.factory';
import { TradeController } from '../src/trade/trade.controller';
import { TradeService } from '../src/trade/trade.service';
import { MessageController } from '../src/message/message.controller';
import { MessageService } from '../src/message/message.service';
import { SearchController } from '../src/search/search.controller';
import { SearchService } from '../src/search/search.service';
import { SetController } from '../src/set/set.controller';
import { SetService } from '../src/set/set.service';
import { FoilController } from '../src/foil/foil.controller';
import { FoilService } from '../src/foil/foil.service';
import { PromocodeController } from '../src/promocode/promocode.controller';
import { PromocodeService } from '../src/promocode/promocode.service';

const TEST_JWT_SECRET = 'test-jwt-secret';

class TestJwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: TEST_JWT_SECRET,
    });
  }

  async validate(payload: { sub: string }) {
    return { userId: payload.sub };
  }
}

describe('HTTP API (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let authHeader: string;
  let originalPoliciesCanActivate: typeof PoliciesGuard.prototype.canActivate;

  const userFixture = {
    _id: 'user-1',
    email: 'captain.nemo@nautilus.sub',
    country: 'fr',
    availableCoins: 10,
    usedPromocode: ['PROMO'],
  };

  const cardFixture = {
    _id: 'card-1',
    user: 'auth-user',
    name: 'Black Lotus',
    oracle_id: 'oracle-1',
    lang: 'en',
    grading: 'NM',
    image_uris: { small: 'small', normal: 'normal' },
    cmc: '0',
    type_line: 'Artifact',
    set: 'lea',
    set_svg: 'set.svg',
    collector_number: '233',
  };

  const tradeFixture = {
    _id: 'trade-1',
    user: 'auth-user',
    trader: 'other-user',
    userCards: ['card-1'],
    traderCards: ['card-2'],
    tradeStatus: 'pending',
  };

  const messageFixture = {
    _id: 'message-1',
    user: 'auth-user',
    trade: '507f191e810c19729de860ea',
    content: 'Hello there',
  };

  const appServiceMock = {
    getHealthCheck: jest.fn(),
  };

  const authServiceMock = {
    login: jest.fn(),
  };

  const userServiceMock = {
    findAll: jest.fn(),
    createUser: jest.fn(),
    deleteUser: jest.fn(),
    verifyUser: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
  };

  const cardServiceMock = {
    findCardByUser: jest.fn(),
    findCardById: jest.fn(),
    createCard: jest.fn(),
    importCards: jest.fn(),
    deleteCard: jest.fn(),
    updateCard: jest.fn(),
  };

  const tradeServiceMock = {
    createTrade: jest.fn(),
    getAllTrades: jest.fn(),
    getTradeById: jest.fn(),
    deleteTrade: jest.fn(),
    updateTrade: jest.fn(),
    acceptTrade: jest.fn(),
    declineTrade: jest.fn(),
    findTradesByUser: jest.fn(),
  };

  const messageServiceMock = {
    createMessage: jest.fn(),
    getMessageById: jest.fn(),
    deleteMessage: jest.fn(),
    getMessagesByTrade: jest.fn(),
  };

  const searchServiceMock = {
    getCardsNearMe: jest.fn(),
    findCards: jest.fn(),
  };

  const setServiceMock = {
    findAll: jest.fn(),
  };

  const foilServiceMock = {
    getFoils: jest.fn(),
  };

  const promocodeServiceMock = {
    getPromocode: jest.fn(),
  };

  const caslServiceMock = {
    checkReadForTradeById: jest.fn(),
    checkDeleteForTrade: jest.fn(),
    checkForCard: jest.fn(),
    checkCreateForMessage: jest.fn(),
    checkReadForMessageByTrade: jest.fn(),
    checkDeleteForMessage: jest.fn(),
  };

  beforeAll(async () => {
    originalPoliciesCanActivate = PoliciesGuard.prototype.canActivate;
    PoliciesGuard.prototype.canActivate = () => true;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: TEST_JWT_SECRET }),
      ],
      controllers: [
        AppController,
        UserController,
        CardController,
        TradeController,
        MessageController,
        SearchController,
        SetController,
        FoilController,
        PromocodeController,
      ],
      providers: [
        { provide: AppService, useValue: appServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: CardService, useValue: cardServiceMock },
        { provide: TradeService, useValue: tradeServiceMock },
        { provide: MessageService, useValue: messageServiceMock },
        { provide: SearchService, useValue: searchServiceMock },
        { provide: SetService, useValue: setServiceMock },
        { provide: FoilService, useValue: foilServiceMock },
        { provide: PromocodeService, useValue: promocodeServiceMock },
        { provide: CaslService, useValue: caslServiceMock },
        { provide: CaslAbilityFactory, useValue: { createForUser: jest.fn(() => ({ can: () => true })) } },
        TestJwtStrategy,
        PoliciesGuard,
      ],
    })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    await app.listen(0, '127.0.0.1');
    server = app.getHttpServer();
    authHeader = `Bearer ${moduleFixture.get(JwtService).sign({ sub: 'auth-user' })}`;
  });

  beforeEach(() => {
    jest.resetAllMocks();

    appServiceMock.getHealthCheck.mockReturnValue('App up and running on http://localhost/3003');

    authServiceMock.login.mockImplementation(({ email, password }) => {
      if (email === 'known@example.com' && password === 'secret') {
        return {
          access_token: 'token',
          expires_in: new Date().toISOString(),
        };
      }
      throw new UnauthorizedException('User not valid');
    });

    userServiceMock.findAll.mockResolvedValue([userFixture]);
    userServiceMock.createUser.mockImplementation((dto) => Promise.resolve({ ...userFixture, ...dto }));
    userServiceMock.deleteUser.mockImplementation(({ id }) => Promise.resolve({ _id: id }));
    userServiceMock.verifyUser.mockImplementation((verify) => {
      if (verify === 'missing-token') {
        throw new NotFoundException('User not found');
      }
      return Promise.resolve({ ...userFixture, verify: null });
    });
    userServiceMock.resetPassword.mockImplementation((email) => {
      if (email === 'missing@example.com') {
        throw new NotFoundException('User not found');
      }
      return Promise.resolve(true);
    });
    userServiceMock.changePassword.mockImplementation((resetToken, password) => {
      if (resetToken === 'missing-token') {
        throw new NotFoundException('User not found');
      }
      return Promise.resolve({ ...userFixture, password });
    });

    cardServiceMock.findCardByUser.mockResolvedValue([cardFixture]);
    cardServiceMock.findCardById.mockImplementation((cardId) => {
      if (cardId === 'missing-card') {
        throw new NotFoundException();
      }
      if (cardId === 'forbidden-card') {
        return Promise.resolve({ ...cardFixture, _id: cardId, user: 'another-user' });
      }
      return Promise.resolve({ ...cardFixture, _id: cardId });
    });
    cardServiceMock.createCard.mockImplementation((dto, userId) => Promise.resolve({ ...cardFixture, ...dto, user: userId }));
    cardServiceMock.importCards.mockImplementation((dto, userId) => Promise.resolve({ imported: dto.cards.length, userId }));
    cardServiceMock.deleteCard.mockImplementation((cardId) => Promise.resolve({ ...cardFixture, _id: cardId }));
    cardServiceMock.updateCard.mockImplementation((cardId, dto) => Promise.resolve({ ...cardFixture, _id: cardId, ...dto }));

    tradeServiceMock.createTrade.mockImplementation((dto, userId) => Promise.resolve({ ...tradeFixture, ...dto, user: userId }));
    tradeServiceMock.getAllTrades.mockResolvedValue([tradeFixture]);
    tradeServiceMock.getTradeById.mockImplementation((tradeId) => {
      if (tradeId === 'missing-trade') {
        throw new NotFoundException();
      }
      if (tradeId === 'forbidden-trade') {
        return Promise.resolve({ ...tradeFixture, _id: tradeId, user: 'another-user', trader: 'third-user' });
      }
      return Promise.resolve({ ...tradeFixture, _id: tradeId });
    });
    tradeServiceMock.deleteTrade.mockImplementation((tradeId) => Promise.resolve({ ...tradeFixture, _id: tradeId }));
    tradeServiceMock.updateTrade.mockImplementation((tradeId, dto) => Promise.resolve({ ...tradeFixture, _id: tradeId, ...dto }));
    tradeServiceMock.acceptTrade.mockImplementation((userId, tradeId, dto) => Promise.resolve({ ...tradeFixture, _id: tradeId, acceptedBy: userId, ...dto }));
    tradeServiceMock.declineTrade.mockImplementation((userId, tradeId, dto) => Promise.resolve({ ...tradeFixture, _id: tradeId, declinedBy: userId, ...dto }));
    tradeServiceMock.findTradesByUser.mockImplementation((userId) => Promise.resolve([{ ...tradeFixture, user: userId }]));

    messageServiceMock.createMessage.mockImplementation((dto, userId) => Promise.resolve({ ...messageFixture, ...dto, user: userId }));
    messageServiceMock.getMessageById.mockImplementation((messageId) => {
      if (messageId === 'forbidden-message') {
        return Promise.resolve({ ...messageFixture, _id: messageId, user: 'another-user' });
      }
      return Promise.resolve({ ...messageFixture, _id: messageId });
    });
    messageServiceMock.deleteMessage.mockImplementation((messageId) => Promise.resolve({ ...messageFixture, _id: messageId }));
    messageServiceMock.getMessagesByTrade.mockImplementation((tradeId) => Promise.resolve([{ ...messageFixture, trade: tradeId }]));

    searchServiceMock.getCardsNearMe.mockResolvedValue([{ cardName: 'Black Lotus', distance: 2 }]);
    searchServiceMock.findCards.mockResolvedValue([{ cardName: 'Mox Sapphire', distance: 5 }]);

    setServiceMock.findAll.mockResolvedValue([{ code: 'lea', name: 'Limited Edition Alpha' }]);
    foilServiceMock.getFoils.mockResolvedValue(['foil', 'nonfoil']);
    promocodeServiceMock.getPromocode.mockImplementation((code) => {
      if (code === 'MISSING') {
        throw new NotFoundException();
      }
      return Promise.resolve({ code, value: 10 });
    });

    caslServiceMock.checkReadForTradeById.mockImplementation((trade, userId) => {
      if (trade.user !== userId && trade.trader !== userId) {
        throw new UnauthorizedException('You cannot access this trade');
      }
      return Promise.resolve(true);
    });
    caslServiceMock.checkDeleteForTrade.mockImplementation((trade, userId) => {
      if (trade.user !== userId) {
        throw new UnauthorizedException('You cannot access this trade');
      }
      return Promise.resolve(true);
    });
    caslServiceMock.checkForCard.mockImplementation((card, userId, action) => {
      if (card.user !== userId) {
        throw new UnauthorizedException(`You cannot ${action} this card`);
      }
      return Promise.resolve(true);
    });
    caslServiceMock.checkCreateForMessage.mockImplementation((trade, userId) => {
      if (trade.user !== userId && trade.trader !== userId) {
        throw new UnauthorizedException('You cannot access this trade');
      }
      return Promise.resolve(true);
    });
    caslServiceMock.checkReadForMessageByTrade.mockImplementation((trade, userId) => {
      if (trade.user !== userId && trade.trader !== userId) {
        throw new UnauthorizedException('You cannot access this trade');
      }
      return Promise.resolve(true);
    });
    caslServiceMock.checkDeleteForMessage.mockImplementation((message, userId) => {
      if (message.user !== userId) {
        throw new UnauthorizedException('You cannot delete this message');
      }
      return Promise.resolve(true);
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    PoliciesGuard.prototype.canActivate = originalPoliciesCanActivate;
  });

  it('GET /health-check returns the API health string', async () => {
    await request(server)
      .get('/health-check')
      .expect(200)
      .expect('App up and running on http://localhost/3003');
  });

  it('POST /auth/login authenticates a user', async () => {
    await request(server)
      .post('/auth/login')
      .send({ email: 'known@example.com', password: 'secret' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.access_token).toBe('token');
      });
  });

  it('POST /auth/login rejects an invalid payload', async () => {
    await request(server)
      .post('/auth/login')
      .send({ password: 'secret' })
      .expect(400);
  });

  it('POST /auth/login rejects invalid credentials', async () => {
    await request(server)
      .post('/auth/login')
      .send({ email: 'wrong@example.com', password: 'secret' })
      .expect(401);
  });

  it('GET /user returns users for an authenticated request', async () => {
    await request(server)
      .get('/user')
      .set('Authorization', authHeader)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
      });
  });

  it('GET /user rejects unauthenticated requests', async () => {
    await request(server)
      .get('/user')
      .expect(401);
  });

  it('POST /user creates a user', async () => {
    await request(server)
      .post('/user')
      .send({
        email: 'nemo@nautilus.sub',
        password: 'aronnax',
        location: {
          type: 'Point',
          coordinates: [-123.1264691, 49.2290631],
        },
        country: 'fr',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.email).toBe('nemo@nautilus.sub');
      });
  });

  it('POST /user validates the payload', async () => {
    await request(server)
      .post('/user')
      .send({ email: 'nemo@nautilus.sub' })
      .expect(400);
  });

  it('DELETE /user deletes a user', async () => {
    await request(server)
      .delete('/user')
      .send({ id: 'user-1' })
      .expect(200)
      .expect(({ body }) => {
        expect(body._id).toBe('user-1');
      });
  });

  it('DELETE /user validates the delete payload', async () => {
    await request(server)
      .delete('/user')
      .send({})
      .expect(400);
  });

  it('GET /user/verify/:verify verifies a user', async () => {
    await request(server)
      .get('/user/verify/valid-token')
      .expect(200)
      .expect(({ body }) => {
        expect(body.verify).toBeNull();
      });
  });

  it('GET /user/verify/:verify returns 404 for an unknown token', async () => {
    await request(server)
      .get('/user/verify/missing-token')
      .expect(404);
  });

  it('POST /user/reset-password triggers a password reset', async () => {
    await request(server)
      .post('/user/reset-password')
      .send({ email: 'captain.nemo@nautilus.sub' })
      .expect(201)
      .expect(({ text }) => {
        expect(text).toBe('true');
      });
  });

  it('POST /user/change-password returns 404 when the reset token is unknown', async () => {
    await request(server)
      .post('/user/change-password')
      .send({ resetToken: 'missing-token', password: 'new-password' })
      .expect(404);
  });

  it('GET /card/user/:userId returns cards for an authenticated request', async () => {
    await request(server)
      .get('/card/user/user-1')
      .set('Authorization', authHeader)
      .expect(200)
      .expect(({ body }) => {
        expect(body[0].name).toBe('Black Lotus');
      });
  });

  it('GET /card/:cardId returns 404 when a card does not exist', async () => {
    await request(server)
      .get('/card/missing-card')
      .set('Authorization', authHeader)
      .expect(404);
  });

  it('POST /card creates a card', async () => {
    await request(server)
      .post('/card')
      .set('Authorization', authHeader)
      .send({
        oracle_id: 'oracle-1',
        cardmarket_id: 1,
        name: 'Black Lotus',
        lang: 'en',
        grading: 'NM',
        image_uris: { small: 'small', normal: 'normal' },
        cmc: '0',
        type_line: 'Artifact',
        set: 'lea',
        set_svg: 'set.svg',
        collector_number: '233',
        colors: [],
        color_identity: [],
      })
      .expect(201);
  });

  it('POST /card validates the create card payload', async () => {
    await request(server)
      .post('/card')
      .set('Authorization', authHeader)
      .send({ name: 'Black Lotus' })
      .expect(400);
  });

  it('POST /card/import rejects unauthenticated requests', async () => {
    await request(server)
      .post('/card/import')
      .send({ cards: [] })
      .expect(401);
  });

  it('DELETE /card/:cardId rejects unauthorized ownership', async () => {
    await request(server)
      .delete('/card/forbidden-card')
      .set('Authorization', authHeader)
      .expect(401);
  });

  it('PUT /card/:cardId updates a card', async () => {
    await request(server)
      .put('/card/card-1')
      .set('Authorization', authHeader)
      .send({ grading: 'excellent' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.grading).toBe('excellent');
      });
  });

  it('GET /trade returns trades for an authenticated request', async () => {
    await request(server)
      .get('/trade')
      .set('Authorization', authHeader)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
      });
  });

  it('POST /trade validates the create trade payload', async () => {
    await request(server)
      .post('/trade')
      .set('Authorization', authHeader)
      .send({})
      .expect(400);
  });

  it('GET /trade/:tradeId rejects access to unrelated trades', async () => {
    await request(server)
      .get('/trade/forbidden-trade')
      .set('Authorization', authHeader)
      .expect(401);
  });

  it('DELETE /trade/:tradeId deletes a trade', async () => {
    await request(server)
      .delete('/trade/trade-1')
      .set('Authorization', authHeader)
      .expect(200)
      .expect(({ body }) => {
        expect(body._id).toBe('trade-1');
      });
  });

  it('PUT /trade/:tradeId updates a trade', async () => {
    await request(server)
      .put('/trade/trade-1')
      .set('Authorization', authHeader)
      .send({ traderAccept: true })
      .expect(200)
      .expect(({ body }) => {
        expect(body.traderAccept).toBe(true);
      });
  });

  it('PUT /trade/:tradeId/accept accepts a trade', async () => {
    await request(server)
      .put('/trade/trade-1/accept')
      .set('Authorization', authHeader)
      .send({ accept: true })
      .expect(200)
      .expect(({ body }) => {
        expect(body.acceptedBy).toBe('auth-user');
      });
  });

  it('PUT /trade/:tradeId/decline declines a trade', async () => {
    await request(server)
      .put('/trade/trade-1/decline')
      .set('Authorization', authHeader)
      .send({ decline: true })
      .expect(200)
      .expect(({ body }) => {
        expect(body.declinedBy).toBe('auth-user');
      });
  });

  it('GET /trade/user/:userId lists trades by user', async () => {
    await request(server)
      .get('/trade/user/auth-user')
      .set('Authorization', authHeader)
      .expect(200)
      .expect(({ body }) => {
        expect(body[0].user).toBe('auth-user');
      });
  });

  it('POST /message creates a message for a trade', async () => {
    await request(server)
      .post('/message')
      .set('Authorization', authHeader)
      .send({ trade: '507f191e810c19729de860ea', content: 'Hello there' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.content).toBe('Hello there');
      });
  });

  it('POST /message validates the message payload', async () => {
    await request(server)
      .post('/message')
      .set('Authorization', authHeader)
      .send({ trade: 'invalid-id', content: '' })
      .expect(400);
  });

  it('DELETE /message/:messageId rejects deleting another user message', async () => {
    await request(server)
      .delete('/message/forbidden-message')
      .set('Authorization', authHeader)
      .expect(401);
  });

  it('GET /message/:tradeId returns trade messages', async () => {
    await request(server)
      .get('/message/trade-1')
      .set('Authorization', authHeader)
      .expect(200)
      .expect(({ body }) => {
        expect(body[0].trade).toBe('trade-1');
      });
  });

  it('GET /search/nearme returns nearby cards', async () => {
    await request(server)
      .get('/search/nearme')
      .query({ lat: '48.8566', lng: '2.3522', distance: '10', country: 'FR' })
      .expect(200)
      .expect(({ body }) => {
        expect(body[0].cardName).toBe('Black Lotus');
      });
  });

  it('GET /search returns card results', async () => {
    await request(server)
      .get('/search')
      .query({ lat: '48.8566', lng: '2.3522', name: 'Mox Sapphire' })
      .expect(200)
      .expect(({ body }) => {
        expect(body[0].cardName).toBe('Mox Sapphire');
      });
  });

  it('GET /promocode returns a promocode', async () => {
    await request(server)
      .get('/promocode')
      .query({ code: 'PROMO' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.code).toBe('PROMO');
      });
  });

  it('GET /promocode returns 404 when the code does not exist', async () => {
    await request(server)
      .get('/promocode')
      .query({ code: 'MISSING' })
      .expect(404);
  });

  it('GET /set returns all sets', async () => {
    await request(server)
      .get('/set')
      .expect(200)
      .expect([{ code: 'lea', name: 'Limited Edition Alpha' }]);
  });

  it('GET /foil returns all foils', async () => {
    await request(server)
      .get('/foil')
      .expect(200)
      .expect(['foil', 'nonfoil']);
  });
});
