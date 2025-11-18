const chrome = require("selenium-webdriver/chrome");
const { By, Builder, Browser } = require("selenium-webdriver");
const fs = require("node:fs");
const path = require("path");
const assert = require("assert");
const ua =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:127.0) Gecko/20100101 Firefox/127.0";

const params = {};

process.argv.slice(2).map((arg) => {
  const paramArg = arg.split("=");

  if (paramArg.length > 1) {
    params[paramArg[0]] = paramArg[1];
  }
});

if (!params.id || !params.pwd) {
  console.log("CMD line should contain `id` and `pwd` arguments.");
  return;
}

(async () => {
  let driver;
  let serverData;

  try {
    const options = new chrome.Options().addArguments([
      // "--headless",
      `user-agent="${ua}"`,
    ]);

    driver = await new Builder()
      .forBrowser(Browser.CHROME)
      .setChromeOptions(options)
      .build();

    await driver.get("https://global.hoymiles.com/platform/login");

    const title = await driver.getTitle();
    assert.equal("S-Miles Cloud - Hoymiles Power Electronics Inc.", title);

    await driver.manage().setTimeouts({ implicit: 500 });

    const nameBox = await driver.findElement(By.id("name"));
    const submitButton = await driver.findElement(
      By.className("submit_button")
    );

    await nameBox.sendKeys(params.id);
    driver.executeScript(`
      document.getElementById("password").value = "${params.pwd}";
      document.getElementById("password").dispatchEvent(new Event("input"));

    `);

    //await submitButton.click();
    const actions = driver.actions({ async: true });
    await actions.move({ origin: submitButton }).click().perform();

    await driver.manage().setTimeouts({ implicit: 15000 });

    const actualPower = await driver.findElement(
      // By.css(".percent-right-text .notranslate")
      By.css(".g2-html-annotation")
    );

    const actualPowerText = await actualPower.getText();
    const productToday = await driver.findElement(
      By.css(".detail-power-list > :first-child .notranslate b")
    );
    const productTodayText = await productToday.getText();

    serverData = {
      date: new Date(),
      data: {
        power: /k/.test(actualPowerText)
          ? Number(actualPowerText.replace("kW", ""))
          : Number(actualPowerText.replace("W", "")) / 1000,
        today: Number(productTodayText),
      },
    };

    fs.writeFile(
      path.resolve(__dirname, "../public/data/live/solar.json"),
      JSON.stringify(serverData),
      (err) => {
        if (err) {
          console.error(err);
        }
      }
    );
  } catch (e) {
    console.log(e);
  } finally {
    await driver.quit();
  }
})();
