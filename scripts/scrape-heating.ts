import { chromium, type Browser, type BrowserContext, type Page } from "playwright"
import { writeFile } from "@/lib/blob-storage"

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

type HeatingData = {
  date: Date
  data: {
    panels: {
      hotSensor: number
      coldSensor: number
    }
    tank: {
      solar: number
      additional: number
      origin: string
      min: number
      confort: number
    }
    boiler: {
      active: boolean
      temperature: number
    }
    radiator: {
      inlet: number
      outlet: number
      origin: string
      min: number
      confort: number
    }
    thermometer: {
      outdoor: number
      indoor: number
    }
  }
}

const formatData = (data: string): number => {
  return Number(
    data.replace(": ", "").replace(" °C", "").replace(",", ".").trim()
  )
}

const originEquivalent: Record<string, string> = {
  Arrêt: "off",
  Solaire: "solar",
  "Solaire + appoint": "gas",
}

export const scrapeHeatingData = async (
  id: string,
  password: string
): Promise<HeatingData> => {
  let browser: Browser | null = null
  let context: BrowserContext | null = null

  try {
    // Utiliser Browserless.io si :
    // 1. On est sur Vercel ET on a la clé API
    // 2. OU si USE_BROWSERLESS=true (pour tester en local)
    const useBrowserless =
      (!!process.env.VERCEL && !!process.env.BROWSERLESS_API_KEY) ||
      (process.env.USE_BROWSERLESS === "true" && !!process.env.BROWSERLESS_API_KEY)

    if (useBrowserless) {
      // Connexion à Browserless.io via WebSocket
      // ⚠️ IMPORTANT : Collez votre clé API Browserless.io dans la variable d'environnement BROWSERLESS_API_KEY
      const browserlessApiKey = process.env.BROWSERLESS_API_KEY
      if (!browserlessApiKey) {
        throw new Error("BROWSERLESS_API_KEY n'est pas définie. Ajoutez-la dans vos variables d'environnement.")
      }

      // URL de connexion Browserless.io (WebSocket pour Playwright)
      // Format : wss://production-<region>.browserless.io/chromium/playwright?token=VOTRE_CLE_API
      // Note: Pour Playwright avec chromium.connect(), on doit utiliser /chromium/playwright dans le chemin
      // Documentation: https://docs.browserless.io/overview/connection-urls
      const browserlessUrl = `wss://production-sfo.browserless.io/chromium/playwright?token=${browserlessApiKey}`

      browser = await chromium.connect(browserlessUrl)
    } else {
      // Utiliser Playwright local en développement
      const browserOptions: Parameters<typeof chromium.launch>[0] = {
        headless: true,
      }

      browser = await chromium.launch(browserOptions)
    }

    // Créer le contexte avec le user agent
    context = await browser.newContext({
      userAgent: USER_AGENT,
    })

    const page: Page = await context.newPage()

    // Navigate to login page
    await page.goto("https://my.solisart.fr/", {
      waitUntil: "networkidle",
      timeout: 60000, // Augmenter le timeout pour Browserless.io
    })

    // Verify page title
    const title = await page.title()
    if (title !== "SolisArt, le Soleil partout avec vous !") {
      throw new Error(`Page title mismatch: ${title}`)
    }

    // Fill login form
    await page.fill('input[name="id"]', id)
    await page.fill('input[name="pass"]', password)
    await page.click('input[name="connexion"]')

    // Wait for navigation after login
    await page.waitForTimeout(1000) // Augmenter le délai
    await page.waitForLoadState("networkidle", { timeout: 30000 })

    // Get parameters area
    const areaBox = await page.locator("#td-parametrage-mode")
    const activeArea = areaBox.locator(".ui-state-active")
    const activeAreaText = (await activeArea.textContent()) || ""

    const areaConfort = await page.locator("#input-parametrage-confort")
    const areaConfortText = (await areaConfort.textContent()) || ""

    const areaMin = await page.locator("#input-parametrage-reduit")
    const areaMinText = (await areaMin.textContent()) || ""

    // Click on ECS button to get ECS parameters
    const ecsButton = page.locator("#header-parametrage-ecs")
    if (await ecsButton.count() > 0) {
      await ecsButton.click()
      await page.waitForTimeout(500)
    }

    // Get ECS parameters
    const activeEcsScript =
      (await page.locator("#td-parametrage-ecs-mode .ui-state-active").textContent()) || ""

    const ecsConfortScript =
      (await page.locator("#input-parametrage-ecs-confort").textContent()) || ""

    const ecsMinScript =
      (await page.locator("#input-parametrage-ecs-reduit").textContent()) || ""

    // Click on Visualization tab
    const visualizationInput = page.locator("label[for='input-pages-visualisation']")
    if (await visualizationInput.count() > 0) {
      await visualizationInput.click()
      await page.waitForTimeout(500)
    }

    // Get temperature values
    const t1 = await page.locator("#temp-valeur-1")
    const t1Text = (await t1.textContent()) || ""

    const t2 = await page.locator("#temp-valeur-2")
    const t2Text = (await t2.textContent()) || ""

    const t3 = await page.locator("#temp-valeur-3")
    const t3Text = (await t3.textContent()) || ""

    const t4 = await page.locator("#temp-valeur-4")
    const t4Text = (await t4.textContent()) || ""

    const t6 = await page.locator("#temp-valeur-6")
    const t6Text = (await t6.textContent()) || ""

    const t7 = await page.locator("#temp-valeur-7")
    const t7Text = (await t7.textContent()) || ""

    const t8 = await page.locator("#temp-valeur-8")
    const t8Text = (await t8.textContent()) || ""

    const t9 = await page.locator("#temp-valeur-9")
    const t9Text = (await t9.textContent()) || ""

    const t11 = await page.locator("#temp-valeur-11")
    const t11Text = (await t11.textContent()) || ""

    const boilerActive = await page.locator("#chaudiere-1-label")
    const boilerActiveText = (await boilerActive.textContent()) || ""

    const serverData: HeatingData = {
      date: new Date(),
      data: {
        panels: {
          hotSensor: formatData(t1Text),
          coldSensor: formatData(t2Text),
        },
        tank: {
          solar: formatData(t3Text),
          additional: formatData(t4Text),
          origin: originEquivalent[activeEcsScript] || activeEcsScript,
          min: formatData(ecsMinScript),
          confort: formatData(ecsConfortScript),
        },
        boiler: {
          active: boilerActiveText === "On",
          temperature: formatData(t6Text),
        },
        radiator: {
          inlet: formatData(t8Text),
          outlet: formatData(t7Text),
          origin: originEquivalent[activeAreaText] || activeAreaText,
          min: formatData(areaMinText),
          confort: formatData(areaConfortText),
        },
        thermometer: {
          outdoor: formatData(t9Text),
          indoor: formatData(t11Text),
        },
      },
    }

    // Save to data directory
    // En local : utilise data/
    // En production : utilise Vercel Blob Storage
    await writeFile("heating.json", JSON.stringify(serverData, null, 2))

    // Fermer le contexte avant de retourner
    if (context) {
      await context.close()
      context = null // Éviter la double fermeture dans finally
    }

    return serverData
  } catch (error) {
    console.error("Error scraping heating data:", error)
    throw error
  } finally {
    // Nettoyer les ressources
    if (context) {
      try {
        await context.close()
      } catch (e) {
        console.error("Error closing context:", e)
      }
    }
    if (browser) {
      try {
        await browser.close()
      } catch (e) {
        console.error("Error closing browser:", e)
      }
    }
  }
}
