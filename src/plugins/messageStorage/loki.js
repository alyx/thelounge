"use strict";

const log = require("../../log");
const http = require("http");
const Helper = require("../../helper");
const Msg = require("../../models/msg");

class LokiMessageStorage {
	constructor(client) {
		this.client = client;
		this.isEnabled = false;
	}

	enable() {
		this.isEnabled = true;
	}

	close(callback) {
		this.isEnabled = false;

		if (callback) {
			callback();
		}
	}

	index(network, channel, msg) {
		if (!this.isEnabled) {
			return;
		}

		const clonedMsg = Object.keys(msg).reduce((newMsg, prop) => {
			// id is regenerated when messages are retrieved
			// previews are not stored because storage is cleared on lounge restart
			// type and time are stored in a separate column
			if (prop !== "id" && prop !== "previews" && prop !== "time") {
				newMsg[prop] = msg[prop];
			}

			return newMsg;
		}, {});

		let output = {
			streams: [
				{
					stream: {
						app: "thelounge",
						network: network.name + "-" + network.uuid,
						channel: channel.name.toLowerCase(),
						account: this.client.name,
					},
					values: [
						[(msg.time.getTime() * 1000000).toString(), JSON.stringify(clonedMsg)],
					],
				},
			],
		};

		const options = {
			hostname: Helper.config.lokiHost,
			port: 3100,
			path: "/loki/api/v1/push",
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
		};

		let req = http.request(options, function (res) {
			res.on("data", function (data) {
				log.warn("Loki:" + data.toString());
			});
		});
		req.write(JSON.stringify(output));
		req.end();
	}

	deleteChannel() {}

	getMessages() {
		// Not implemented for Loki log files
		return Promise.resolve([]);
	}

	canProvideMessages() {
		return false;
	}
}

module.exports = LokiMessageStorage;
