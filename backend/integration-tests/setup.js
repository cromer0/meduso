const { MetadataStorage } = require("@mikro-orm/core");
const { loadEnv } = require("@medusajs/framework/utils");
const { parse } = require("pg-connection-string");

loadEnv("test", process.cwd());

if (process.env.DATABASE_URL) {
  const config = parse(process.env.DATABASE_URL);
  if (config.password) {
    process.env.PGPASSWORD = config.password;
    process.env.PGUSER = config.user;
    process.env.PGDATABASE = config.database;
    process.env.PGHOST = config.host;
    process.env.PGPORT = config.port;
  }
}

MetadataStorage.clear();
jest.setTimeout(240000);
