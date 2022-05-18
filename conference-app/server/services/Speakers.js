const axios = require("axios");
const url = require("url");
const crypto = require("crypto");
const fs = require("fs");
const util = require("util");

const fsExists = util.promisify(fs.exists);

const CircuitBreaker = require("../lib/CircuitBreaker");

const circuitBreaker = new CircuitBreaker();

class SpeakersService {
  constructor(serviceRegistryUrl, serviceVersionIdentifier) {
    this.serviceRegistryUrl = serviceRegistryUrl;
    this.serviceVersionIdentifier = serviceVersionIdentifier;
    this.cache = {};
  }

  getImage = async (path) => {
    const { ip, port } = await this.getService("speakers-service");
    return this.callService({
      method: "get",
      responseType: "stream",
      url: `http://${ip}:${port}/images/${path}`,
    });
  };

  async getNames() {
    const { ip, port } = await this.getService("speakers-service");
    return this.callService({
      method: "get",
      url: `http://${ip}:${port}/names`,
    });
  }

  async getListShort() {
    const { ip, port } = await this.getService("speakers-service");
    return this.callService({
      method: "get",
      url: `http://${ip}:${port}/list-short`,
    });
  }

  async getList() {
    const { ip, port } = await this.getService("speakers-service");
    return this.callService({
      method: "get",
      url: `http://${ip}:${port}/list`,
    });
  }

  async getAllArtwork() {
    const { ip, port } = await this.getService("speakers-service");
    return this.callService({
      method: "get",
      url: `http://${ip}:${port}/artwork`,
    });
  }

  async getSpeaker(shortname) {
    const { ip, port } = await this.getService("speakers-service");
    return this.callService({
      method: "get",
      url: `http://${ip}:${port}/speaker/${shortname}`,
    });
  }

  async getArtworkForSpeaker(shortname) {
    const { ip, port } = await this.getService("speakers-service");
    return this.callService({
      method: "get",
      url: `http://${ip}:${port}/artwork/${shortname}`,
    });
  }

  callService = async (requestOption) => {
    const servicePath = new URL(requestOption.url).pathname;
    let cacheFile = null;
    const cacheKey = crypto
      .createHash("md5")
      .update(requestOption.method + servicePath)
      .digest("hex");

    if (requestOption.responseType && requestOption.responseType === "stream") {
      cacheFile = `${__dirname}/../../_imagecache/${cacheKey}`;
    }

    const result = await circuitBreaker.callService(requestOption);
    if (!result) {
      if (this.cache[cacheKey]) return this.cache[cacheKey];

      if (cacheFile) {
        const exist = await fsExists(cacheFile);
        if (exist) return fs.createReadStream(cacheFile);
      }

      return false;
    }

    if (!cacheFile) {
      this.cache[cacheKey] = result;
    } else {
      const ws = fs.createWriteStream(cacheFile);
      result.pipe(ws);
    }

    return result;
  };

  getService = async (serviceName) => {
    const response = await axios.get(
      `${this.serviceRegistryUrl}/find/${serviceName}/${this.serviceVersionIdentifier}`
    );
    return response.data;
  };
}

module.exports = SpeakersService;
