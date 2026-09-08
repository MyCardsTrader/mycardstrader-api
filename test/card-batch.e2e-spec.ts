import { randomUUID } from "node:crypto";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { getModelToken } from "@nestjs/mongoose";
import { Test } from "@nestjs/testing";
import { Connection, createConnection, Model, Types } from "mongoose";
import request from "supertest";
import { JwtStrategy } from "../src/auth/jwt.strategy";
import { CardBatchController } from "../src/card/card-batch.controller";
import { CardBatchService } from "../src/card/card-batch.service";
import { CardController } from "../src/card/card.controller";
import { CardService } from "../src/card/card.service";
import { Card, CardDocument, CardSchema } from "../src/card/schema/card.schema";
import { CaslService } from "../src/casl/casl.service";
import { CaslAbilityFactory } from "../src/casl/casl-ability.factory";

describe("Transactional card batches (HTTP + real Mongo replica set)", () => {
  let app: INestApplication;
  let connection: Connection;
  let cards: Model<Card>;
  let authorization: string;
  let jwt: JwtService;
  const ids = Array.from({ length: 4 }, () => new Types.ObjectId().toString());
  const owner = "batch-owner";
  const database = `card_batch_e2e_${randomUUID().replace(/-/g, "")}`;

  beforeAll(async () => {
    const configModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          load: [
            () => ({
              batchUri:
                process.env.BATCH_E2E_MONGO_URI ??
                "mongodb://127.0.0.1:27018/card_batch_e2e?replicaSet=rs0&directConnection=true",
              auth: { jwtSecret: "batch-e2e-secret" },
            }),
          ],
        }),
      ],
    }).compile();
    const config = configModule.get(ConfigService);
    const uri = config.getOrThrow<string>("batchUri");
    if (!["127.0.0.1", "localhost", "mongo"].includes(new URL(uri).hostname))
      throw new Error("Batch e2e requires an isolated local MongoDB");
    connection = await createConnection(uri, {
      dbName: database,
      serverSelectionTimeoutMS: 5000,
    }).asPromise();
    cards = connection.model(Card.name, CardSchema);
    await cards.createCollection();
    const module = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({ secret: "batch-e2e-secret" }),
      ],
      controllers: [CardBatchController, CardController],
      providers: [
        CardBatchService,
        CardService,
        JwtStrategy,
        CaslService,
        CaslAbilityFactory,
        { provide: ConfigService, useValue: config },
        { provide: getModelToken(Card.name), useValue: cards },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    jwt = module.get(JwtService);
    authorization = `Bearer ${jwt.sign({ sub: owner })}`;
    await configModule.close();
  });

  beforeEach(async () => {
    jest.restoreAllMocks();
    await cards.deleteMany({}); // Dedicated randomly named e2e database only.
    await cards.insertMany(
      ids.slice(0, 3).map((id, index) => ({
        _id: id,
        user: index === 2 ? "another-owner" : owner,
        name: `Card ${index}`,
        oracle_id: id,
        lang: "en",
        grading: "mint",
        foil_treatment: "nonfoil",
        image_uris: { small: "test" },
        cmc: "1",
        type_line: "Artifact",
        set: "lea",
        set_svg: "test",
        collector_number: "1",
        color_identity: [],
      })),
    );
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    if (app) await app.close();
    if (connection) {
      await connection.dropDatabase(); // Only the database created above for this run.
      await connection.close();
    }
  });

  const updateBody = (cardIds = ids.slice(0, 2)) => ({
    items: cardIds.map((cardId) => ({ cardId, changes: { lang: "fr" } })),
  });
  const deleteBody = (cardIds = ids.slice(0, 2)) => ({ cardIds });
  const send = (
    method: "patch" | "delete",
    body: object,
    auth = authorization,
  ) =>
    request(app.getHttpServer())
      [method]("/card/batch")
      .set("Authorization", auth)
      .send(body);
  const expectUnchanged = async () => {
    expect(await cards.countDocuments()).toBe(3);
    expect(
      (await cards.find({ user: owner })).every((card) => card.lang === "en"),
    ).toBe(true);
  };

  it("commits different update patches and preserves untouched fields", async () => {
    const res = await send("patch", {
      items: [
        { cardId: ids[0], changes: { lang: "fr" } },
        {
          cardId: ids[1],
          changes: { grading: "good", foil_treatment: "foil" },
        },
      ],
    }).expect(200);
    expect(res.body.updatedCount).toBe(2);
    expect((await cards.findById(ids[0])).lang).toBe("fr");
    expect((await cards.findById(ids[1])).lang).toBe("en");
    expect((await cards.findById(ids[1])).foil_treatment).toBe("foil");
    expect((await cards.findById(ids[2])).grading).toBe("mint");
  });

  it("commits deletion only for selected cards and preserves another owner", async () => {
    const res = await send("delete", deleteBody()).expect(200);
    expect(res.body).toEqual({ deletedCount: 2, deletedIds: ids.slice(0, 2) });
    expect(await cards.countDocuments()).toBe(1);
    expect(await cards.findById(ids[2])).not.toBeNull();
    await send("delete", deleteBody()).expect(404);
  });

  for (const method of ["patch", "delete"] as const) {
    const body = method === "patch" ? updateBody : deleteBody;
    it(`${method}: refuses missing, invalid and expired JWTs`, async () => {
      for (const auth of [
        "",
        "Bearer invalid",
        `Bearer ${jwt.sign({ sub: owner }, { expiresIn: -1 })}`,
      ])
        await send(method, body(), auth).expect(401);
      await expectUnchanged();
    });
    it(`${method}: missing/foreign cards abort the whole batch without disclosing ownership`, async () => {
      for (const badId of [ids[2], ids[3]]) {
        const res = await send(method, body([ids[0], badId])).expect(404);
        expect(res.body.code).toBe("CARD_BATCH_NOT_FOUND");
        expect(res.body.cardIds).toEqual([badId]);
        expect(JSON.stringify(res.body)).not.toContain("another-owner");
        await expectUnchanged();
      }
    });
    it(`${method}: a traded card aborts the whole batch with a displayable conflict`, async () => {
      await cards.updateOne(
        { _id: ids[1] },
        { $set: { availability: "traded" } },
      );
      const res = await send(method, body()).expect(409);
      expect(res.body).toMatchObject({
        code: "CARD_BATCH_CONFLICT",
        message: expect.any(String),
        cardIds: [ids[1]],
      });
      await expectUnchanged();
    });
    it(`${method}: rejects empty, oversized, duplicate and malformed selections before writes`, async () => {
      for (const selection of [
        [],
        [ids[0], ids[0]],
        ["invalid"],
        [null],
        Array.from({ length: 101 }, () => new Types.ObjectId().toString()),
      ]) {
        const res = await send(method, body(selection)).expect(400);
        expect(res.body.code).toBe("CARD_BATCH_INVALID");
        await expectUnchanged();
      }
      await send(method, { ...body(), user: "another-owner" }).expect(400);
    });
  }

  it("rejects unknown/nested operators, invalid values and missing patches", async () => {
    for (const changes of [
      {},
      null,
      { user: "another-owner" },
      { availability: "traded" },
      { $set: { lang: "fr" } },
      { lang: null },
      { lang: "invalid" },
      { grading: false },
      { foil_treatment: "" },
      { foil_treatment: " ".repeat(5) },
    ]) {
      await send("patch", { items: [{ cardId: ids[0], changes }] }).expect(400);
    }
    await send("patch", { items: [{ cardId: ids[0] }] }).expect(400);
    await expectUnchanged();
  });

  it("rolls back real update writes if an error occurs before commit", async () => {
    const original = cards.bulkWrite.bind(cards);
    jest
      .spyOn(cards, "bulkWrite")
      .mockImplementation(async (...args: any[]) => {
        await (original as any)(...args);
        throw new Error("injected failure after real Mongo writes");
      });
    const res = await send("patch", updateBody()).expect(500);
    expect(res.body.code).toBe("CARD_BATCH_FAILED");
    expect(JSON.stringify(res.body)).not.toContain("injected");
    await expectUnchanged();
  });

  it("rolls back real deletions if an error occurs before commit", async () => {
    const original = cards.deleteMany.bind(cards);
    jest.spyOn(cards, "deleteMany").mockImplementation(((...args: any[]) =>
      (original as any)(...args).then(() => {
        throw new Error("injected deletion failure");
      })) as any);
    await send("delete", deleteBody()).expect(500);
    await expectUnchanged();
  });

  it("supports the 100-card boundary in one transaction", async () => {
    const template = await cards.findById(ids[0]).lean();
    const added = await cards.insertMany(
      Array.from({ length: 98 }, () => ({
        ...template,
        _id: new Types.ObjectId(),
      })),
    );
    const selection = [
      ...ids.slice(0, 2),
      ...added.map((card) => card._id.toString()),
    ];
    expect(
      (await send("patch", updateBody(selection)).expect(200)).body
        .updatedCount,
    ).toBe(100);
    expect(
      (await send("delete", deleteBody(selection)).expect(200)).body
        .deletedCount,
    ).toBe(100);
  });

  it("serializes concurrent deletions without partial effects", async () => {
    const results = await Promise.all([
      send("delete", deleteBody()),
      send("delete", deleteBody()),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 404]);
    expect(await cards.countDocuments()).toBe(1);
    expect(await cards.findById(ids[2])).not.toBeNull();
  });
});
