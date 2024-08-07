// config.js
import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export default {
  development: {
    useHttps: process.env.USEHTTPS,
    username: process.env.PGUSER_DEV,
    password: process.env.PGPASSWORD_DEV,
    database: process.env.PGDATABASE,
    logging: false, // Desativa todos os logs SQL
    host: process.env.PGHOST_DEV,
    port: process.env.PGPORT,
    dialect: "postgres",
    dialectOptions: {
      ssl: false,
    },
    pbxConfig: {
      pbxType: process.env.PBXTYPE,
      host: process.env.PBXURL,
      customHeaders: process.env.CUSTOMHEADERS,
      usernameEpygi: process.env.USEREPYGI,
      passwordEpygi: process.env.PASSWORDEPYGI,
      restPeerIP: process.env.PEEREPYGI,
    },
  },
  production: {
    useHttps: process.env.USEHTTPS,
    username: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    logging: false, // Desativa todos os logs SQL
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    dialect: "postgres",
    dialectOptions: {
      ssl: false,
    },
    pbxConfig: {
      pbxType: process.env.PBXTYPE,
      host: process.env.PBXURL,
      customHeaders: process.env.CUSTOMHEADERS,
      usernameEpygi: process.env.USEREPYGI,
      passwordEpygi: process.env.PASSWORDEPYGI,
      restPeerIP: process.env.PEEREPYGI,
    },
  },
};
