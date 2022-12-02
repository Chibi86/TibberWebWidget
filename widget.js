class Widget {
  constructor() {    
    // * Customize here * //

    // this.LIMIT_1 = 1.00; // When price is above this, it's orange
    // this.LIMIT_2 = 1.50; // When price is above this limit, it's red
    // this.LIMIT_3 = 3.00;
    // this.SUN_LIMIT_1 = 5.00; // When solar is above this, it's white
    // this.SUN_LIMIT_2 = 12.00; // When solar is above this limit, it's yellow
    // this.HIGH_PRICE = 3.5; // Max price for red color
    this.HOME_NR = 0;
    this.SOLOR_PRODUCER = false;

    // Colors
    // HTML-koden for bakgrunnsfarge på widget (#000000 er svart)
    this.BACKGROUND_COLOR = "#000000";

    // HTML-koden for tekstfarge (#FFFFFF er hvit)
    this.TEXT_COLOR = "#FFFFFF";

    // When price is over average price (red)
    this.TEXT_COLOR_HIGH_PRICE = "#de4035";

    // When price is same or under average price (green)
    this.TEXT_COLOR_LOW_PRICE = "#35de3b";

    // How many hour to show before and after current hour
    this.BACK_IN_TIME = 3;
    this.FORWARD_IN_TIME = 21;

    // Size on graph
    this.GRAPH_WIDTH = 2400;
    this.GRAPH_HEIGHT = 1200;

    // * Customize end * //

    // Set by settingspage From LocalStorage
    this.TIBBER_TOKEN = window.localStorage.getItem('TIBBER_TOKEN');

    // Calculation variables
    this.minPrice = 10000000;
    this.maxPrice = 0;
    this.avgPrice = 0;
    this.prices = [];
    this.startIndex = 0;
    this.endIndex = 100000;
    this.currentPriceIndex = 0;
    this.allPrices = [];

    this.thisHour = new Date()
    this.thisHour.setMinutes(0);
    this.thisHour.setSeconds(0);
    this.thisHour.setMilliseconds(0);

    // Settings variables
    this.tibberTokenEl = document.getElementById('tibber-token');
    this.settingsButton = document.getElementById('settings-button');
    this.settingsButton.addEventListener('click', this.openSettings.bind(this));
    this.saveButton = document.getElementById('save-settings');
    this.saveButton.addEventListener('click', this.saveSettingsLocalStorage.bind(this));
    this.cancelButton = document.getElementById('cancel-settings');
    this.cancelButton.addEventListener('click', () => this.toggleWidget(true));

    // Setup graphic
    const body = document.body;
    body.style.background = this.BACKGROUND_COLOR;
    body.style.color = this.TEXT_COLOR;
    
    const links = document.querySelector('a');
    links.style.color = this.TEXT_COLOR;

    this.toggleWidget(!!this.TIBBER_TOKEN);

    if(!!this.TIBBER_TOKEN) {
      this.setupWidget();
    }
  }

  async setupWidget() {
    const priceEl = document.getElementById("price");
    const minimumEl = document.getElementById("minimum");
    const maximumEl = document.getElementById("maximum");
    const updatedEl = document.getElementById("updated");
    const dayConsumptionCostEl = document.getElementById("day-consumption-cost");
    const dayConsumptionUseEl = document.getElementById("day-consumption-use");
    const monthConsumptionCostEl = document.getElementById("month-consumption-cost");
    const monthConsumptionUseEl = document.getElementById("month-consumption-use");

    let priceObject = await this.getCurrentPrice();

    /*
    let priceObject = {
        price: 3.45,
        hour: "20:00"
    }
    */
    priceEl.innerHTML = (priceObject.price * 100).toFixed(0); // 1.35
    priceEl.style.color = this.colorByPrice(priceObject.price);

    updatedEl.innerHTML = priceObject.responseDate.toLocaleTimeString("sv-SE", { hour: '2-digit', minute: '2-digit' }); // exemple 20:00

    // Get min/max price for today and eventually tomorrow (if exists)
    this.calculate();

    minimumEl.innerText = (this.minPrice).toFixed(0);
    minimumEl.style.color = this.colorByPrice(this.minPrice);
    maximumEl.innerText = (this.maxPrice).toFixed(0);
    maximumEl.style.color = this.colorByPrice(this.maxPrice);

    dayConsumptionCostEl.innerHTML = priceObject.dayConsumption.totalCost.toFixed(2).replace('.', ',');
    dayConsumptionUseEl.innerHTML = priceObject.dayConsumption.totalConsumption.toFixed(2).replace('.', ',');

    monthConsumptionCostEl.innerHTML = priceObject.monthConsumption.totalCost.toFixed(2).replace('.', ',');
    monthConsumptionUseEl.innerHTML = priceObject.monthConsumption.totalConsumption.toFixed(2).replace('.', ',');

    await this.setupGraph();
  }

  async getCurrentPrice() {
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
              monthConsumption: consumption (resolution: DAILY, last: ${new Date().getDate()-1}) { \
              pageInfo { \
                  totalConsumption \
                  totalCost \
              } \
              } \
          } \
          } \
      }`;

      const req = await fetch(url, {
          method: 'post',
          headers: { 
              "Authorization": "Bearer " + this.TIBBER_TOKEN,
              "Content-Type": "application/json"
          },
          body: JSON.stringify({query: query})
      });

      const res = await req.json();
      console.log(res);
      const responseDate = new Date();
      this.allPrices = res.data.viewer.homes[this.HOME_NR].currentSubscription.priceRating.hourly.entries;
      const price = res.data.viewer.homes[0].currentSubscription.priceInfo.current.total;
      const time = res.data.viewer.homes[0].currentSubscription.priceInfo.current.startsAt;
      const date = new Date(time);
      const hour = date.getHours();
      const dayConsumption = res.data.viewer.homes[0].dayConsumption.pageInfo;
      const monthConsumption = res.data.viewer.homes[0].monthConsumption.pageInfo;

      return {
          price,
          hour,
          dayConsumption,
          monthConsumption,
          responseDate
      };
  }

  calculate() {
    // Loop to find index for current hour
    this.currentPriceIndex = this.allPrices
      .findIndex(price => new Date(price.time).getTime() === this.thisHour.getTime());

    this.startIndex = (this.currentPriceIndex - this.BACK_IN_TIME);
    this.endIndex = (this.currentPriceIndex + this.FORWARD_IN_TIME);
    if (this.endIndex > this.allPrices.length) {
      this.endIndex = (this.allPrices.length-1)
    }

    for (let i = this.startIndex; i <= this.endIndex; i++) {
      //   if (this.SOLOR_PRODUCER) {
      //     this.allPrices[i].total = this.allPrices[i].total+(NETT_KWH/100);
      //   }

      this.avgPrice += this.allPrices[i].total
      this.prices.push(Math.round(this.allPrices[i].total * 100));

      if (this.allPrices[i].total * 100 < this.minPrice) {
        this.minPrice = Math.round(this.allPrices[i].total * 100);
      }

      if (this.allPrices[i].total * 100 > this.maxPrice) {
        this.maxPrice = Math.round(this.allPrices[i].total * 100);
      }
    }

    this.avgPrice = Math.round(this.avgPrice / (this.prices.length) * 100);
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
      }
      else if (nextMidnight.getTime() == date.getTime()) {
        colors.push("'cyan'");
        pointSizes.push(20);
      }
      else {
        colors.push("'cyan'");
        pointSizes.push(7);
      }

      let hours = date.getHours();
      if (hours < 10) {
        hours = "0" + hours;
      }
      labels.push(`'${hours}'`);
    }

    const avgPrices = this.prices.map(_ => this.avgPrice);

    return await this.getGraph(labels, colors, pointSizes, avgPrices);
  }

  async getGraph(labels, colors, pointSizes, avgPrices) {
    let url = "https://quickchart.io/chart?w="+ this.GRAPH_WIDTH + "&h=" + this.GRAPH_HEIGHT + "&devicePixelRatio=1.0&c="
    url += encodeURI(`{ \
    type:'line', \
    data:{ \
        labels:[ \
          ${labels} \
        ], \
        datasets:[ \
          { \
              label:'Öre per kWh', \
              steppedLine:true, \
              data:[ \
                ${this.prices} \
              ], \
              fill:false, \
              borderColor:'cyan', \
              borderWidth: 7, \
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
              borderWidth: 7, \
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
                    fontSize:100, \
                    fontColor:'white' \
                } \
              } \
          ], \
          xAxes:[ \
              { \
                ticks:{ \
                    fontSize:60, \
                    fontColor:'white' \
                } \
              } \
          ] \
        } \
    } \
    }`);

    const response = await fetch(url);
    const graphBlob = await response.blob();
    const graphImageObjectURL = URL.createObjectURL(graphBlob);
    const graph = document.createElement('img');
    graph.src = graphImageObjectURL;
    graph.style.width = "450px";
    graph.style.height = "225px";

    const graphDivEl = document.getElementById("graph");
    graphDivEl.innerHTML = null;
    graphDivEl.append(graph);
  }

  colorByPrice(price) {
    // const capPrice = price > this.maxPrice ? this.maxPrice : price;
    // return this.lerpColor("#de4035","#35de3b", capPrice / this.maxPrice);

    return price <= this.avgPrice ? this.TEXT_COLOR_LOW_PRICE : this.TEXT_COLOR_HIGH_PRICE;
  }

  // lerpColor(a, b, amount) {

  //     var ah = parseInt(a.replace(/#/g, ''), 16),
  //         ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
  //         bh = parseInt(b.replace(/#/g, ''), 16),
  //         br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
  //         rr = ar + amount * (br - ar),
  //         rg = ag + amount * (bg - ag),
  //         rb = ab + amount * (bb - ab);

  //     return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + rb | 0).toString(16).slice(1);
  // }

  saveSettingsLocalStorage() {
    const tibberTokenEl = document.getElementById('tibber-token');
    const tibberToken = tibberTokenEl.value;
    window.localStorage.setItem('TIBBER_TOKEN', tibberToken);
  
    this.TIBBER_TOKEN = tibberToken;

    this.setupWidget();
    this.toggleWidget(true);
  };

  toggleWidget(showWidget = true) {
    const widgetSettings = document.getElementById('widget-settings');
    widgetSettings.style.display = showWidget ? 'none' : 'block';

    this.settingsButton.style.display = showWidget ? 'block' : 'none';
  
    const tibberWidget = document.getElementById('tibber-widget');
    tibberWidget.style.display = showWidget ? 'block' : 'none';
  }

  openSettings() {
    this.toggleWidget(false);
    this.tibberTokenEl.value = this.TIBBER_TOKEN;
    this.cancelButton.style.display = 'block';
  }
}

window.onload = () => {
  new Widget();
}