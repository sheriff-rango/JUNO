const { assertIsBroadcastTxSuccess, coins } = require("@cosmjs/launchpad");

const { calculateFee, GasPrice } = require("@cosmjs/stargate");
const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const {
  SigningCosmWasmClient,
  CosmWasmClient,
} = require("@cosmjs/cosmwasm-stargate");
const _ = require("fs");
//const { Buffer } = require("buffer");
// const btoa = require("btoa");

const rpcEndpoint = "https://rpc.uni.juno.deuslabs.fi:443";
const CONTRACT_ADDRESS =
  "juno1z85xze7aqu07gemy35ht7yjtctjrpuhplmhfedq4hr3w6740kejqzhq2pt";

module.exports.ADMIN = {
  mnemonic:
    "sound prevent lock blame review horn junk cupboard enrich south warfare visit",
  address: "juno17zwfyu9z7p6ks7dw4032umr3wwgxz35gypyyp4",
  hash: "CWuWjdU20nYR7x4HtQqSw2mHLtSJX3uQppGfVywdj8ZD0HYT+dC8zeQ7rSWd2ei9rOHkH7JDv7gao/j7wHiGrw==",
};

module.exports.generateWallet = async () => {
  let new_account = await DirectSecp256k1HdWallet.generate(12);
  const junoWallet = await DirectSecp256k1HdWallet.fromMnemonic(
    new_account.secret.data,
    { prefix: "juno" }
  );
  const juno_account = await junoWallet.getAccounts();

  return {
    address: juno_account[0].address,
    mnemonic: new_account.secret.data,
  };
};

module.exports.addWhiteUser = async (wallet, callerWallet) => {
  if (!wallet || !wallet.address || !wallet.mnemonic) return null;
  const gasPrice = GasPrice.fromString("0.05ujunox");
  const sender_wallet = await DirectSecp256k1HdWallet.fromMnemonic(
    // this.ADMIN.mnemonic,
    callerWallet.hash === this.ADMIN.hash
      ? this.ADMIN.mnemonic
      : callerWallet.mnemonic,
    {
      prefix: "juno",
    }
  );
  const sender_client = await SigningCosmWasmClient.connectWithSigner(
    rpcEndpoint,
    sender_wallet
  );
  const executeFee = calculateFee(500_000, gasPrice);
  const msg = {
    add_white_user: {
      user: {
        name: "",
        address: wallet.address,
        email: "",
      },
    },
  };
  console.log("message", msg);
  try {
    const create_result = await sender_client.execute(
      // this.ADMIN.address,
      callerWallet.hash === this.ADMIN.hash
        ? this.ADMIN.address
        : callerWallet.address,
      CONTRACT_ADDRESS,
      msg,
      executeFee,
      ""
      // [{ denom: "ujunox", amount: "10000" }]
    );
    return create_result;
  } catch (e) {
    console.log("here", e);
    return null;
  }
};

module.exports.removeWhiteUser = async (wallet, callerWallet) => {
  if (!wallet || !wallet.address || !wallet.mnemonic) return null;
  const gasPrice = GasPrice.fromString("0.05ujunox");
  const sender_wallet = await DirectSecp256k1HdWallet.fromMnemonic(
    // this.ADMIN.mnemonic,
    callerWallet.hash === this.ADMIN.hash
      ? this.ADMIN.mnemonic
      : callerWallet.mnemonic,
    {
      prefix: "juno",
    }
  );
  const sender_client = await SigningCosmWasmClient.connectWithSigner(
    rpcEndpoint,
    sender_wallet
  );
  const executeFee = calculateFee(500_000, gasPrice);
  const msg = {
    delete_white_user: {
      user: wallet.address,
    },
  };
  try {
    const create_result = await sender_client.execute(
      // this.ADMIN.address,
      callerWallet.hash === this.ADMIN.hash
        ? this.ADMIN.address
        : callerWallet.address,
      CONTRACT_ADDRESS,
      msg,
      executeFee,
      ""
      // [{ denom: "ujunox", amount: "10000" }]
    );
    return create_result;
  } catch (e) {
    console.log(e);
    return null;
  }
};

function toMicroAmount(amount, coinDecimals) {
  return (
    Number.parseFloat(amount) * Math.pow(10, Number.parseInt(coinDecimals))
  );
}

module.exports.getToken = async (wallet, amount) => {
  if (!wallet || !wallet.address || !wallet.mnemonic) return null;
  try {
    const sender_wallet = await DirectSecp256k1HdWallet.fromMnemonic(
      // this.ADMIN.mnemonic,
      wallet.mnemonic,
      {
        prefix: "juno",
      }
    );
    const sender_client = await SigningCosmWasmClient.connectWithSigner(
      rpcEndpoint,
      sender_wallet,
      {
        gasPrice: GasPrice.fromString("0.025ujunox"),
      }
    );
    const result = await sender_client.sendTokens(
      wallet.address,
      this.ADMIN.address,
      coins(toMicroAmount("" + amount, "6"), "ujunox"),
      "auto",
      ""
    );
    assertIsBroadcastTxSuccess({
      transactionHash: result.transactionHash,
      height: result.height,
      code: result.code,
      rawLog: result.rawLog || "",
    });
  } catch (err) {
    throw new Error(err);
  }
};

module.exports.getBalance = async (address) => {
  const sender_wallet = await DirectSecp256k1HdWallet.fromMnemonic(
    this.ADMIN.mnemonic,
    {
      prefix: "juno",
    }
  );
  const sender_client = await SigningCosmWasmClient.connectWithSigner(
    rpcEndpoint,
    sender_wallet,
    {
      gasPrice: GasPrice.fromString("0.025ujunox"),
    }
  );
  return sender_client.getBalance(address, "ujunox");
};
