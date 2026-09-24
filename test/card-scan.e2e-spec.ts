import {
  BadRequestException,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from "@nestjs/common";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { PassportModule, PassportStrategy } from "@nestjs/passport";
import { Test } from "@nestjs/testing";
import { ExtractJwt, Strategy } from "passport-jwt";
import request from "supertest";
import { BulkImportAccessGuard } from "../src/card-scan/bulk-import-access.guard";
import { UserService } from "../src/user/user.service";
import { CardScanController } from "../src/card-scan/card-scan.controller";
import { CardScanService } from "../src/card-scan/card-scan.service";
import { CardScanStatus } from "../src/card-scan/card-scan.types";
const SECRET = "card-scan-test-secret";
class TestStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: SECRET,
    });
  }
  validate(payload: { sub: string }) {
    return { userId: payload.sub };
  }
}
describe("Card scans HTTP (e2e)", () => {
  let app: INestApplication;
  let auth: string;
  const users = { hasBulkImportAccess: jest.fn() };
  const service = {
    createScan: jest.fn(),
    listScans: jest.fn(),
    getScan: jest.fn(),
    qualifyCard: jest.fn(),
    markImported: jest.fn(),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: "jwt" }),
        JwtModule.register({ secret: SECRET }),
      ],
      controllers: [CardScanController],
      providers: [
        { provide: CardScanService, useValue: service },
        { provide: UserService, useValue: users },
        BulkImportAccessGuard,
        TestStrategy,
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    auth = `Bearer ${module.get(JwtService).sign({ sub: "user-1" })}`;
  });
  afterAll(async () => app.close());
  beforeEach(() => {
    jest.resetAllMocks();
    users.hasBulkImportAccess.mockResolvedValue(true);
    service.createScan.mockImplementation(
      (_user: string, file?: { mimetype: string }) => {
        if (!file) throw new BadRequestException("One image is required");
        if (file.mimetype !== "image/png")
          throw new BadRequestException("Unsupported image type");
        return { _id: "scan-1", status: CardScanStatus.READY, cards: [] };
      },
    );
    service.listScans.mockResolvedValue([]);
    service.getScan.mockImplementation((user: string, id: string) => {
      if (id === "foreign") throw new NotFoundException("Card scan not found");
      return { _id: id, userId: user };
    });
    service.markImported.mockResolvedValue({
      _id: "scan-1",
      status: CardScanStatus.IMPORTED,
    });
    service.qualifyCard.mockResolvedValue({
      _id: "scan-1",
      status: CardScanStatus.READY,
    });
  });
  it("creates a scan from one authenticated image", async () => {
    await request(app.getHttpServer())
      .post("/card-scans")
      .set("Authorization", auth)
      .attach("image", Buffer.from("png"), {
        filename: "cards.png",
        contentType: "image/png",
      })
      .expect(201)
      .expect(({ body }) => expect(body.status).toBe(CardScanStatus.READY));
    expect(service.createScan).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ mimetype: "image/png" }),
    );
  });
  it("rejects a missing image", () =>
    request(app.getHttpServer())
      .post("/card-scans")
      .set("Authorization", auth)
      .expect(400));
  it("rejects an unsupported image", () =>
    request(app.getHttpServer())
      .post("/card-scans")
      .set("Authorization", auth)
      .attach("image", Buffer.from("gif"), {
        filename: "cards.gif",
        contentType: "image/gif",
      })
      .expect(400));
  it("requires authentication", () =>
    request(app.getHttpServer()).get("/card-scans").expect(401));
  it("forbids an authenticated user without the feature flag", async () => {
    users.hasBulkImportAccess.mockResolvedValue(false);
    await request(app.getHttpServer())
      .get("/card-scans")
      .set("Authorization", auth)
      .expect(403);
    expect(service.listScans).not.toHaveBeenCalled();
  });
  it("lists scans using a validated status", async () => {
    await request(app.getHttpServer())
      .get("/card-scans?status=needs_review")
      .set("Authorization", auth)
      .expect(200);
    expect(service.listScans).toHaveBeenCalledWith(
      "user-1",
      CardScanStatus.NEEDS_REVIEW,
    );
  });
  it("rejects an invalid status", () =>
    request(app.getHttpServer())
      .get("/card-scans?status=invalid")
      .set("Authorization", auth)
      .expect(400));
  it("does not expose another user's scan", () =>
    request(app.getHttpServer())
      .get("/card-scans/foreign")
      .set("Authorization", auth)
      .expect(404));
  it("gets an owned scan", () =>
    request(app.getHttpServer())
      .get("/card-scans/scan-1")
      .set("Authorization", auth)
      .expect(200));
  it("marks an owned scan imported", async () => {
    await request(app.getHttpServer())
      .patch("/card-scans/scan-1/imported")
      .set("Authorization", auth)
      .expect(200);
    expect(service.markImported).toHaveBeenCalledWith("user-1", "scan-1");
  });
  it("qualifies a card with a UUID", () =>
    request(app.getHttpServer())
      .patch("/card-scans/scan-1/cards/card-1")
      .set("Authorization", auth)
      .send({ scryfallId: "11111111-1111-4111-8111-111111111111" })
      .expect(200));
  it("rejects malformed qualification payloads", () =>
    request(app.getHttpServer())
      .patch("/card-scans/scan-1/cards/card-1")
      .set("Authorization", auth)
      .send({ scryfallId: "not-a-uuid", name: "untrusted" })
      .expect(400));
});
