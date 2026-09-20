import { randomUUID } from "node:crypto";
import { INestApplication } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { getModelToken } from "@nestjs/mongoose";
import { Test } from "@nestjs/testing";
import { Connection, createConnection, Model } from "mongoose";
import request from "supertest";
import { SearchController } from "../src/search/search.controller";
import { SearchService } from "../src/search/search.service";
import { User, UserSchema } from "../src/user/schema/user.schema";
import { CardLang } from "../src/card/interfaces/lang.enum";
import { Grading } from "../src/card/interfaces/grading.enum";
import { Card, CardSchema } from "../src/card/schema/card.schema";

describe("Nearby search filter metadata (HTTP + real Mongo)", () => {
  let app: INestApplication;
  let connection: Connection;
  let users: Model<User>;
  let cards: Model<Card>;
  let ownerId: string;
  const database = `search_e2e_${randomUUID().replace(/-/g, "")}`;
  const query = { lat: "2.35", lng: "48.85", distance: "10", country: "FR" };
  const filterFields = {
    cmc: "3",
    legalities: { commander: "legal", standard: "not_legal" },
    color_identity: ["W", "U"],
    set: "mh3",
    type_line: "Creature — Bird",
    lang: CardLang.FR,
    grading: Grading.NM,
    foil_treatment: "etched foil",
    keywords: ["Flying", "Vigilance"],
    collector_number: "123",
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          load: [
            () => ({
              searchTestUri:
                process.env.BATCH_E2E_MONGO_URI ??
                "mongodb://127.0.0.1:27018/search_e2e?replicaSet=rs0&directConnection=true",
            }),
          ],
        }),
      ],
    }).compile();
    const uri = module.get(ConfigService).getOrThrow<string>("searchTestUri");
    if (!["127.0.0.1", "localhost", "mongo"].includes(new URL(uri).hostname)) {
      throw new Error("Search e2e requires an isolated local MongoDB");
    }
    connection = await createConnection(uri, {
      dbName: database,
      serverSelectionTimeoutMS: 5000,
    }).asPromise();
    users = connection.model(User.name, UserSchema);
    cards = connection.model(Card.name, CardSchema);
    await users.init();
    await cards.init();
    const searchModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        SearchService,
        { provide: getModelToken(User.name), useValue: users },
      ],
    }).compile();
    app = searchModule.createNestApplication();
    await app.init();
    await module.close();
  });

  beforeEach(async () => {
    await cards.deleteMany({});
    await users.deleteMany({});
    const owner = await users.create({
      email: "search@example.test",
      country: "FR",
      location: { type: "Point", coordinates: [2.36, 48.85] },
    });
    ownerId = owner._id.toString();
    await cards.create({
      ...filterFields,
      name: "Test Bird",
      oracle_id: "test-oracle",
      image_uris: { small: "bird.png" },
      set_svg: "mh3.svg",
      user: ownerId,
    });
  });

  afterAll(async () => {
    if (app) await app.close();
    if (connection) {
      await connection.dropDatabase();
      await connection.close();
    }
  });

  it("returns the name and every filter field from the stored card", async () => {
    const response = await request(app.getHttpServer())
      .get("/search/nearme")
      .query(query)
      .expect(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      ...filterFields,
      name: "Test Bird",
      cardName: "Test Bird",
      userId: ownerId,
      cardId: expect.any(String),
      image_uris: { small: "bird.png" },
    });
  });

  it("preserves zero CMC, colorless identity and empty keywords/legalities", async () => {
    await cards.updateOne(
      {},
      { $set: { cmc: "0", color_identity: [], keywords: [], legalities: {} } },
    );
    const response = await request(app.getHttpServer())
      .get("/search/nearme")
      .query(query)
      .expect(200);
    expect(response.body[0]).toMatchObject({
      cmc: "0",
      color_identity: [],
      keywords: [],
      legalities: {},
    });
  });

  it("excludes the requesting owner's cards", async () => {
    await request(app.getHttpServer())
      .get("/search/nearme")
      .query({ ...query, userId: ownerId })
      .expect(200)
      .expect([]);
  });

  it("excludes cards that have already been traded", async () => {
    await cards.updateOne({}, { $set: { availability: "traded" } });
    await request(app.getHttpServer())
      .get("/search/nearme")
      .query(query)
      .expect(200)
      .expect([]);
  });
});
