import { CardService } from './card.service';
import { CardLang } from './interfaces/lang.enum';
import { CardController } from './card.controller';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateCardDto } from './dto/create-card.dto';
import { DeleteCardDto } from './dto/delete-card.dto';
import { Grading } from './interfaces/grading.enum';

const cardServiceProviderMock = {
  createCard: jest.fn(),
  deleteCard: jest.fn(),
  findCardByUser: jest.fn(), 
}

describe('CardController', () => {
  let controller: CardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CardController],
      providers: [CardService],
    })
      .overrideProvider(CardService)
      .useValue(cardServiceProviderMock)
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
      image_uri: {
        small: 'https://c1.scryfall.com/file/scryfall-cards/small/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.jpg?1562902485',
        normal: 'https://c1.scryfall.com/file/scryfall-cards/normal/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.jpg?1562902485',
        large: 'https://c1.scryfall.com/file/scryfall-cards/large/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.jpg?1562902485',
        png: 'https://c1.scryfall.com/file/scryfall-cards/png/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.png?1562902485',
        art_crop: 'https://c1.scryfall.com/file/scryfall-cards/art_crop/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.jpg?1562902485',
        border_crop: 'https://c1.scryfall.com/file/scryfall-cards/border_crop/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.jpg?1562902485',
      },
      user: "61aff9b226d0e050c18bfcae"
    }

    // When
    controller.createCard(createCardDto);

    // Then
    expect(cardServiceProviderMock.createCard).toHaveBeenCalledTimes(1);
    expect(cardServiceProviderMock.createCard).toHaveBeenLastCalledWith(createCardDto);
  });

  it('should call card service deleteCard()', () => {
    // Given
    const deleteCardDto: DeleteCardDto = {
      id: 'cardId',
    };

    // When
    controller.deleteCard(deleteCardDto);

    // Then
    expect(cardServiceProviderMock.deleteCard).toHaveBeenCalledTimes(1);
    expect(cardServiceProviderMock.deleteCard).toHaveBeenLastCalledWith(deleteCardDto.id);
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
});
