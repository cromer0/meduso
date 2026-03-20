import path from "path";
import { loadEnv } from "@medusajs/framework/utils";
import { medusaIntegrationTestRunner } from "@medusajs/test-utils";

const rootDir = path.join(__dirname, "../../");
loadEnv("test", rootDir);

jest.setTimeout(240000);

medusaIntegrationTestRunner({
  cwd: rootDir,
  testSuite: ({ api }) => {
    describe("Health check", () => {
      it("GET /health returns 200", async () => {
        const response = await api.get("/health");
        expect(response.status).toEqual(200);
      });
    });
  },
});
