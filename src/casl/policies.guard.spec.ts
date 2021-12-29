import { Ability, defineAbility } from "@casl/ability";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { UserDocument } from "../user/schema/user.schema";
import { Card } from "../card/schema/card.schema";
import { Action } from "./action.enum";
import { CaslAbilityFactory } from "./casl-ability.factory";
import { ReadCardPolicyHandler } from "./policies";
import { PoliciesGuard } from "./policies.guard";

const reqMock: any = {
  user: Symbol('user'),
};

const contextMock = {
  getHandler: jest.fn(),
  switchToHttp: () => ({
    getRequest: () => reqMock,
  }),
};

const reflectorMock = {
  get : jest.fn(),
}
const caslAbilityFactoryMock = {
  createForUser: (UserDocument: UserDocument) => {
    defineAbility((can) => {
      can(Action.Read, Card);
    })
  }
} as CaslAbilityFactory;

describe('Policy guard', () => {
  let policyGuard;
  
  beforeEach( async() => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoliciesGuard,
        Reflector,
        CaslAbilityFactory,
      ],
    })
      .overrideProvider(Reflector)
      .useValue(reflectorMock)
      .overrideProvider(CaslAbilityFactory)
      .useValue(caslAbilityFactoryMock)
      .compile();

    policyGuard = module.get<PoliciesGuard>(PoliciesGuard);
  })

  it('Should be defined', () => {
    expect(policyGuard).toBeDefined();
  });

  describe('canActivate', () => {
    beforeEach(() => {
      jest.spyOn(policyGuard, 'execPolicyHandler').mockReturnValueOnce(true);
    });

    it('Should return true if no ability', () => {
      const result = policyGuard.canActivate(contextMock);
  
      expect(result).toBe(true);
    });
  
    it('Should return true if handle is a function', () => {
      reflectorMock.get.mockReturnValueOnce([{ handle: () => true }]);
  
      const result = policyGuard.canActivate(contextMock);
      expect(result).toBe(true);
    });
  });

  describe('execPolicyHandler', () => {
    it ('should call handler as a function', () => {
      const handlerMock = jest.fn(() => true);
      const abilityMockOnce = Symbol('abilityMock');
      const result = policyGuard.execPolicyHandler(handlerMock, abilityMockOnce);

      expect(handlerMock).toHaveBeenCalledTimes(1);
      expect(handlerMock).toHaveBeenCalledWith(abilityMockOnce);
      expect(result).toBe(true);
    });

    it ('should call handler as an object', () => {
      const handlerMock = {
          handle: jest.fn(() => true)
      };
      const abilityMockOnce = Symbol('abilityMock');
      const result = policyGuard.execPolicyHandler(handlerMock, abilityMockOnce);

      expect(handlerMock.handle).toHaveBeenCalledTimes(1);
      expect(handlerMock.handle).toHaveBeenCalledWith(abilityMockOnce);
      expect(result).toBe(true);
    });
  });
});


// const policyHanlders =
// this.reflector.get<PolicyHandler[]>(
//   CHECK_POLICIES_KEY,
//   context.getHandler(),
// ) || [];
// const { user } = context.switchToHttp().getRequest();
// const ability = this.caslAbilityFactory.createForUser(user);

// return policyHanlders.every((handler) => this.execPolicyHandler(handler, ability));