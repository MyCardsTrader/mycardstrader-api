/* istanbul ignore file */

import { Module } from '@nestjs/common';
import { CaslService } from './casl.service';
import { PoliciesGuard } from './policies.guard';
import { CaslAbilityFactory } from './casl-ability.factory';

@Module({
  providers: [CaslAbilityFactory, PoliciesGuard, CaslService],
  exports: [CaslAbilityFactory, PoliciesGuard, CaslService],
})
export class CaslModule {}
