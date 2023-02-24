export default class Widget {
  constructor(beta = false) {
    this.BETA = beta;

    // * Customize here * //

    // this.LIMIT_1 = 1.00; // When price is above this, it's orange
    // this.LIMIT_2 = 1.50; // When price is above this limit, it's red
    // this.LIMIT_3 = 3.00;
    // this.SUN_LIMIT_1 = 5.00; // When solar is above this, it's white
    // this.SUN_LIMIT_2 = 12.00; // When solar is above this limit, it's yellow
    // this.HIGH_PRICE = 3.5; // Max price for red color
    this.SOLOR_PRODUCER = false;

    // Colors
    // Hex-code for backgroundscolor on widget (#000000 for black)
    this.BACKGROUND_COLOR = "#000000";

    // Hex-code for text color (#FFFFFF for white)
    this.TEXT_COLOR = "#FFFFFF";

    // When price is over average price (red)
    this.TEXT_COLOR_HIGH_PRICE = "#de4035";

    // When price is under average price (green)
    this.TEXT_COLOR_LOW_PRICE = "#35de3b";

    // How many hour to show before and after current hour
    this.BACK_IN_TIME = 3;
    this.FORWARD_IN_TIME = 21;

    // Size on graph
    this.GRAPH_WIDTH = 2400;
    this.GRAPH_HEIGHT = 1200;

    // * Customize end * //

    // Settings From LocalStorage
    this.TIBBER_TOKEN = window.localStorage.getItem("TIBBER_TOKEN");
    this.HOME_NR = window.localStorage.getItem("HOME_NR") ?? 0;
    this.SHOW_GRAPH = this.convertStringToBoolean(
      window.localStorage.getItem("SHOW_GRAPH"),
      true
    );
    this.SHOW_DAY_CONSUMPTION = this.convertStringToBoolean(
      window.localStorage.getItem("SHOW_DAY_CONSUMPTION"),
      true
    );
    this.SHOW_MONTLY_CONSUMPTION = this.convertStringToBoolean(
      window.localStorage.getItem("SHOW_MONTLY_CONSUMPTION"),
      true
    );

    // Calculation variables
    this.minPrice = 10000000;
    this.maxPrice = 0;
    this.avgPrice = 0;
    this.prices = [];
    this.startIndex = 0;
    this.endIndex = 100000;
    this.currentPriceIndex = 0;
    this.allPrices = [];

    this.dayConsumptionCost = 0;
    this.dayConsumptionUse = 0;
    this.dayConsumptionAvgPrice = 0;

    this.monthConsumptionCost = 0;
    this.monthConsumptionUse = 0;
    this.monthConsumptionAvgPrice = 0;

    this.thisHour = new Date();
    this.thisHour.setMinutes(0);
    this.thisHour.setSeconds(0);
    this.thisHour.setMilliseconds(0);

    /* Widget elements */
    this.tibberWidgetEl = document.getElementById("tibber-widget");
    this.headerSpanEl = document.querySelector("#tibber-header span");

    // Widget top section elements
    this.topSectionEl = document.getElementById("widget-top-section");
    this.currentEl = document.getElementById("current");
    this.dayConsumptionEl = document.getElementById("day-consumption");
    this.monthConsumptionEl = document.getElementById("month-consumption");

    // Graph elements
    this.graphSectionEl = document.getElementById("widget-graph-section");
    this.graphDivEl = document.getElementById("graph");

    // Error logs elements
    this.errorLogsEl = document.getElementById("error-logs");

    // Settings elements
    this.tibberTokenEl = document.getElementById("tibber-token");
    this.homeNrEl = document.getElementById("home-nr");
    this.showGraphEl = document.getElementById("show-graph");
    this.showDayConsumptionEl = document.getElementById("show-day-consumption");
    this.showMontlyConsumptionEl = document.getElementById(
      "show-montly-consumption"
    );
    this.settingsButtonEl = document.getElementById("settings-button");
    this.settingsButtonEl.addEventListener(
      "click",
      this.openSettings.bind(this)
    );
    this.saveButton = document.getElementById("save-settings");
    this.saveButton.addEventListener(
      "click",
      this.saveSettingsLocalStorage.bind(this)
    );
    this.cancelButton = document.getElementById("cancel-settings");
    this.cancelButton.addEventListener("click", () => this.toggleWidget(true));

    // Setup graphic
    const body = document.body;
    body.style.background = this.BACKGROUND_COLOR;
    body.style.color = this.TEXT_COLOR;
    document.getElementById("app").className = "dark";

    const links = document.querySelector("a");
    links.style.color = this.TEXT_COLOR;

    this.toggleWidget(!!this.TIBBER_TOKEN);

    if (!!this.TIBBER_TOKEN) {
      this.setupWidget();
    }
  }

  async setupWidget() {
    try {
      const currentPriceEl = document.getElementById("current-price");
      const minimumEl = document.getElementById("minimum");
      const minimumSpan = document.querySelector("#minimum span");
      const maximumEl = document.getElementById("maximum");
      const maximumSpan = document.querySelector("#maximum span");
      const updatedEl = document.getElementById("updated");
      const dayConsumptionCostEl = document.getElementById(
        "day-consumption-cost"
      );
      const dayConsumptionUseEl = document.getElementById(
        "day-consumption-use"
      );
      const dayConsumptionAvgPriceEl = document.getElementById(
        "day-consumption-avg-price"
      );
      const monthConsumptionCostEl = document.getElementById(
        "month-consumption-cost"
      );
      const monthConsumptionUseEl = document.getElementById(
        "month-consumption-use"
      );
      const monthConsumptionAvgPriceEl = document.getElementById(
        "month-consumption-avg-price"
      );

      let priceObject = await this.getCurrentPrice();

      if (!!priceObject) {
        /*
        let priceObject = {
            price: 3.45,
            hour: "20:00"
        }
        */

        // Get min/max price for today and eventually tomorrow (if exists)
        this.calculate();

        currentPriceEl.innerHTML = (priceObject.price * 100).toFixed(0); // 1.35
        currentPriceEl.style.color = this.colorByPrice(priceObject.price * 100);

        minimumSpan.innerText = this.minPrice.toFixed(0);
        minimumEl.style.color = this.colorByPrice(this.minPrice);
        maximumSpan.innerText = this.maxPrice.toFixed(0);
        maximumEl.style.color = this.colorByPrice(this.maxPrice);

        if (this.SHOW_DAY_CONSUMPTION) {
          dayConsumptionCostEl.innerHTML = this.dayConsumptionCost
            .toFixed(2)
            .replace(".", ",");
          dayConsumptionUseEl.innerHTML = this.dayConsumptionUse
            .toFixed(2)
            .replace(".", ",");
          dayConsumptionAvgPriceEl.innerHTML = this.dayConsumptionAvgPrice;
        }

        if (this.SHOW_MONTLY_CONSUMPTION) {
          monthConsumptionCostEl.innerHTML = this.monthConsumptionCost
            .toFixed(2)
            .replace(".", ",");
          monthConsumptionUseEl.innerHTML = this.monthConsumptionUse
            .toFixed(2)
            .replace(".", ",");
          monthConsumptionAvgPriceEl.innerHTML = this.monthConsumptionAvgPrice;
        }

        if (this.SHOW_GRAPH) {
          await this.setupGraph();
        }

        this.setupGraphic();

        updatedEl.innerHTML = priceObject.responseDate.toLocaleTimeString(
          "sv-SE",
          { hour: "2-digit", minute: "2-digit" }
        ); // exemple 20:00
      }
    } catch (e) {
      this.addErrorLog(e);
    }
  }

  async getCurrentPrice(reTry = false) {
    const url = `https://api.tibber.com/v1-beta/gql`;
    const query = `{ \
          viewer { \
          homes { \
              appNickname \
                  address { \
                  address1 \
              } \
              currentSubscription { \
              priceInfo{
                  current{
                      total startsAt
                  }
              }
              priceRating { \
                  hourly { \
                  entries { \
                      total \
                      time \
                  } \
                  } \
              } \
              } \
              dayConsumption: consumption (resolution: HOURLY, last: ${new Date().getHours()}) { \
              pageInfo { \
                  totalConsumption \
                  totalCost \
              } \
              } \
              monthConsumption: consumption (resolution: DAILY, last: ${
                new Date().getDate() - 1
              }) { \
              pageInfo { \
                  totalConsumption \
                  totalCost \
              } \
              } \
          } \
          } \
      }`;

    try {
      const req = await fetch(url, {
        method: "post",
        headers: {
          Authorization: "Bearer " + this.TIBBER_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: query }),
      });

      if (!req || !req.ok) {
        throw "Misslyckades att få data från Tibber, kontrollera token";
      }

      const res = await req.json();

      const responseDate = new Date();
      this.allPrices =
        res.data.viewer.homes[
          this.HOME_NR
        ].currentSubscription.priceRating.hourly.entries;
      const price =
        res.data.viewer.homes[this.HOME_NR].currentSubscription.priceInfo
          .current.total;
      const time =
        res.data.viewer.homes[this.HOME_NR].currentSubscription.priceInfo
          .current.startsAt;
      const date = new Date(time);
      const hour = date.getHours();

      this.dayConsumptionCost =
        res.data.viewer.homes[this.HOME_NR].dayConsumption.pageInfo.totalCost;
      this.dayConsumptionUse =
        res.data.viewer.homes[
          this.HOME_NR
        ].dayConsumption.pageInfo.totalConsumption;

      this.monthConsumptionCost =
        res.data.viewer.homes[this.HOME_NR].monthConsumption.pageInfo.totalCost;
      this.monthConsumptionUse =
        res.data.viewer.homes[
          this.HOME_NR
        ].monthConsumption.pageInfo.totalConsumption;

      return {
        price,
        hour,
        responseDate,
      };
    } catch (e) {
      if (!reTry) {
        setTimeout(() => this.getCurrentPrice(true), 600);
      } else {
        this.addErrorLog(e);
        throw e;
      }
    }
  }

  calculate() {
    this.dayConsumptionAvgPrice = Math.round(
      (this.dayConsumptionCost / this.dayConsumptionUse) * 100
    );
    this.monthConsumptionAvgPrice = Math.round(
      (this.monthConsumptionCost / this.monthConsumptionUse) * 100
    );

    // Loop to find index for current hour
    this.currentPriceIndex = this.allPrices.findIndex(
      (price) => new Date(price.time).getTime() === this.thisHour.getTime()
    );

    this.startIndex = this.currentPriceIndex - this.BACK_IN_TIME;
    this.endIndex = this.currentPriceIndex + this.FORWARD_IN_TIME;
    if (this.endIndex > this.allPrices.length) {
      this.endIndex = this.allPrices.length - 1;
    }

    let avgPrice = 0;
    this.prices = [];
    this.minPrice = 100000000;
    this.maxPrice = 0;

    for (let i = this.startIndex; i <= this.endIndex; i++) {
      //   if (this.SOLOR_PRODUCER) {
      //     this.allPrices[i].total = this.allPrices[i].total+(NETT_KWH/100);
      //   }

      avgPrice += this.allPrices[i].total;
      this.prices.push(Math.round(this.allPrices[i].total * 100));

      if (this.allPrices[i].total * 100 < this.minPrice) {
        this.minPrice = Math.round(this.allPrices[i].total * 100);
      }

      if (this.allPrices[i].total * 100 > this.maxPrice) {
        this.maxPrice = Math.round(this.allPrices[i].total * 100);
      }
    }

    this.avgPrice = Math.round((avgPrice / this.prices.length) * 100);
  }

  setupGraphic() {
    this.toggleWidget(true);

    this.toggleElement(this.dayConsumptionEl, this.SHOW_DAY_CONSUMPTION);
    this.toggleElement(this.monthConsumptionEl, this.SHOW_MONTLY_CONSUMPTION);
    this.toggleElement(this.graphSectionEl, this.SHOW_GRAPH);
    this.toggleElement(this.errorLogsEl, this.BETA);

    this.tibberWidgetEl.classList.toggle(
      "shows-day",
      this.SHOW_DAY_CONSUMPTION
    );
    this.tibberWidgetEl.classList.toggle(
      "shows-montly",
      this.SHOW_MONTLY_CONSUMPTION
    );
    this.tibberWidgetEl.classList.toggle("shows-graph", this.SHOW_GRAPH);
  }

  async setupGraph() {
    // Loop to prepare data for graph
    let colors = [];
    let pointSizes = [];
    let labels = [];

    const nextMidnight = new Date(this.thisHour);
    nextMidnight.setHours(0);
    nextMidnight.setMilliseconds(0);
    nextMidnight.setDate(this.thisHour.getDate() + 1);

    for (let i = this.startIndex; i <= this.endIndex; i++) {
      const date = new Date(this.allPrices[i].time);

      if (i == this.currentPriceIndex) {
        colors.push("'yellow'");
        pointSizes.push(20);
      } else if (nextMidnight.getTime() == date.getTime()) {
        colors.push("'cyan'");
        pointSizes.push(20);
      } else {
        colors.push("'cyan'");
        pointSizes.push(7);
      }

      let hours = date.getHours();
      if (hours < 10) {
        hours = "0" + hours;
      }
      labels.push(`'${hours}'`);
    }

    const avgPrices = this.prices.map((_) => this.avgPrice);

    return await this.getGraph(labels, colors, pointSizes, avgPrices);
  }

  async getGraph(labels, colors, pointSizes, avgPrices, reTry = false) {
    let url =
      "https://quickchart.io/chart?w=" +
      this.GRAPH_WIDTH +
      "&h=" +
      this.GRAPH_HEIGHT +
      "&devicePixelRatio=1.0&c=";
    url += encodeURI(`{ \
    type:'line', \
    data:{ \
        labels:[ \
          ${labels} \
        ], \
        datasets:[ \
          { \
              label:'Öre/kWh ', \
              steppedLine:true, \
              data:[ \
                ${this.prices} \
              ], \
              fill:true, \
              lineTension: 0.4, \
              borderColor:'cyan', \
              borderWidth: 7, \
              backgroundColor: getGradientFillHelper('vertical', ['rgba(35, 187, 208, 0.5)', 'rgba(35, 187, 208, 0.15)', 'rgba(35, 187, 208, 0)']), \
              pointBackgroundColor:[ \
                ${colors} \
              ], \
              pointRadius:[ \
                ${pointSizes} \
              ] \
          }, \
          { \
              label:'Snitt (${this.avgPrice} öre)', \
              data:[ \
                ${avgPrices} \
              ], \
              fill:false, \
              borderColor:'red', \
              borderDash:[2,2], \
              borderWidth: 8, \
              pointRadius: 0 \
          } \
        ] \
    }, \
    options:{ \
        legend:{ \
          labels:{ \
              fontSize:90, \
              fontColor:'white' \
          } \
        }, \
        scales:{ \
          yAxes:[ \
              { \
                ticks:{ \
                  beginAtZero:false, \
                  fontSize:75, \
                  autoSkip:true, \
                  autoSkipPadding:200, \
                  padding:50, \
                  fontColor:'white' \
                } \
              } \
          ], \
          xAxes:[ \
              { \
                ticks:{ \
                  fontSize:75, \
                  autoSkip:true, \
                  autoSkipPadding:200, \
                  padding:80, \
                  fontColor:'white' \
                } \
              } \
          ] \
        } \
    } \
    }`);

    try {
      const response = await fetch(url);

      if (!response || !response.ok) {
        throw "Misslyckades att få graph, testa ladda om sidan.";
      }

      const graphBlob = await response.blob();
      const graphImageObjectURL = URL.createObjectURL(graphBlob);
      const graph = document.createElement("img");
      graph.src = graphImageObjectURL;
      graph.style.width = "450px";
      graph.style.height = "225px";

      this.graphDivEl.innerHTML = null;
      this.graphDivEl.append(graph);
    } catch (e) {
      if (!reTry) {
        setTimeout(
          () => this.getGraph(labels, colors, pointSizes, avgPrices, true),
          5000
        );
      } else {
        this.addErrorLog(e);
        throw e;
      }
    }
  }

  colorByPrice(price) {
    return price <= this.avgPrice
      ? this.TEXT_COLOR_LOW_PRICE
      : this.TEXT_COLOR_HIGH_PRICE;
  }

  saveSettingsLocalStorage() {
    this.TIBBER_TOKEN = this.tibberTokenEl.value;
    this.HOME_NR = this.homeNrEl.value;
    this.SHOW_GRAPH = this.showGraphEl.checked;
    this.SHOW_DAY_CONSUMPTION = this.showDayConsumptionEl.checked;
    this.SHOW_MONTLY_CONSUMPTION = this.showMontlyConsumptionEl.checked;

    window.localStorage.setItem("TIBBER_TOKEN", this.TIBBER_TOKEN);
    window.localStorage.setItem("HOME_NR", this.HOME_NR);
    window.localStorage.setItem("SHOW_GRAPH", this.SHOW_GRAPH);
    window.localStorage.setItem(
      "SHOW_DAY_CONSUMPTION",
      this.SHOW_DAY_CONSUMPTION
    );
    window.localStorage.setItem(
      "SHOW_MONTLY_CONSUMPTION",
      this.SHOW_MONTLY_CONSUMPTION
    );

    if (!this.SHOW_GRAPH) {
      this.graphDivEl.innerHTML = "";
    }

    this.setupWidget();
  }

  toggleWidget(showWidget = true) {
    const widgetSettings = document.getElementById("widget-settings");
    this.toggleElement(widgetSettings, !showWidget);
    this.toggleElement(this.settingsButtonEl, showWidget);
    this.toggleElement(this.tibberWidgetEl, showWidget);
  }

  toggleElement(el, show) {
    el.classList.toggle("hidden", !show);
  }

  openSettings() {
    this.toggleWidget(false);
    this.tibberTokenEl.value = this.TIBBER_TOKEN;
    this.homeNrEl.value = this.HOME_NR;
    this.showGraphEl.checked = this.SHOW_GRAPH;
    this.showDayConsumptionEl.checked = this.SHOW_DAY_CONSUMPTION;
    this.showMontlyConsumptionEl.checked = this.SHOW_MONTLY_CONSUMPTION;

    this.toggleElement(this.cancelButton, true);
  }

  addErrorLog(e) {
    const errorDiv = document.createElement("div");
    errorDiv.innerText = e.toString();
    this.errorLogsEl.append(errorDiv);
  }

  convertStringToBoolean(str, defaultValue) {
    str = str ?? `${defaultValue}`;

    return str === "true";
  }
}
