import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();

export const healthCheck = onRequest((request, response) => {
  logger.info("EleccionesEPN Functions Health Check", { structuredData: true });
  response.send({ status: "ok", timestamp: new Date().toISOString() });
});
