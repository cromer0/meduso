
import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function queryKeys({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "api_key",
    fields: ["token", "title"],
    filters: { type: "publishable" },
  });
  console.log("PUBLISHABLE_KEYS_JSON_START");
  console.log(JSON.stringify(data));
  console.log("PUBLISHABLE_KEYS_JSON_END");
}
