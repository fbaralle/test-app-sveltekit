/// <reference types="@cloudflare/workers-types" />

declare global {
  namespace App {
    interface Platform {
      env: {
        DB: D1Database;
        SESSIONS: KVNamespace;
        FLAGS: KVNamespace;
        WEBFLOW_CLOUD_MEDIA: R2Bucket;
      };
    }
  }
}

export {};
