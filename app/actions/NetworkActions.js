"use strict";

var augur = require("augur.js");
var abi = require("augur-abi");
var moment = require("moment");
var constants = require("../libs/constants");
var utilities = require("../libs/utilities");

module.exports = {

  /**
   * Update the UI and stores depending on the state of the network.
   *
   * If the daemon just became reachable (including startup), load the
   * latest data and ensure that we're monitoring new blocks to update our
   * stores. If our Ethereum daemon just became unreachable, dispatch an event so
   * an error dialog can be display.
   */
  checkNetwork: function () {
    var self = this;
    var network = this.flux.store('network').getState();
    augur.rpc.listening(function (nowUp) {
      var wasUp = (
        network.ethereumStatus === constants.network.ETHEREUM_STATUS_CONNECTED
      );
      var wasDown = (
        !network.ethereumStatus ||
        network.ethereumStatus === constants.network.ETHEREUM_STATUS_FAILED
      );
      if (!nowUp) {
        console.log('warning: failed to connect to ethereum');
        self.dispatch(constants.network.UPDATE_ETHEREUM_STATUS, {
          ethereumStatus: constants.network.ETHEREUM_STATUS_FAILED
        });
        setTimeout(self.flux.actions.network.checkNetwork, 3000);
      } else if (wasDown && nowUp) {
        self.dispatch(constants.network.UPDATE_ETHEREUM_STATUS, {
          ethereumStatus: constants.network.ETHEREUM_STATUS_CONNECTED
        });
        self.flux.actions.config.setHost(
          augur.rpc.nodes.local || augur.rpc.nodes.hosted[0]
        );
        self.flux.actions.network.initializeNetwork();
        self.flux.actions.config.initializeData();
      }
    });
  },

  initializeNetwork: function () {
    var self = this;

    // get network and client versions
    this.dispatch(constants.network.UPDATE_NETWORK, {
      networkId: augur.network_id
    });

    // if available, use the client-side account
    if (augur.web.account.address && augur.web.account.privateKey) {
      console.log("using client-side account:", augur.web.account.address);
      this.dispatch(constants.config.UPDATE_ACCOUNT, {
        currentAccount: augur.web.account.address,
        privateKey: augur.web.account.privateKey,
        handle: augur.web.account.handle,
        keystore: augur.web.account.keystore
      });
      this.flux.actions.asset.updateAssets();
      this.flux.actions.report.loadEventsToReport();
      this.flux.actions.report.loadPendingReports();

    // hosted node: no unlocked account available
    } else if (this.flux.store('config').getState().isHosted) {

      // if the user has a persistent login, use it
      var account = augur.web.persist();
      if (account && account.privateKey) {
        console.log("using persistent login:", account);
        this.dispatch(constants.config.UPDATE_ACCOUNT, {
          currentAccount: augur.web.account.address,
          privateKey: augur.web.account.privateKey,
          handle: augur.web.account.handle,
          keystore: augur.web.account.keystore
        });
        this.flux.actions.asset.updateAssets();
        this.flux.actions.report.loadEventsToReport();
        this.flux.actions.report.loadPendingReports();
      } else {
        this.dispatch(constants.network.UPDATE_ETHEREUM_STATUS, {
          ethereumStatus: constants.network.ETHEREUM_STATUS_NO_ACCOUNT
        });
      }

    // local node: if it's unlocked, use the coinbase account
    } else {

      // check to make sure the account is unlocked
      augur.rpc.unlocked(augur.coinbase, function (unlocked) {

        // use from/coinbase if unlocked
        if (unlocked && !unlocked.error) {
          console.log("using unlocked account:", augur.from);
          self.dispatch(constants.config.UPDATE_ACCOUNT, {
            currentAccount: augur.from
          });
          self.flux.actions.asset.updateAssets();
          self.flux.actions.report.loadEventsToReport();
          self.flux.actions.report.loadPendingReports();

        // otherwise, no account available
        } else {
          console.log("account", augur.coinbase, "is locked");
          self.dispatch(constants.network.UPDATE_ETHEREUM_STATUS, {
            ethereumStatus: constants.network.ETHEREUM_STATUS_NO_ACCOUNT
          });
        }
      });
    }

    this.flux.actions.network.updateNetwork();
  },

  updateNetwork: function () {
    var self = this;

    // just block age and peer count until we're current
    augur.rpc.blockNumber(function (blockNumber) {

      if (blockNumber && !blockNumber.error) {

        blockNumber = abi.number(blockNumber);
        var blockMoment = utilities.blockToDate(blockNumber, blockNumber);

        self.dispatch(constants.network.UPDATE_NETWORK, {
          blockNumber: blockNumber,
          blocktime: blockMoment
        });

        augur.rpc.getBlock(blockNumber, true, function (block) {
          if (block && block.constructor === Object && !block.error) {

            var blockTimestamp = block.timestamp;
            var currentTimestamp = moment().unix();
            var age = currentTimestamp - blockTimestamp;

            self.dispatch(constants.network.UPDATE_BLOCKCHAIN_AGE, {
              blockchainAge: age
            });
          }
        });
      }
    });
  }

};
