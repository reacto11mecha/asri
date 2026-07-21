// instrumentation.ts
import { registerOTel } from "@vercel/otel";

export function register() {
  registerOTel({
    serviceName: "asri-web",
    attributes: {
      "deployment.environment": process.env.NODE_ENV || "production",
    },
  });
}
