import { Reflector } from "@nestjs/core";
import { CHECK_POLICIES_KEY } from "./check-policy.decorator";
import { PolicyHandler } from "./interfaces/policy-handler.interface";
import { AppAbility, CaslAbilityFactory } from "./casl-ability.factory";
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory,
  ) { }

  canActivate(context: ExecutionContext): boolean {
    const policyHandlers =
      this.reflector.get<PolicyHandler[]>(
        CHECK_POLICIES_KEY,
        context.getHandler(),
      ) || [];
    const { user } = context.switchToHttp().getRequest();
    const ability = this.caslAbilityFactory.createForUser(user.userId);
  
    return policyHandlers.every((handler) => {
      return this.execPolicyHandler(handler, ability)
    });
  }

  private execPolicyHandler(handler: PolicyHandler, ability: AppAbility): boolean {
    if (typeof handler === 'function') {
      return handler(ability);
    }
    return handler.handle(ability);
  }
}