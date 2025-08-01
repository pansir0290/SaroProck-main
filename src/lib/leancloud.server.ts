// src/lib/leancloud.server.ts
import AV from "leancloud-storage";

let isInitialized = false;

export function initLeanCloud() {
  if (isInitialized) {
    return;
  }

  const appId = import.meta.env.LEANCLOUD_APP_ID;
  const appKey = import.meta.env.LEANCLOUD_APP_KEY;
  const masterKey = import.meta.env.LEANCLOUD_MASTER_KEY;
  const serverURL = import.meta.env.LEANCLOUD_SERVER_URL;

  if (!appId || !appKey || !serverURL || !masterKey) {
    throw new Error("LeanCloud credentials are not fully configured in environment variables for the server.");
  }

  AV.init({
    appId,
    appKey,
    masterKey, // 使用 Master Key
    serverURL,
  });

  // 使用 Master Key 进行所有后续操作
  AV.Cloud.useMasterKey();

  isInitialized = true;
}
