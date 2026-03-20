import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresStep,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";

const updateStoreCurrencies = createWorkflow(
  "update-store-currencies",
  (input: {
    supported_currencies: { currency_code: string; is_default?: boolean }[];
    store_id: string;
  }) => {
    const normalizedInput = transform({ input }, (data) => ({
      selector: { id: data.input.store_id },
      update: {
        supported_currencies: data.input.supported_currencies.map((c) => ({
          currency_code: c.currency_code,
          is_default: c.is_default ?? false,
        })),
      },
    }));
    const stores = updateStoresStep(normalizedInput);
    return new WorkflowResponse(stores);
  }
);

export default async function seedDemoData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService = container.resolve(Modules.STORE);

  // ── Store ──────────────────────────────────────────────────────────
  logger.info("Seeding store data...");
  const [store] = await storeModuleService.listStores();

  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  });

  if (!defaultSalesChannel.length) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [{ name: "Default Sales Channel" }],
      },
    });
    defaultSalesChannel = result;
  }

  await updateStoreCurrencies(container).run({
    input: {
      store_id: store.id,
      supported_currencies: [
        { currency_code: "eur", is_default: true },
        { currency_code: "usd" },
      ],
    },
  });

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        name: "Meduso Store",
        default_sales_channel_id: defaultSalesChannel[0].id,
      },
    },
  });
  logger.info("Finished seeding store data.");

  // ── Regions ────────────────────────────────────────────────────────
  logger.info("Seeding regions...");
  const europeCountries = ["es", "fr", "de", "it", "pt", "nl", "be"];
  const naCountries = ["us", "ca"];

  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Europe",
          currency_code: "eur",
          countries: europeCountries,
          payment_providers: ["pp_system_default"],
        },
        {
          name: "North America",
          currency_code: "usd",
          countries: naCountries,
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  });
  const europeRegion = regionResult.find((r) => r.name === "Europe")!;
  const naRegion = regionResult.find((r) => r.name === "North America")!;
  logger.info("Finished seeding regions.");

  // ── Tax regions ────────────────────────────────────────────────────
  logger.info("Seeding tax regions...");
  await createTaxRegionsWorkflow(container).run({
    input: [...europeCountries, ...naCountries].map((country_code) => ({
      country_code,
      provider_id: "tp_system",
    })),
  });
  logger.info("Finished seeding tax regions.");

  // ── Stock locations ────────────────────────────────────────────────
  logger.info("Seeding stock locations...");
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "European Warehouse",
          address: {
            city: "Madrid",
            country_code: "ES",
            address_1: "Calle Gran Vía 1",
          },
        },
        {
          name: "US Warehouse",
          address: {
            city: "New York",
            country_code: "US",
            address_1: "350 Fifth Avenue",
          },
        },
      ],
    },
  });
  const euWarehouse = stockLocationResult.find(
    (l) => l.name === "European Warehouse"
  )!;
  const usWarehouse = stockLocationResult.find(
    (l) => l.name === "US Warehouse"
  )!;

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: { default_location_id: euWarehouse.id },
    },
  });

  // Link both warehouses to fulfillment provider
  for (const loc of [euWarehouse, usWarehouse]) {
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: loc.id },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
    });
  }

  // Link both to default sales channel
  for (const loc of [euWarehouse, usWarehouse]) {
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: loc.id, add: [defaultSalesChannel[0].id] },
    });
  }
  logger.info("Finished seeding stock locations.");

  // ── Fulfillment & Shipping ─────────────────────────────────────────
  logger.info("Seeding fulfillment data...");
  const shippingProfiles =
    await fulfillmentModuleService.listShippingProfiles({ type: "default" });
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null;

  if (!shippingProfile) {
    const { result } = await createShippingProfilesWorkflow(container).run({
      input: {
        data: [{ name: "Default Shipping Profile", type: "default" }],
      },
    });
    shippingProfile = result[0];
  }

  // European fulfillment set
  const euFulfillmentSet =
    await fulfillmentModuleService.createFulfillmentSets({
      name: "European Warehouse delivery",
      type: "shipping",
      service_zones: [
        {
          name: "Europe",
          geo_zones: europeCountries.map((c) => ({
            country_code: c,
            type: "country",
          })),
        },
      ],
    });

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: euWarehouse.id },
    [Modules.FULFILLMENT]: { fulfillment_set_id: euFulfillmentSet.id },
  });

  // US fulfillment set
  const usFulfillmentSet =
    await fulfillmentModuleService.createFulfillmentSets({
      name: "US Warehouse delivery",
      type: "shipping",
      service_zones: [
        {
          name: "North America",
          geo_zones: naCountries.map((c) => ({
            country_code: c,
            type: "country",
          })),
        },
      ],
    });

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: usWarehouse.id },
    [Modules.FULFILLMENT]: { fulfillment_set_id: usFulfillmentSet.id },
  });

  const shippingRules = [
    { attribute: "enabled_in_store", value: "true", operator: "eq" as const },
    { attribute: "is_return", value: "false", operator: "eq" as const },
  ];

  await createShippingOptionsWorkflow(container).run({
    input: [
      // EU Standard
      {
        name: "Envío Estándar",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: euFulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard",
          description: "Entrega en 3-5 días laborables.",
          code: "standard",
        },
        prices: [
          { currency_code: "eur", amount: 499 },
          { currency_code: "usd", amount: 599 },
          { region_id: europeRegion.id, amount: 499 },
        ],
        rules: shippingRules,
      },
      // EU Express
      {
        name: "Envío Express",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: euFulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Express",
          description: "Entrega en 1-2 días laborables.",
          code: "express",
        },
        prices: [
          { currency_code: "eur", amount: 999 },
          { currency_code: "usd", amount: 1299 },
          { region_id: europeRegion.id, amount: 999 },
        ],
        rules: shippingRules,
      },
      // US Standard
      {
        name: "Standard Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: usFulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard",
          description: "Delivery in 5-7 business days.",
          code: "us-standard",
        },
        prices: [
          { currency_code: "usd", amount: 599 },
          { currency_code: "eur", amount: 499 },
          { region_id: naRegion.id, amount: 599 },
        ],
        rules: shippingRules,
      },
      // US Express
      {
        name: "Express Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: usFulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Express",
          description: "Delivery in 2-3 business days.",
          code: "us-express",
        },
        prices: [
          { currency_code: "usd", amount: 1299 },
          { currency_code: "eur", amount: 999 },
          { region_id: naRegion.id, amount: 1299 },
        ],
        rules: shippingRules,
      },
    ],
  });
  logger.info("Finished seeding fulfillment data.");

  // ── Publishable API Key ────────────────────────────────────────────
  logger.info("Seeding publishable API key...");
  const { data: existingKeys } = await query.graph({
    entity: "api_key",
    fields: ["id"],
    filters: { type: "publishable" },
  });

  let publishableApiKey = existingKeys?.[0];

  if (!publishableApiKey) {
    const {
      result: [key],
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          { title: "Storefront", type: "publishable", created_by: "" },
        ],
      },
    });
    publishableApiKey = key;
  }

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: publishableApiKey.id, add: [defaultSalesChannel[0].id] },
  });
  logger.info("Finished seeding publishable API key.");

  // ── Product Categories ─────────────────────────────────────────────
  logger.info("Seeding product categories...");
  const { result: categoryResult } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: [
        { name: "Camisetas", is_active: true },
        { name: "Sudaderas", is_active: true },
        { name: "Pantalones", is_active: true },
        { name: "Accesorios", is_active: true },
      ],
    },
  });

  const catId = (name: string) =>
    categoryResult.find((c) => c.name === name)!.id;
  logger.info("Finished seeding product categories.");

  // ── Products ───────────────────────────────────────────────────────
  logger.info("Seeding products...");
  const salesChannels = [{ id: defaultSalesChannel[0].id }];

  const sizeValues = ["S", "M", "L", "XL"];
  const sizesOnly = [{ title: "Size", values: sizeValues }];

  function sizeVariants(
    prefix: string,
    eurPrice: number,
    usdPrice: number
  ) {
    return sizeValues.map((size) => ({
      title: size,
      sku: `${prefix}-${size}`,
      options: { Size: size },
      prices: [
        { amount: eurPrice, currency_code: "eur" },
        { amount: usdPrice, currency_code: "usd" },
      ],
    }));
  }

  function sizeColorVariants(
    prefix: string,
    colors: string[],
    eurPrice: number,
    usdPrice: number
  ) {
    const variants: any[] = [];
    for (const size of sizeValues) {
      for (const color of colors) {
        variants.push({
          title: `${size} / ${color}`,
          sku: `${prefix}-${size}-${color.toUpperCase()}`,
          options: { Size: size, Color: color },
          prices: [
            { amount: eurPrice, currency_code: "eur" },
            { amount: usdPrice, currency_code: "usd" },
          ],
        });
      }
    }
    return variants;
  }

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Camiseta Clásica",
          handle: "camiseta-clasica",
          description:
            "Camiseta de algodón 100% con corte clásico. Suave al tacto y perfecta para el día a día.",
          category_ids: [catId("Camisetas")],
          weight: 200,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          options: [
            { title: "Size", values: sizeValues },
            { title: "Color", values: ["Negro", "Blanco"] },
          ],
          variants: sizeColorVariants("CCLASICA", ["Negro", "Blanco"], 2499, 2999),
          sales_channels: salesChannels,
        },
        {
          title: "Camiseta Premium",
          handle: "camiseta-premium",
          description:
            "Camiseta de algodón orgánico premium. Tejido denso y acabado superior.",
          category_ids: [catId("Camisetas")],
          weight: 250,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          options: [
            { title: "Size", values: sizeValues },
            { title: "Color", values: ["Azul", "Rojo"] },
          ],
          variants: sizeColorVariants("CPREMIUM", ["Azul", "Rojo"], 3499, 3999),
          sales_channels: salesChannels,
        },
        {
          title: "Sudadera Básica",
          handle: "sudadera-basica",
          description:
            "Sudadera sin capucha de algodón cepillado. Cálida y cómoda.",
          category_ids: [catId("Sudaderas")],
          weight: 450,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          options: sizesOnly,
          variants: sizeVariants("SBASICA", 4999, 5499),
          sales_channels: salesChannels,
        },
        {
          title: "Sudadera Con Capucha",
          handle: "sudadera-capucha",
          description:
            "Hoodie de algodón orgánico con bolsillo canguro y capucha ajustable.",
          category_ids: [catId("Sudaderas")],
          weight: 550,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          options: sizesOnly,
          variants: sizeVariants("SCAPUCHA", 5999, 6499),
          sales_channels: salesChannels,
        },
        {
          title: "Pantalón Jogger",
          handle: "pantalon-jogger",
          description:
            "Pantalón jogger de corte slim con puños elásticos y cintura ajustable.",
          category_ids: [catId("Pantalones")],
          weight: 400,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          options: sizesOnly,
          variants: sizeVariants("JOGGER", 3999, 4499),
          sales_channels: salesChannels,
        },
        {
          title: "Shorts Deportivos",
          handle: "shorts-deportivos",
          description:
            "Shorts ligeros con tejido transpirable. Ideales para deporte y tiempo libre.",
          category_ids: [catId("Pantalones")],
          weight: 200,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          options: sizesOnly,
          variants: sizeVariants("SHORTS", 2999, 3499),
          sales_channels: salesChannels,
        },
        {
          title: "Gorra Logo",
          handle: "gorra-logo",
          description:
            "Gorra de algodón con logo bordado y cierre ajustable trasero.",
          category_ids: [catId("Accesorios")],
          weight: 100,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          options: [{ title: "Color", values: ["Negro", "Blanco"] }],
          variants: [
            {
              title: "Negro",
              sku: "GORRA-NEGRO",
              options: { Color: "Negro" },
              prices: [
                { amount: 1999, currency_code: "eur" },
                { amount: 2299, currency_code: "usd" },
              ],
            },
            {
              title: "Blanco",
              sku: "GORRA-BLANCO",
              options: { Color: "Blanco" },
              prices: [
                { amount: 1999, currency_code: "eur" },
                { amount: 2299, currency_code: "usd" },
              ],
            },
          ],
          sales_channels: salesChannels,
        },
        {
          title: "Tote Bag",
          handle: "tote-bag",
          description:
            "Bolsa tote de algodón reciclado con asas reforzadas. Perfecta para el día a día.",
          category_ids: [catId("Accesorios")],
          weight: 150,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          options: [{ title: "Color", values: ["Negro"] }],
          variants: [
            {
              title: "Negro",
              sku: "TOTE-NEGRO",
              options: { Color: "Negro" },
              prices: [
                { amount: 1499, currency_code: "eur" },
                { amount: 1799, currency_code: "usd" },
              ],
            },
          ],
          sales_channels: salesChannels,
        },
      ],
    },
  });
  logger.info("Finished seeding products.");

  // ── Inventory ──────────────────────────────────────────────────────
  logger.info("Seeding inventory levels...");
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  const inventoryLevels: CreateInventoryLevelInput[] = [];
  for (const item of inventoryItems) {
    for (const loc of [euWarehouse, usWarehouse]) {
      inventoryLevels.push({
        location_id: loc.id,
        stocked_quantity: 100000,
        inventory_item_id: item.id,
      });
    }
  }

  await createInventoryLevelsWorkflow(container).run({
    input: { inventory_levels: inventoryLevels },
  });
  logger.info("Finished seeding inventory levels.");

  logger.info("🎉 Seed complete! Demo data ready.");
}
