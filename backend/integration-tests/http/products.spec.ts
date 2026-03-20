import { medusaIntegrationTestRunner } from "@medusajs/test-utils";

medusaIntegrationTestRunner({
  testSuite: ({ api }) => {
    describe("Store Products API", () => {
      it("GET /store/products returns a list", async () => {
        const response = await api.get("/store/products");
        expect(response.status).toEqual(200);
        expect(response.data).toHaveProperty("products");
        expect(Array.isArray(response.data.products)).toBe(true);
      });
    });

    describe("Store Regions API", () => {
      it("GET /store/regions returns a list", async () => {
        const response = await api.get("/store/regions");
        expect(response.status).toEqual(200);
        expect(response.data).toHaveProperty("regions");
        expect(Array.isArray(response.data.regions)).toBe(true);
      });
    });
  },
});

jest.setTimeout(60 * 1000);
