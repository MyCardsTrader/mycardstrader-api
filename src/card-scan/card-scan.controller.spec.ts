import { CardScanController } from "./card-scan.controller";
import { CardScanService } from "./card-scan.service";
import { CardScanStatus } from "./card-scan.types";
describe("CardScanController", () => {
  const service = {
    createScan: jest.fn(),
    listScans: jest.fn(),
    getScan: jest.fn(),
    qualifyCard: jest.fn(),
    markImported: jest.fn(),
  };
  const req = { user: { userId: "user-1" } };
  let controller: CardScanController;
  beforeEach(() => {
    jest.clearAllMocks();
    controller = new CardScanController(service as unknown as CardScanService);
  });
  it("delegates scan creation with the authenticated user", async () => {
    const image = { buffer: Buffer.from("x"), mimetype: "image/png", size: 1 };
    service.createScan.mockResolvedValue({ id: "scan-1" });
    await controller.createScan(req, image);
    expect(service.createScan).toHaveBeenCalledWith("user-1", image);
  });
  it("delegates owned scan listing", async () => {
    service.listScans.mockResolvedValue([]);
    await controller.listScans(req, { status: CardScanStatus.NEEDS_REVIEW });
    expect(service.listScans).toHaveBeenCalledWith(
      "user-1",
      CardScanStatus.NEEDS_REVIEW,
    );
  });
  it("delegates owned scan retrieval", async () => {
    service.getScan.mockResolvedValue({});
    await controller.getScan(req, "scan-1");
    expect(service.getScan).toHaveBeenCalledWith("user-1", "scan-1");
  });
  it("delegates imported scan completion", async () => {
    service.markImported.mockResolvedValue({});
    await controller.markImported(req, "scan-1");
    expect(service.markImported).toHaveBeenCalledWith("user-1", "scan-1");
  });
  it("delegates qualification using only a Scryfall id", async () => {
    service.qualifyCard.mockResolvedValue({});
    await controller.qualifyCard(req, "scan-1", "card-1", {
      scryfallId: "11111111-1111-4111-8111-111111111111",
    });
    expect(service.qualifyCard).toHaveBeenCalledWith(
      "user-1",
      "scan-1",
      "card-1",
      "11111111-1111-4111-8111-111111111111",
    );
  });
});
