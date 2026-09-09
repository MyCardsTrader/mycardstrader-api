import Mock from "mockingoose";
import * as mongoose from "mongoose";
import { scryptSync } from "crypto";
import {
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";

import { UserService } from "./user.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { CountryEnum, UserSchema } from "./schema/user.schema";
import { PromocodeService } from "../promocode/promocode.service";
import { MailService } from "../mail";

const userModel = getModelToken("User");

const UserTestModel = mongoose.model("User", UserSchema);

const formatMongo = (doc) => {
  return JSON.parse(JSON.stringify(doc));
};

const userDoc = {
  _id: "507f191e810c19729de860ea",
  email: "captain.nemo@nautilus.sub",
  password: "aronnax",
  availableCoins: 0,
  holdCoins: 0,
  spentCoins: 0,
  country: "fr",
  usedPromocode: [],
  verify: "verify",
};

const mailServiceMock = {
  sendTemplate: jest.fn(),
};

const promocodeServiceMock = {
  getPromocode: jest.fn(),
};

const configServiceMock = {
  getOrThrow: jest.fn(),
};

const userDeleteDoc = {
  id: "507f191e810c19729de860ea",
};

describe("UserService", () => {
  let service: UserService;

  beforeEach(async () => {
    Mock.resetAll();
    jest.resetAllMocks();
    configServiceMock.getOrThrow.mockImplementation((key: string) => {
      if (key === "mail.frontUrl") {
        return "http://localhost:4200";
      }
      throw new Error(`Unexpected config key ${key}`);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: userModel,
          useValue: UserTestModel,
        },
        {
          provide: MailService,
          useValue: mailServiceMock,
        },
        {
          provide: PromocodeService,
          useValue: promocodeServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("Create user", () => {
    const userDto: CreateUserDto = {
      email: "captain.nemo@nautilus.sub",
      password: "aronnax",
      location: {
        type: "Point",
        coordinates: [-123.1264691, 49.2290631],
      },
      country: CountryEnum.FR,
    };

    beforeEach(() => {
      Mock.resetAll();
    });

    it("should create a user", async () => {
      // Given
      Mock(UserTestModel).toReturn(userDoc, "save");

      // When
      const result = await service.createUser(userDto);

      // Then
      expect(mailServiceMock.sendTemplate).toHaveBeenCalled();
      expect(mailServiceMock.sendTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            frontUrl: "http://localhost:4200",
          }),
        }),
      );
      expect(promocodeServiceMock.getPromocode).not.toHaveBeenCalled();
      expect(formatMongo(result)).toEqual(userDoc);
    });

    it("should create user with promocode", async () => {
      // Given
      const userDocWithPromocode = {
        ...userDoc,
        usedPromocode: ["PROMO"],
        availableCoins: 10,
      };
      const promocode = "promocode";
      userDto.promocode = promocode;
      jest
        .spyOn(promocodeServiceMock, "getPromocode")
        .mockResolvedValue({ code: "PROMO", value: 10 });
      Mock(UserTestModel).toReturn(userDocWithPromocode, "save");

      // When
      const result = await service.createUser(userDto);

      // Then
      expect(mailServiceMock.sendTemplate).toHaveBeenCalled();
      expect(promocodeServiceMock.getPromocode).toHaveBeenCalledWith(promocode);
      expect(userDto.promocode).toBe(promocode);
      expect(formatMongo(result)).toEqual(userDocWithPromocode);
    });

    it("should throw an HttpException", async () => {
      // Given
      Mock(UserTestModel).toReturn(new Error("Cannot save"), "save");
      // When
      // Then
      await expect(service.createUser(userDto)).rejects.toThrow(HttpException);
    });
  });

  describe("Find all user", () => {
    it("should find all user", async () => {
      // Given
      const valueReturn = [userDoc];
      Mock(UserTestModel).toReturn(valueReturn, "find");

      // When
      const result = await service.findAll();

      // Then
      expect(formatMongo(result)).toEqual(valueReturn);
    });

    it("should throw an HttpException on find all user", async () => {
      // Given
      Mock(UserTestModel).toReturn(new Error("Cannot find all"), "find");

      // When
      // Then
      await expect(service.findAll()).rejects.toThrow(HttpException);
    });
  });

  describe("get profile", () => {
    it("returns only profile-safe fields for the authenticated user", async () => {
      Mock(UserTestModel).toReturn(
        {
          ...userDoc,
          salt: "secret-salt",
          location: { type: "Point", coordinates: [2.35, 48.85] },
        },
        "findOne",
      );

      const result = await service.getProfile(userDoc._id);

      expect(result).toEqual({
        email: userDoc.email,
        country: userDoc.country,
        location: { type: "Point", coordinates: [2.35, 48.85] },
        availableCoins: 0,
        holdCoins: 0,
        spentCoins: 0,
      });
      expect(result).not.toHaveProperty("password");
      expect(result).not.toHaveProperty("salt");
    });

    it("defaults missing treasure counters to zero", async () => {
      Mock(UserTestModel).toReturn(
        {
          email: userDoc.email,
          country: userDoc.country,
          location: { type: "Point", coordinates: [2.35, 48.85] },
          availableCoins: null,
          holdCoins: null,
          spentCoins: null,
        },
        "findOne",
      );

      const result = await service.getProfile(userDoc._id);

      expect(result.availableCoins).toBe(0);
      expect(result.holdCoins).toBe(0);
      expect(result.spentCoins).toBe(0);
    });

    it("normalizes legacy latitude/longitude profiles", async () => {
      Mock(UserTestModel).toReturn(
        {
          ...userDoc,
          location: { lat: 48.85, lng: 2.35 },
        },
        "findOne",
      );

      const result = await service.getProfile(userDoc._id);

      expect(result.location).toEqual({
        type: "Point",
        coordinates: [2.35, 48.85],
      });
    });

    it("throws NotFoundException when the authenticated user no longer exists", async () => {
      Mock(UserTestModel).toReturn(null, "findOne");

      await expect(service.getProfile(userDoc._id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("wraps database errors when loading the profile", async () => {
      Mock(UserTestModel).toReturn(new Error("Cannot find profile"), "findOne");

      await expect(service.getProfile(userDoc._id)).rejects.toMatchObject({
        status: 500,
      });
    });
  });

  describe("update location", () => {
    const locationDto = { latitude: 48.85, longitude: 2.35 };

    it("stores the authenticated user location as GeoJSON", async () => {
      Mock(UserTestModel).toReturn(
        {
          ...userDoc,
          location: { type: "Point", coordinates: [2.35, 48.85] },
        },
        "findOneAndUpdate",
      );

      const result = await service.updateLocation(userDoc._id, locationDto);

      expect(result.location).toEqual({
        type: "Point",
        coordinates: [2.35, 48.85],
      });
      expect(result).not.toHaveProperty("password");
    });

    it("throws NotFoundException when updating a missing user", async () => {
      Mock(UserTestModel).toReturn(null, "findOneAndUpdate");

      await expect(
        service.updateLocation(userDoc._id, locationDto),
      ).rejects.toThrow(NotFoundException);
    });

    it("wraps database errors when updating location", async () => {
      Mock(UserTestModel).toReturn(
        new Error("Cannot update location"),
        "findOneAndUpdate",
      );

      await expect(
        service.updateLocation(userDoc._id, locationDto),
      ).rejects.toMatchObject({ status: 500 });
    });
  });

  describe("change authenticated password", () => {
    const passwordDto = {
      currentPassword: "old-password",
      newPassword: "new-password",
    };
    const salt = "0123456789abcdef0123456789abcdef";

    it("changes the password after verifying the current password", async () => {
      const currentPasswordHash = scryptSync(
        passwordDto.currentPassword,
        salt,
        64,
      ).toString("hex");
      let updateFilter;
      let updatePayload;
      Mock(UserTestModel).toReturn(
        {
          ...userDoc,
          salt,
          password: currentPasswordHash,
        },
        "findOne",
      );
      Mock(UserTestModel).toReturn((query) => {
        updateFilter = (query as any).getQuery();
        updatePayload = (query as any).getUpdate();
        return userDoc;
      }, "findOneAndUpdate");

      await expect(
        service.changeAuthenticatedPassword(userDoc._id, passwordDto),
      ).resolves.toBeUndefined();
      expect(updateFilter).toMatchObject({
        _id: userDoc._id,
        password: currentPasswordHash,
        salt,
      });
      expect(updatePayload.$unset).toEqual({ resetToken: 1 });
      expect(updatePayload.$set.salt).not.toBe(salt);
      expect(updatePayload.$set.password).not.toBe(currentPasswordHash);
    });

    it("rejects an incorrect current password", async () => {
      Mock(UserTestModel).toReturn(
        {
          ...userDoc,
          salt,
          password: scryptSync("another-password", salt, 64).toString("hex"),
        },
        "findOne",
      );

      await expect(
        service.changeAuthenticatedPassword(userDoc._id, passwordDto),
      ).rejects.toThrow(UnauthorizedException);
    });

    it.each([
      { password: null, salt },
      {
        password: scryptSync(passwordDto.currentPassword, salt, 64).toString(
          "hex",
        ),
        salt: null,
      },
      { password: "00", salt },
    ])(
      "rejects missing or malformed stored credentials",
      async (credentials) => {
        Mock(UserTestModel).toReturn({ ...userDoc, ...credentials }, "findOne");

        await expect(
          service.changeAuthenticatedPassword(userDoc._id, passwordDto),
        ).rejects.toThrow(UnauthorizedException);
      },
    );

    it("throws NotFoundException when the authenticated user is missing", async () => {
      Mock(UserTestModel).toReturn(null, "findOne");

      await expect(
        service.changeAuthenticatedPassword(userDoc._id, passwordDto),
      ).rejects.toThrow(NotFoundException);
    });

    it("wraps database errors while reading credentials", async () => {
      Mock(UserTestModel).toReturn(
        new Error("Cannot read credentials"),
        "findOne",
      );

      await expect(
        service.changeAuthenticatedPassword(userDoc._id, passwordDto),
      ).rejects.toMatchObject({ status: 500 });
    });

    it("rejects a stale current password if credentials change concurrently", async () => {
      Mock(UserTestModel).toReturn(
        {
          ...userDoc,
          salt,
          password: scryptSync(passwordDto.currentPassword, salt, 64).toString(
            "hex",
          ),
        },
        "findOne",
      );
      Mock(UserTestModel).toReturn(null, "findOneAndUpdate");

      await expect(
        service.changeAuthenticatedPassword(userDoc._id, passwordDto),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("wraps database errors while saving the new password", async () => {
      Mock(UserTestModel).toReturn(
        {
          ...userDoc,
          salt,
          password: scryptSync(passwordDto.currentPassword, salt, 64).toString(
            "hex",
          ),
        },
        "findOne",
      );
      Mock(UserTestModel).toReturn(
        new Error("Cannot save credentials"),
        "findOneAndUpdate",
      );

      await expect(
        service.changeAuthenticatedPassword(userDoc._id, passwordDto),
      ).rejects.toMatchObject({ status: 500 });
    });
  });

  describe("findOne user", () => {
    it("should findOne user", async () => {
      // Given
      Mock(UserTestModel).toReturn(userDoc, "findOne");

      // When
      const result = await service.findOneByEmail("captain.nemo@nautilus.sub");

      //then
      expect(formatMongo(result)).toEqual(userDoc);
    });

    it("should throw HttpException on findOne user", async () => {
      // Given
      Mock(UserTestModel).toReturn(new Error("Cannot findOne user"), "findOne");

      // When
      // Then
      await expect(service.findOneByEmail("nemo@nautilus.sub")).rejects.toThrow(
        HttpException,
      );
    });

    it("should find no user on findOne user", async () => {
      // Given
      Mock(UserTestModel).toReturn(null, "findOne");

      // When
      // Then
      expect(await service.findOneByEmail("nemo@nautilus.sub")).toBeNull();
    });
  });

  describe("findOneAndDelete user", () => {
    it("should findOneAndDelete user", async () => {
      // Given
      Mock(UserTestModel).toReturn(userDoc, "findOneAndDelete");

      // When
      const result = await service.deleteUser({ id: "userId" });

      // Then
      expect(formatMongo(result)).toEqual(userDoc);
    });

    it("should throw HttpException on findOneAndDelete user", async () => {
      // Given
      Mock(UserTestModel).toReturn(
        new Error("Cannot findOneAndDelete"),
        "findOneAndDelete",
      );

      // When
      // Then
      await expect(service.deleteUser(userDeleteDoc)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe("verify user", () => {
    it("should verify user", async () => {
      // Given
      const userVerified = {
        ...userDoc,
        verify: null,
      };
      Mock(UserTestModel).toReturn({ userDoc }, "findOne");
      Mock(UserTestModel).toReturn(userVerified, "findOneAndUpdate");

      // When
      const result = await service.verifyUser("verify");
      // Then
      expect(result.verify).toEqual(userVerified.verify);
    });

    it("should find no user on verify", async () => {
      // Given
      Mock(UserTestModel).toReturn(null, "findOne");
      // When
      // Then
      await expect(service.verifyUser("nemo")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw HttpException on findOne", async () => {
      // Given
      Mock(UserTestModel).toReturn(new Error("cannot findOne"), "findOne");
      // When
      // Then
      await expect(service.verifyUser("nemo")).rejects.toThrow(HttpException);
    });
  });

  describe("reset password", () => {
    it("should reset password", async () => {
      // Given
      Mock(UserTestModel).toReturn(userDoc, "findOne");
      // When
      const result = await service.resetPassword(userDoc.email);
      // Then
      expect(result).toBeTruthy();
      expect(mailServiceMock.sendTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            frontUrl: "http://localhost:4200",
          }),
        }),
      );
    });

    it("should find no user on reset password", async () => {
      // Given
      Mock(UserTestModel).toReturn(null, "findOne");
      // When
      // Then
      await expect(service.resetPassword(userDoc.email)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw HttpException on reset password", async () => {
      // Given
      Mock(UserTestModel).toReturn(new Error("cannot findOne"), "findOne");
      // When
      // Then
      await expect(service.resetPassword(userDoc.email)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe("change password", () => {
    it("should change password", async () => {
      // Given
      const user = {
        ...userDoc,
        password: "newPassword",
      };
      Mock(UserTestModel).toReturn(
        { ...userDoc, resetToken: "resetToken" },
        "findOne",
      );
      Mock(UserTestModel).toReturn(user, "findOneAndUpdate");
      // When
      const result = await service.changePassword("resetToken", "newPassword");
      // Then
      expect(result.password).toEqual(user.password);
    });

    it("should find no user on change password", async () => {
      // Given
      Mock(UserTestModel).toReturn(null, "findOne");
      // When
      // Then
      await expect(
        service.changePassword(userDoc.email, "newPassword"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw HttpException on change password", async () => {
      // Given
      Mock(UserTestModel).toReturn(new Error("Cannot findOne"), "findOne");
      // When
      // Then
      await expect(
        service.changePassword(userDoc.email, "newPassword"),
      ).rejects.toThrow(HttpException);
    });
  });
});
