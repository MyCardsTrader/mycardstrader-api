import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { UserService } from "../user/user.service";
@Injectable()
export class BulkImportAccessGuard implements CanActivate {
  constructor(private readonly userService: UserService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const userId = context.switchToHttp().getRequest().user?.userId;
    if (!userId || !(await this.userService.hasBulkImportAccess(userId))) {
      throw new ForbiddenException("Card scan access is not enabled");
    }
    return true;
  }
}
