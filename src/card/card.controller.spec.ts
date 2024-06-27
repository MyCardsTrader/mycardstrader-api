import { Action } from '../casl/action.enum';
import { CardService } from './card.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CardLang } from './interfaces/lang.enum';
import { CaslService } from '../casl/casl.service';
import { CardController } from './card.controller';
import { Grading } from './interfaces/grading.enum';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateCardDto } from './dto/create-card.dto';
import { PoliciesGuard } from '../casl/policies.guard';
import { CaslAbilityFactory } from '../casl/casl-ability.factory';
import { BulkImportDto } from './dto/bulk-import.dto';

const cardServiceProviderMock = {
  createCard: jest.fn(),
  importCards: jest.fn(),
  deleteCard: jest.fn(),
  findCardByUser: jest.fn(),
  findCardById: jest.fn(),
  updateCard: jest.fn(),
}

const jwtAuthGuardMock = {
  canActivate: jest.fn(),
}

const policiesGuardMock = {
  canActivate: jest.fn(),
}

const userId = 'userId';

const reqMock = {
  user: {
    userId,
  }
};

const caslServiceMock = {
  checkForCard: jest.fn(),
}


const cardId = 'cardId';

const cardMock = {
  _id: cardId,
  oracle_id: '8d02b297-97c4-4379-9862-0a462400f66f',
  cardmarket_id: 3574,
  name: "Phyrexian Altar",
  lang: CardLang.EN,
  grading: Grading.M,
  user: 'userId',
  image_uri: {
    small: 'https://c1.scryfall.com/file/scryfall-cards/small/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.jpg?1562902485',
    normal: 'https://c1.scryfall.com/file/scryfall-cards/normal/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.jpg?1562902485',
    large: 'https://c1.scryfall.com/file/scryfall-cards/large/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.jpg?1562902485',
    png: 'https://c1.scryfall.com/file/scryfall-cards/png/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.png?1562902485',
    art_crop: 'https://c1.scryfall.com/file/scryfall-cards/art_crop/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.jpg?1562902485',
    border_crop: 'https://c1.scryfall.com/file/scryfall-cards/border_crop/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.jpg?1562902485',
  },
  cmc: '3.0',
  type_line: 'Artifact',
  set: '2x2',
  collector_number: 1,
  colors: [],
  color_identity: [],
  availability: 'available',
}

describe('CardController', () => {
  let controller: CardController;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CardController],
      providers: [
        CardService,
        JwtAuthGuard,
        PoliciesGuard,
        CaslAbilityFactory,
        CaslService,
      ],
    })
      .overrideProvider(PoliciesGuard)
      .useValue(policiesGuardMock)
      .overrideProvider(JwtAuthGuard)
      .useValue(jwtAuthGuardMock)
      .overrideProvider(CardService)
      .useValue(cardServiceProviderMock)
      .overrideProvider(CaslService)
      .useValue(caslServiceMock)
      .compile();

    controller = module.get<CardController>(CardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call card service createCard()', () => {
    // Given
    const createCardDto: CreateCardDto = {
      oracle_id: '8d02b297-97c4-4379-9862-0a462400f66f',
      cardmarket_id: 3574,
      name: "Phyrexian Altar",
      lang: CardLang.EN,
      grading: Grading.M,
      image_uris: {
        small: 'https://c1.scryfall.com/file/scryfall-cards/small/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.jpg?1562902485',
        normal: 'https://c1.scryfall.com/file/scryfall-cards/normal/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.jpg?1562902485',
        large: 'https://c1.scryfall.com/file/scryfall-cards/large/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.jpg?1562902485',
        png: 'https://c1.scryfall.com/file/scryfall-cards/png/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.png?1562902485',
        art_crop: 'https://c1.scryfall.com/file/scryfall-cards/art_crop/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.jpg?1562902485',
        border_crop: 'https://c1.scryfall.com/file/scryfall-cards/border_crop/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.jpg?1562902485',
      },
      cmc: '3.0',
      type_line: 'Artifact',
      set: '2x2',
      set_svg: "https://svgs.scryfall.io/sets/mh2.svg?1713153600",
      collector_number: "1",
      colors: [],
      color_identity: [],
    }

    // When
    controller.createCard(createCardDto, reqMock);

    // Then
    expect(cardServiceProviderMock.createCard).toHaveBeenCalledTimes(1);
    expect(cardServiceProviderMock.createCard).toHaveBeenLastCalledWith(createCardDto, reqMock.user.userId);
  });

  it('should call card service importCards()', () => {
    // Given
    const importDto: BulkImportDto = {
      cards: [{
        oracle_id: '8d02b297-97c4-4379-9862-0a462400f66f',
        cardmarket_id: 3574,
        name: "Phyrexian Altar",
        lang: CardLang.EN,
        grading: Grading.M,
        image_uris: {
          small: 'https://c1.scryfall.com/file/scryfall-cards/small/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.jpg?1562902485',
          normal: 'https://c1.scryfall.com/file/scryfall-cards/normal/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.jpg?1562902485',
          large: 'https://c1.scryfall.com/file/scryfall-cards/large/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.jpg?1562902485',
          png: 'https://c1.scryfall.com/file/scryfall-cards/png/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.png?1562902485',
          art_crop: 'https://c1.scryfall.com/file/scryfall-cards/art_crop/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.jpg?1562902485',
          border_crop: 'https://c1.scryfall.com/file/scryfall-cards/border_crop/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.jpg?1562902485',
        },
        cmc: '3.0',
        type_line: 'Artifact',
        set: '2x2',
        set_svg: "https://svgs.scryfall.io/sets/mh2.svg?1713153600",
        collector_number: "1",
        colors: [],
        color_identity: [],
      }]
    }

    // When
    controller.importCards(importDto, reqMock);

    // Then
    expect(cardServiceProviderMock.importCards).toHaveBeenCalledTimes(1);
    expect(cardServiceProviderMock.importCards).toHaveBeenLastCalledWith(importDto, reqMock.user.userId);
  });

  it('should call card service deleteCard()', async () => {
    // Given
    cardServiceProviderMock.findCardById.mockReturnValueOnce(cardMock);

    // When
    await controller.deleteCard(cardId, reqMock);

    // Then
    expect(cardServiceProviderMock.findCardById).toHaveBeenCalledTimes(1);
    expect(cardServiceProviderMock.findCardById).toHaveBeenCalledWith(cardId);
    expect(caslServiceMock.checkForCard).toHaveBeenCalledTimes(1);
    expect(caslServiceMock.checkForCard).toHaveBeenCalledWith(cardMock, userId, Action.Delete);
    expect(cardServiceProviderMock.deleteCard).toHaveBeenCalledTimes(1);
    expect(cardServiceProviderMock.deleteCard).toHaveBeenLastCalledWith(cardId);
  });

  it('should call card service findCardByUser', () => {
    // Given
    const userId = 'userId';

    // When
    controller.findByUser(userId);

    // Then
    expect(cardServiceProviderMock.findCardByUser).toHaveBeenCalledTimes(1);
    expect(cardServiceProviderMock.findCardByUser).toHaveBeenLastCalledWith(userId);
  });

  it('should call card service findCard', () => {
    // Given
    const cardId = 'cardId';

    // When
    controller.findCard(cardId);

    // Then
    expect(cardServiceProviderMock.findCardById).toHaveBeenCalledTimes(1);
    expect(cardServiceProviderMock.findCardById).toHaveBeenLastCalledWith(cardId);
  });

  it('Should call card service updateCard', async() => {
    // Given
    const cardUpdateDto = {
      grading: Grading.LP,
      lang: CardLang.RU,
    }
    cardServiceProviderMock.findCardById.mockReturnValueOnce(cardMock);

    // When
    await controller.updateCard(cardId, cardUpdateDto, reqMock);

    // Then
    expect(cardServiceProviderMock.findCardById).toHaveBeenCalledTimes(1);
    expect(cardServiceProviderMock.findCardById).toHaveBeenCalledWith(cardId);
    expect(caslServiceMock.checkForCard).toHaveBeenCalledTimes(1);
    expect(caslServiceMock.checkForCard).toHaveBeenLastCalledWith(cardMock, userId, Action.Put);
    expect(cardServiceProviderMock.updateCard).toHaveBeenCalledTimes(1);
    expect(cardServiceProviderMock.updateCard).toHaveBeenCalledWith(cardId, cardUpdateDto);
  });
});
