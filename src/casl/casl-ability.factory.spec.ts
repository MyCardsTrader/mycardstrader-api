import { CaslAbilityFactory } from './casl-ability.factory';

const userId = Symbol('userId');

describe('CaslAbilityFactory', () => {

  it('should be defined', () => {
    expect(new CaslAbilityFactory()).toBeDefined();
  });

  describe('createForUser', () => {
    let getAbilityBuilderMock;
    let caslAbilityFactory;
    const abilityMock = {
      because: jest.fn(),
      can: jest.fn(),
      cannot: jest.fn(),
      build: jest.fn(),
    };

    beforeEach(() => {
      jest.resetAllMocks();
      jest.restoreAllMocks();
  
      getAbilityBuilderMock = jest.spyOn(CaslAbilityFactory, 'getAbilityBuilder');
      getAbilityBuilderMock.mockReturnValueOnce(abilityMock);

      abilityMock.can.mockReturnValue(abilityMock);

      caslAbilityFactory = new CaslAbilityFactory();
    });

    it('Should call 4 times can and build', () => {
      caslAbilityFactory.createForUser(userId);

      expect(abilityMock.can).toHaveBeenCalledTimes(6);
      expect(abilityMock.because).toHaveBeenCalledTimes(1);
    });
    
    it('should call build', () => {
      const buildReturn = Symbol('buildReturn');
      abilityMock.build.mockReturnValueOnce(buildReturn);
      const result = caslAbilityFactory.createForUser(userId);

      expect(abilityMock.build).toHaveBeenCalledTimes(1);
      expect(abilityMock.build).toHaveBeenCalledWith({
        detectSubjectType: expect.any(Function)
      });
      expect(result).toEqual(buildReturn);
    });

  });
});
