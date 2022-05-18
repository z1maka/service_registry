const axios = require("axios");


// Another example of implementation CircuitBreaker pattern https://medium.com/geekculture/nodejs-circuit-breaker-pattern-ed6b31896a57
class CircuitBreaker {
  constructor() {
    this.states = {};
    this.failureThreshold = 5;
    this.cooldownPeriod = 10;
    this.requestTimeout = 1;
  }

  callService = async (requestOption) => {
    const endpoint = `${requestOption.method}:${requestOption.url}`;
    const isCanDoRequest = this.canRequest(endpoint);
    if (!isCanDoRequest) return false;

    requestOption.timeout = this.requestTimeout * 1000;

    try {
      const response = await axios(requestOption);
      this.onSuccess(endpoint);
      return response.data;
    } catch (err) {
      this.onFailure(endpoint);
      return false;
    }
  };

  onSuccess = (endpoint) => {
    this.initState(endpoint);
  };

  onFailure = (endpoint) => {
    const state = this.states[endpoint];
    state.failures += 1;
    if (state.failures > this.failureThreshold) {
      state.circuit = "OPEN";
      state.nextTry = new Date() / 1000 + this.cooldownPeriod;
      console.log(`ALERT! Circuit for ${endpoint} is in state 'OPEN'`);
    }
  };

  canRequest = (endpoint) => {
    if (!this.states[endpoint]) this.initState(endpoint);

    const state = this.states[endpoint];

    if (state.circuit === "CLOSED") return true;

    const now = new Date() / 1000;
    if (state.nextTry <= now) {
      state.circuit = "HALF";
      return true;
    }

    return false;
  };

  initState = (endpoint) => {
    this.states[endpoint] = {
      failures: 0,
      cooldownPeriod: this.cooldownPeriod,
      circuit: "CLOSED",
      nextTry: 0,
    };
  };
}

module.exports = CircuitBreaker;
