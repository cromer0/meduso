const { loadEnv } = require("@medusajs/framework/utils");

loadEnv("test", process.cwd());

/** @type {import('jest').Config} */
module.exports = (() => {
  const testType = process.env.TEST_TYPE;

  const commonConfig = {
    transform: {
      "^.+\\.[jt]sx?$": [
        "@swc/jest",
        {
          jsc: {
            parser: {
              syntax: "typescript",
              decorators: true,
            },
            transform: {
              decoratorMetadata: true,
            },
          },
        },
      ],
    },
    testEnvironment: "node",
    moduleFileExtensions: ["js", "ts", "tsx", "json"],
  };

  switch (testType) {
    case "unit":
      return {
        ...commonConfig,
        testMatch: ["**/src/**/__tests__/**/*.unit.spec.[jt]s?(x)"],
      };
    case "integration:http":
      return {
        ...commonConfig,
        testMatch: ["**/integration-tests/http/**/*.spec.[jt]s?(x)"],
        globalSetup: undefined,
        setupFiles: ["./integration-tests/setup.js"],
      };
    case "integration:modules":
      return {
        ...commonConfig,
        testMatch: ["**/src/modules/*/__tests__/**/*.[jt]s?(x)"],
        setupFiles: ["./integration-tests/setup.js"],
      };
    default:
      return {
        ...commonConfig,
        testMatch: ["**/__tests__/**/*.[jt]s?(x)"],
      };
  }
})();
