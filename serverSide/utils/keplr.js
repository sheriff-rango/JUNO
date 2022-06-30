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
  "juno1d307yr77etr30g0las6l537a0du566ax58vv23txa4nvh2wccccqzqxe5f";

const ADMIN = {
  mnemonic:
    "sound prevent lock blame review horn junk cupboard enrich south warfare visit",
  address: "juno17zwfyu9z7p6ks7dw4032umr3wwgxz35gypyyp4",
};

module.exports.generateWallet = async () => {
  console.log("generate");
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

module.exports.addWhiteUser = async (wallet) => {
  if (!wallet || !wallet.address || !wallet.mnemonic) return null;
  const gasPrice = GasPrice.fromString("0.05ujunox");
  const sender_wallet = await DirectSecp256k1HdWallet.fromMnemonic(
    ADMIN.mnemonic,
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
    add_whit_user: {
      user: {
        name: "",
        address: wallet.address,
        email: "",
      },
    },
  };
  try {
    const create_result = await sender_client.execute(
      ADMIN.address,
      CONTRACT_ADDRESS,
      msg,
      executeFee,
      ""
      // [{ denom: "ujunox", amount: "10000" }]
    );
    return create_result;
  } catch (e) {
    return null;
  }
};

module.exports.removeWhiteUser = async (wallet) => {
  if (!wallet || !wallet.address || !wallet.mnemonic) return null;
  const gasPrice = GasPrice.fromString("0.05ujunox");
  const sender_wallet = await DirectSecp256k1HdWallet.fromMnemonic(
    ADMIN.mnemonic,
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
      ADMIN.address,
      CONTRACT_ADDRESS,
      msg,
      executeFee,
      ""
      // [{ denom: "ujunox", amount: "10000" }]
    );
    return create_result;
  } catch (e) {
    return null;
  }
};
