import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function exportKey({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const { data: keys } = await query.graph({
    entity: "api_key",
    fields: ["token", "title"],
    filters: { type: "publishable" },
  })

  if (keys && keys.length > 0) {
    logger.info(`Found publishable keys: ${JSON.stringify(keys, null, 2)}`)
  } else {
    logger.info("No publishable keys found.")
  }
}
