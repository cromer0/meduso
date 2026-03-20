import { medusaIntegrationTestRunner } from "@medusajs/test-utils";

medusaIntegrationTestRunner({
  testSuite: ({ api }) => {
    describe("Health check", () => {
      it("GET /health returns 200", async () => {
        const response = await api.get("/health");
        expect(response.status).toEqual(200);
      });
    });
  },
});

jest.setTimeout(60 * 1000);
