import path from "path";
import { Modules } from "@medusajs/framework/utils";
import { loadEnv } from "@medusajs/framework/utils";
import { medusaIntegrationTestRunner } from "@medusajs/test-utils";

const rootDir = path.join(__dirname, "../../");
loadEnv("test", rootDir);

jest.setTimeout(240000);

medusaIntegrationTestRunner({
  cwd: rootDir,
  testSuite: ({ api, getContainer }) => {
    let publishableApiKey: string;

    beforeAll(async () => {
      const container = getContainer();
      const apiKeyService = container.resolve(Modules.API_KEY);
      const key = await apiKeyService.createApiKeys({
        title: "Test Storefront Key",
        type: "publishable",
        created_by: "",
      });
      publishableApiKey = key.token;
    });

    describe("Store Products API", () => {
      it("GET /store/products returns a list", async () => {
        const response = await api.get("/store/products", {
          headers: { "x-publishable-api-key": publishableApiKey },
        });
        expect(response.status).toEqual(200);
        expect(response.data).toHaveProperty("products");
        expect(Array.isArray(response.data.products)).toBe(true);
      });
    });

    describe("Store Regions API", () => {
      it("GET /store/regions returns a list", async () => {
        const response = await api.get("/store/regions", {
          headers: { "x-publishable-api-key": publishableApiKey },
        });
        expect(response.status).toEqual(200);
        expect(response.data).toHaveProperty("regions");
        expect(Array.isArray(response.data.regions)).toBe(true);
      });
    });
  },
});
