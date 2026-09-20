import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { BulkImportAccessGuard } from "./bulk-import-access.guard";
import { UserService } from "../user/user.service";
describe("BulkImportAccessGuard", () => {
  const users = { hasBulkImportAccess: jest.fn() };
  let guard: BulkImportAccessGuard;
  const context = (userId?: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user: userId ? { userId } : undefined }),
      }),
    }) as ExecutionContext;
  beforeEach(() => {
    jest.resetAllMocks();
    guard = new BulkImportAccessGuard(users as unknown as UserService);
  });
  it("allows an enabled authenticated user", async () => {
    users.hasBulkImportAccess.mockResolvedValue(true);
    await expect(guard.canActivate(context("user-1"))).resolves.toBe(true);
    expect(users.hasBulkImportAccess).toHaveBeenCalledWith("user-1");
  });
  it("rejects a disabled user", async () => {
    users.hasBulkImportAccess.mockResolvedValue(false);
    await expect(guard.canActivate(context("user-1"))).rejects.toThrow(
      ForbiddenException,
    );
  });
  it("rejects a request without an authenticated user", async () => {
    await expect(guard.canActivate(context())).rejects.toThrow(
      ForbiddenException,
    );
    expect(users.hasBulkImportAccess).not.toHaveBeenCalled();
  });
});
