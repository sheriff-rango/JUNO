const Moralis = require('moralis/node');
const axios = require("axios");
const { exit } = require('process');
const express = require("express");
const cors = require("cors");
const fs = require('fs');

const sendRequest = require('./utils/fetch');

const apiKeys = [
  'K6epf8Uh3ZlE1Q6d5fQUBbqEu1NDNOdmis0TTlvyYsRcc9im24qLDO51GAP5eto9',
  'ZvdJsqDv6WA1EfL156oHBPcAjhWzxkiL0zIIUxwOnYvmUmJDCjS2jkIKUHKmlzze',
  'ncvWaJOzaqmgCdFp7KuTqT7P1iEOt99W1lgTH4gcFC0QvdA9M1h8qivhPox84Gbw',
  'ToPhBUKese30Env6Wz0Vcko5oRMW8Yi6KVQ685c6fT5TIcgqeCii9b0b7Fv7dKCc',
  'xgqbsMJcRSDBv3QJRDhKKb1O3FQmPNR2SFICj3XpbXFizRmuFVIkWUnJe6msefX3',
  '6VpvKY01acd6wWaNc4E8tDfa8acPGlUrCNhrB2Nzmxz2jEHzYx3d1GTvIdL2MXPn',
  'IT6Gaj3LZxFWkjXkdgxTqA7HlyDMDy5oZUO1oDAQLi1aLkETgNZcHV7yI4mOZjmB',
  'bTPO9xE2un2yW33Z0v6AGkxH0E58ixzJk1FvBzLls11UhuilQrtWNkcCVl888JlQ',
  'D8Cmgo0Y3veZwCvru3IqE2Z46UnC2fGsk0feLmXkHKiWY6K4g5MccWsxuwFjrXL7',
  'zrdRW3z8YbmHVXzRHFh4wIbwmrJs9FQgdOVXbGw4ZWc52OiVCYqbQkR8NxoTgEV1'
]

//server=defir_beta (preloaded with data for test wallet 0x...44a)
// const serverUrl = "https://tjdngb7yqmm6.usemoralis.com:2053/server";
// const appId = "ZRFrzeWTDRmhMFszuq7VSWgM5hgJI4GOY7cY2Ebx";

const serverUrl = 'https://8dyuriovbupo.usemoralis.com:2053/server';
const appId = 'rLSZFQmw1hUwtAjRnjZnce5cxu1qcPJzy01TuyU1';

// const serverUrl = 'https://ea4ql61igwkq.usemoralis.com:2053/server';
// const appId = 'ayFgiTCfWrFcBtgXqvwiLJQqSlGbnxYezYipOJQx';

// const serverUrl = 'https://nobftmga5e7k.usemoralis.com:2053/server';
// const appId = '1ECvf1IwjzCgTFYXyD44lIeVKPMgV6ZYFoUHrPwS';

let history = null;
let serverState = false;
let moralisStarted = false;


// common data
const chainCoins = {
  polygon: {
    chainId: 'matic',
    name: 'Wrapped Matic',
    decimals: 18,
    symbol: 'WMATIC',
    address: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
    native_coin: 'MATIC',
  },
  eth: {
    chainId: 'eth',
    name: 'Wrapped Ether',
    decimals: 18,
    symbol: 'WETH',
    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    native_coin: 'ETH',
  },
  bsc: {
    chainId: 'bsc',
    name: 'Wrapped BNB',
    decimals: 18,
    symbol: 'WBNB',
    address: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
    native_coin: 'BSC',
  },
};

let testData = {
  wallet: '0x704111eDBee29D79a92c4F21e70A5396AEDCc44a',
  token: '0x510d776fea6469531f8be69e669e553c0de69621',
  blockheight: 20138207,
  chain: 'polygon',
};

const DELAY = 1000;
const TRANSACTION_MAX = 2000; // max length of fetched transaction to avoid error of rate exceed

const app = express();
app.use(cors());
const PORT = process.env?.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at (http://localhost:${PORT})`);
});
app.get('/', function (req, res) {
  // if (!history) return res.status(400).send("Getting data. Please wait...")
  // res.send({ result: history})
  const downloadContent = JSON.stringify(history);
  res.setHeader('Content-Length', downloadContent.length);
  res.write(downloadContent, 'binary');
  res.end();
})
app.get('/costbasis', function (req, res) {
  // if (!moralisStarted) return res.status(400).send("Moralis server does not started yet. Please wait...")
  if (serverState) return res.status(400).send("Moralis server is busy at the moment. Please wait...")
  history = 'Loading...';
  serverState = true;
  console.log('get costbasis request');
  const startTime = new Date();
  getWalletCostHistory((result) => {
    const endTime = new Date();
    const duration  = (endTime - startTime) / 1000;
    console.log('result in', duration, 's: ', result);
    res.send({ result, })
  });
})

Moralis.start({ serverUrl, appId })
  .then(() => {
    console.log('moralis successfully started');
    serverState = true;
    moralisStarted = true;
    getWalletCostHistory();
  })
  .catch((e) => {
    console.log('moralis start error', e);
    // history = 'moralis start error';
    history = {
      message: 'moralis start error',
      error: e
    };
    serverState = false;
    // exit(1);
  });

GLOBAL_API_KEY_INDEX = 0;
serverState = true;
function main() {
  getWalletCostBasis(testData)
  .then((result) => {
    console.log('final result ', result);
    // fs.writeFileSync('./result.json', JSON.stringify(result));
    history = result;
    serverState = false;
    // exit(1);
  })
  .catch((e) => {
    console.log('get wallet cost basis error', e);
    serverState = false;
    // history = 'get wallet cost basis error';
    history = {
      message: 'get wallet cost basis error',
      error: e
    };
    // exit(1);
  });
}

function getWalletCostHistory(callback) {
  getWalletCostBasis(testData)
  .then((result) => {
    console.log('final result ', result);
    fs.writeFileSync('./result.json', JSON.stringify(result));
    history = result;
    serverState = false;
    if (callback) callback(result);
    // exit(1);
  })
  .catch((e) => {
    console.log('get wallet cost basis error', e);
    serverState = false;
    // history = 'get wallet cost basis error';
    // history = {
    //   message: 'get wallet cost basis error',
    //   error: e
    // };
    // exit(1);
    if (callback) callback(null);
  });
}
// main();


// utils functions
function sortBlockNumber_reverseChrono(a, b) {
  if (a.block_number > b.block_number) {
    return -1;
  }
  if (a.block_number < b.block_number) {
    return 1;
  }
  return 0;
}

function convertDateTime(time) {
  if (!time) return '';
  return time.split('.')[0];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getApiKey() {
  // await sleep(DELAY);
  const result = apiKeys[GLOBAL_API_KEY_INDEX % apiKeys.length];
  GLOBAL_API_KEY_INDEX++;
  console.log('api key: ', GLOBAL_API_KEY_INDEX % apiKeys.length, result);
  return result;
}

function writeToFile(filename, data) {
  fs.writeFileSync(`./_result_${filename}.json`, JSON.stringify(data))
}

// Debank functions
async function getTokenInfoByDebank(_chain, _address) {
  try {
    const result = await axios({
      method: 'get',
      header: {'content-type': 'application/json'},
      url: `https://openapi.debank.com/v1/user/token_list?chain_id=${chainCoins[_chain].chainId}&id=${_address}&is_all=true`
    });
    return result.data;
  } catch(err) {
    console.log('get token price', err);
    return null;
  }
}

// Moralis functions
async function getTokenMetadata(_chain, _tokenAddresses) {
  let options;
  try {
    var page = 0, tokenMetadata = [], result;
    while (page < Math.ceil(_tokenAddresses.length / 10)) {
      options = {
        chain: _chain,
        addresses: _tokenAddresses.splice(0, 10)
      }
      result = await Moralis.Web3API.token.getTokenMetadata(options);
      // result = await sendRequest({
      //   apiKey: getApiKey(),
      //   url: `https://deep-index.moralis.io/api/v2/erc20/metadata?chain=${options.chain}&addresses=${options.addresses.join('&addresses=')}`
      // })
      tokenMetadata = tokenMetadata.concat(result);
      page++;
    }
    return tokenMetadata;
  } catch (e) {
    console.log('get token meta data error', e);
    return null;
  }
}

async function getTransactions(_chain, _tokenAddress, _toBlock) {
  let options = {
    chain: _chain,
    address: _tokenAddress,
    order: 'desc',
    offset: 0
  };
  if (_toBlock) options.to_block = _toBlock;
  try {
    // const result = await Moralis.Web3API.account.getTransactions(options);
    const result = await sendRequest({
      apiKey: getApiKey(),
      url: `https://deep-index.moralis.io/api/v2/${options.address}?chain=${options.chain}&to_block=${options.to_block || ''}&offset=${options.offset}`
    });
    if (Number(result?.total) > 500) {
      let page = 1, txFunctions = [], mergeResult = result.result;
      while (page < Math.ceil(result.total / 500) && mergeResult.length <= TRANSACTION_MAX) {
        options.offset = page * 500;
        // txFunctions.push(Moralis.Web3API.account.getTransactions(options));
        txFunctions.push(sendRequest({
          apiKey: getApiKey(),
          url: `https://deep-index.moralis.io/api/v2/${options.address}?chain=${options.chain}&to_block=${options.to_block || ''}&offset=${options.offset}`
        }));
        if (page % 1 === 0) {
          await Promise.all(txFunctions).then(results => {
            results.map(each => {
              mergeResult = mergeResult.concat(each?.result || []);
            })
          }).catch(e => console.log(e))
          txFunctions = [];
        }
        page++;
      }
      if (txFunctions.length) {
        await Promise.all(txFunctions).then(results => {
          results.map(each => {
            mergeResult = mergeResult.concat(each.result);
          }) 
          return mergeResult;
        }).catch(e => console.log(e))
      } else return mergeResult;
    }
    else return result?.result;
    return result?.result;
  } catch (e) {
    console.log('get transactions error', e);
    return null;
  }
}

async function getTokenPrice(_chain, _address, _toBlock) {
  const options = { address: _address, chain: _chain, to_block: _toBlock };
  try {
    // return await Moralis.Web3API.token.getTokenPrice(options);
    return await sendRequest({
      apiKey: getApiKey(),
      url: `https://deep-index.moralis.io/api/v2/erc20/${options.address}/price?chain=${options.chain}&to_block=${options.to_block}`
    });
  } catch (e) {
    return null;
  }
}

async function getTokenBalances(_chain, _address, _toBlock) {
  let options = {
    chain: _chain,
    address: _address
  };
  if (_toBlock) options.to_block = _toBlock;
  try {
    // console.log('get token balances', Moralis.Web3API.account);
    // const getTokenBalancesResult = await Moralis.Web3API.account.getTokenBalances(options);
    const getTokenBalancesResult = await sendRequest({
      apiKey: getApiKey(),
      url: `https://deep-index.moralis.io/api/v2/${options.address}/erc20?chain=${options.chain}&to_block=${options.to_block || ''}`
    });
    return getTokenBalancesResult;
  } catch (e) {
    console.log('get token balances error', e);
    return null;
  }
}

async function getTokenTransfers(_chain, _address, _toBlock) {
  let options = {
    address: _address,
    chain: _chain,
    offset: 0
  };
  if (_toBlock) options.to_block = _toBlock;
  try {
    // const result = await Moralis.Web3API.account.getTokenTransfers(options);
    const result = await sendRequest({
      apiKey: getApiKey(),
      url: `https://deep-index.moralis.io/api/v2/${options.address}/erc20/transfers?chain=${options.chain}&to_block=${options.to_block || ''}&offset=${options.offset}`
    });
    // console.log('get token transfer result', result);
    if (Number(result.total) > 500) {
      let page = 1, transferFunctions = [], mergeResult = result.result;
      while (page < Math.ceil(result.total / 500) && mergeResult.length <= TRANSACTION_MAX) {
        options.offset = page * 500;
        // transferFunctions.push(Moralis.Web3API.account.getTokenTransfers(options));
        transferFunctions.push(sendRequest({
          apiKey: getApiKey(),
          url: `https://deep-index.moralis.io/api/v2/${options.address}/erc20/transfers?chain=${options.chain}&to_block=${options.to_block || ''}&offset=${options.offset}`
        }));
        if (page % 1 === 0) {
          await Promise.all(transferFunctions).then(results => {
            results.map(each => {
              mergeResult = mergeResult.concat(each?.result || []);
            })
          }).catch(e => console.log(e))
          transferFunctions = [];
        }
        page++;
      }
      if (transferFunctions.length) {
        await Promise.all(transferFunctions).then(results => {
          results.map(each => {
            mergeResult = mergeResult.concat(each.result);
          }) 
          return mergeResult;
        }).catch(e => console.log('get token transfers error 1', e))
      } else return mergeResult;
    }
    else return result.result;
  } catch (e) {
    console.log('get token transfers error 2', e);
    return null;
  }
}

// Rest API functions
async function getTokenMetadataRestApi(_chain, _tokenAddresses) {
  let options;
  try {
    var page = 0, tokenMetadata = [], result;
    while (page < Math.ceil(_tokenAddresses.length / 10)) {
      options = {
        chain: _chain,
        addresses: _tokenAddresses.splice(0, 10)
      }
      // console.log('get token meta data', options);
      result = await sendRequest({
        apiKey: getApiKey(),
        url: `https://deep-index.moralis.io/api/v2/erc20/metadata?chain=${options.chain}&addresses=${options.addresses.join('&addresses=')}`
      })
      tokenMetadata = tokenMetadata.concat(result);
      page++;
    }
    return tokenMetadata;
  } catch (e) {
    console.log('get token meta data error', e);
    return null;
  }
}

async function getTransactionsRestApi(_chain, _tokenAddress, _toBlock) {
  let options = {
    chain: _chain,
    address: _tokenAddress,
    order: 'desc',
    offset: 0
  };
  if (_toBlock) options.to_block = _toBlock;
  try {
    const result = await sendRequest({
      apiKey: getApiKey(),
      url: `https://deep-index.moralis.io/api/v2/${options.address}?chain=${options.chain}&to_block=${options.to_block || ''}&offset=${options.offset}`
    });
    if (Number(result.total) > 500) {
      let page = 1, txFunctions = [], mergeResult = result.result;
      while (page < Math.ceil(result.total / 500)) {
        options.offset = page * 500;
        txFunctions.push(sendRequest({
          apiKey: getApiKey(),
          url: `https://deep-index.moralis.io/api/v2/${options.address}?chain=${options.chain}&to_block=${options.to_block || ''}&offset=${options.offset}`
        }));
        if (page % 1 === 0) {
          await Promise.all(txFunctions).then(results => {
            results.map(each => {
              mergeResult = mergeResult.concat(each?.result || []);
            })
          }).catch(e => console.log(e))
          txFunctions = [];
        }
        page++;
      }
      if (txFunctions.length) {
        await Promise.all(txFunctions).then(results => {
          results.map(each => {
            mergeResult = mergeResult.concat(each.result);
          }) 
          return mergeResult;
        }).catch(e => console.log(e))
      } else return mergeResult;
    }
    else return result.result;
    return result.result;
  } catch (e) {
    console.log('get transactions error', e);
    return null;
  }
}

async function getTokenPriceRestApi(_chain, _address, _toBlock) {
  const options = { address: _address, chain: _chain, to_block: _toBlock };
  try {
    return await sendRequest({
      apiKey: getApiKey(),
      url: `https://deep-index.moralis.io/api/v2/erc20/${options.address}/price?chain=${options.chain}&to_block=${options.to_block}`
    });;
  } catch (e) {
    return null;
  }
}

async function getTokenBalancesRestApi(_chain, _address, _toBlock) {
  let options = {
    chain: _chain,
    address: _address
  };
  if (_toBlock) options.to_block = _toBlock;
  try {
    // console.log('get token balances', Moralis.Web3API.account);
    const getTokenBalancesResult = await sendRequest({
      apiKey: getApiKey(),
      url: `https://deep-index.moralis.io/api/v2/${options.address}/erc20?chain=${options.chain}&to_block=${options.to_block || ''}`
    });
    return getTokenBalancesResult;
  } catch (e) {
    console.log('get token balances error', e);
    return null;
  }
}

async function getTokenTransfersRestApi(_chain, _address, _toBlock) {
  let options = {
    address: _address,
    chain: _chain,
    offset: 0
  };
  if (_toBlock) options.to_block = _toBlock;
  try {
    console.log('get token transfers', options)
    const result = await sendRequest({
      apiKey: getApiKey(),
      url: `https://deep-index.moralis.io/api/v2/${options.address}/erc20/transfers?chain=${options.chain}&to_block=${options.to_block || ''}&offset=${options.offset}`
    });
    // console.log('get token transfer result', result);
    if (Number(result.total) > 500) {
      let page = 1, transferFunctions = [], mergeResult = result.result;
      while (page < Math.ceil(result.total / 500)) {
        options.offset = page * 500;
        transferFunctions.push(sendRequest({
          apiKey: getApiKey(),
          url: `https://deep-index.moralis.io/api/v2/${options.address}/erc20/transfers?chain=${options.chain}&to_block=${options.to_block || ''}&offset=${options.offset}`
        }));
        if (page % 1 === 0) {
          await Promise.all(transferFunctions).then(results => {
            results.map(each => {
              mergeResult = mergeResult.concat(each.result);
            })
          }).catch(e => console.log(e))
          transferFunctions = [];
        }
        page++;
      }
      if (transferFunctions.length) {
        await Promise.all(transferFunctions).then(results => {
          results.map(each => {
            mergeResult = mergeResult.concat(each.result);
          }) 
          return mergeResult;
        }).catch(e => console.log('get token transfers error 1', e))
      } else return mergeResult;
    }
    else return result.result;
  } catch (e) {
    console.log('get token transfers error 2', e);
    return null;
  }
}

// main function
async function getWalletCostBasis(data) {
  let result = [];

  //Get global data
  // await Promise.all([
  //   getTokenBalances(data.chain, data.wallet.toLowerCase(), data.blockheight),
  //   getTokenTransfers(data.chain, data.wallet.toLowerCase(), data.blockheight),
  //   getTransactions(data.chain, data.wallet.toLowerCase(), data.blockheight),
  // ]).then((result) => {
  //   global_balances = result[0];
  //   global_transfers = result[1];
  //   global_tx = result[2];
  // });

  global_balances = await getTokenBalances(data.chain, data.wallet.toLowerCase(), data.blockheight);
  global_transfers = await getTokenTransfers(data.chain, data.wallet.toLowerCase(), data.blockheight);
  global_tx = await getTransactions(data.chain, data.wallet.toLowerCase(), data.blockheight);
  console.log('globle_tx length', global_tx?.length || 0)
  

  global_token_info_from_debank = await getTokenInfoByDebank(data.chain, data.wallet);

  //Copy native transfers to ERC20 transfers
  native_xfers = global_tx.filter((xfer) => xfer.value > 0);
  for (let i = 0; i < native_xfers.length; i++) {
    const tx = native_xfers[i];
    global_transfers.push({
      address: chainCoins[data.chain].address, //token address = wmatic
      block_hash: tx.block_hash,
      block_number: tx.block_number,
      block_timestamp: tx.block_timestamp,
      from_address: tx.from_address,
      to_address: tx.to_address,
      transaction_hash: tx.hash,
      value: tx.value, //tx value
      gas: tx.gas,
      gas_price: tx.gas_price
    });
  }

  //Sort global_transfers reverse-chronological by block_number
  global_transfers = global_transfers.sort(sortBlockNumber_reverseChrono);

  //Get token metadata
  var token_list = global_transfers.map((xfer) => xfer.address);
  token_list.push(chainCoins[data.chain].address); //add native token
  token_list = Array.from(new Set(token_list)); //de-dupe
  global_token_meta = await getTokenMetadata(data.chain, token_list);

  // global_token_meta_rest = await getTokenMetadataRestApi(data.chain, token_list);
  // writeToFile(`'getTokenMetaData_${Number(new Date())}`, {
  //   option: {chain: data.chain, tokenList: token_list},
  //   web3: global_token_meta,
  //   rest: global_token_meta_rest,
  // });

  // console.log('global token meta', global_token_meta)

  //If token specified in request, just do that token instead of the whole wallet
  // if (data.token) {
  //   global_balances = global_balances.filter((each) => each.token_address == data.token);
  // }

  console.log('global balance', global_balances.length)

  //Run cost basis for illiquid tokens
  let cost_basis = 0;
  //TODO: Make this loop asynchronous using Promise.allSettled
  for (let i = 0; i < global_balances.length; i++) {
    let returnData = [];
    global_balances[i].usdPrice = null;
    // console.log('global balances', global_balances[i])
    const tokenHistory = await getTokenCostBasis(
      data.chain,
      data.blockheight,
      data.wallet.toLowerCase(),
      {
        ...global_balances[i],
        address: global_balances[i].token_address
      },
      global_balances[i].balance / 10 ** global_balances[i].decimals,
      1,
      {}
    );
    cost_basis = tokenHistory.cost_basis;
    returnData = returnData.concat(tokenHistory.history);
    result.push({
      id: "p2",
      chain: "Polygon",
      chain_id: 123,
      chain_logo: "https://debank.com/static/media/polygon.23445189.svg",
      type: "Yield",
      type_img: "../assets/images/yield.jpg",
      protocol: "Kogefarm",
      protocol_logo: "https://static.debank.com/image/project/logo_url/ftm_kogefarm/55341a6e10b63e331441928a6bb19572.png",
      protocol_url: "https://kogefarm.io/vaults",
      assets: [
        {
          id: "0x123",
          ticker: "WMATIC",
          logo: "https://static.debank.com/image/matic_token/logo_url/matic/e5a8a2860ba5cf740a474dcab796dc63.png"
        },
        {
          id: "0x8a953cfe442c5e8855cc6c61b1293fa648bae472",
          ticker: "POLYDOGE",
          logo: "https://assets.coingecko.com/coins/images/15146/small/p1kSco1h_400x400.jpg?1619842715"
        }
      ],
      units: 123,
      cost_basis,
      _comment: "No cost info yet for wallet positions",
      value: 456,
      history: returnData.reverse(),
    })
  }

  // return returnData.reverse();
  return result;
}

async function getTokenCostBasis(chain, blockheight, wallet, token, balance, hierarchy_level, parent_transaction) {
  console.log('Cost basis for: Token:' + token.address + ' Block:' + blockheight + ' balance: ' + balance);

  // initialize cost_basis and balance
  let cost_basis = 0, current_balance = balance, newHistory = [];

  // retrieve list of token transactions to/from wallet, prior to block
  let token_transactions = global_transfers.filter((xfer) => xfer.address == token.address && xfer.used == undefined && Number(xfer.block_number) <= Number(blockheight));
  console.log('token transactions', token_transactions.length);

  // get token meta data
  const token_meta = global_token_meta.filter((meta) => meta.address == token.address)[0];
  const token_info = global_token_info_from_debank.filter((tk) => tk.id === token.address)[0];
  // console.log('token meta', token_meta);

  // get native price
  const native_price = await getTokenPrice(chain, chainCoins[chain].address, blockheight);
  // console.log('native price', native_price);

  // confirm wether token is valued or not
  let price = await getTokenPrice(chain, token.address, blockheight);
  if (price) {
    cost_basis = balance * price.usdPrice;
    newHistory.push({
      units: token.value / 10 ** (token_meta?.decimals || 18),
      transaction_id: parent_transaction.transaction_hash,
      transaction_url: `https://polygonscan.com/tx/${parent_transaction.transaction_hash}`,
      datetime: convertDateTime(parent_transaction.block_timestamp),
      token_id: token.address,
      token_name: token_meta?.name,
      token_img: token_info?.logo_url || '',
      fee_native_coin: chainCoins[chain].native_coin,
      cost_basis,
      hierarchy_level,
      valued_directly: true,
    })
    // console.log('Token: ' + token.address + ' Cost= ' + cost_basis);
    return {cost_basis, history: newHistory};
  }

  // process token transactions in reverse chronological order is skipped because global_transfers is already in that form
  token_transactions = token_transactions.sort(sortBlockNumber_reverseChrono);
  
  // For each transactions
  for (let i = 0; i < token_transactions.length; i++) {
    const transaction = token_transactions[i];
    // console.log('transaction', transaction);

    const transaction_detail = global_tx.filter((tx) => tx.hash === transaction.transaction_hash)[0] || {};

    // confirm whether token is received or not
    let isReceived = true;
    if (transaction.from_address.toLowerCase() == wallet) {
      isReceived = false; //from my wallet. debit outflow
    } else if (transaction.to_address.toLowerCase() == wallet) {
      isReceived = true; //to my wallet. credit inflow
    } else {
      console.log('Error: wallet address ' + wallet + ' not found in transaction ' + transaction.transaction_hash);
      continue;
    }

    //calculate the balance of token in wallet, just before transaction.
    const units_of_token = transaction.value / 10 ** (token_meta?.decimals || 18);
    current_balance = current_balance + (isReceived? -1 : 1) * units_of_token;
    // console.log('current balance', current_balance);

    // calculate the cost basis of current transaction
    const offsetting_coins = global_transfers.filter((xfer) =>
      xfer.transaction_hash == transaction.transaction_hash &&
      xfer.used == undefined &&
      (isReceived? (xfer.from_address.toLowerCase() == wallet) : (xfer.to_address.toLowerCase() == wallet))
    );

    // console.log('offsetting coins', offsetting_coins.length);
    let childHistory = [];
    
    for (let i = 0; i < offsetting_coins.length; i++) {
      let offsetting_coin = offsetting_coins[i];
      // console.log('offsetting coin', offsetting_coin);
      offsetting_coin.used = true;
      const coin_meta = global_token_meta.filter((t) => t.address == offsetting_coin.address)[0];
      const balance_of_offsetting_coin = offsetting_coin.value / 10 ** (coin_meta?.decimals || 18);
      const getTokenCostBasisResult = await getTokenCostBasis(
        chain,
        offsetting_coin.block_number,
        wallet,
        offsetting_coin,
        balance_of_offsetting_coin,
        hierarchy_level + 1,
        transaction,
      );
      cost_basis = cost_basis + (isReceived? 1 : -1) * getTokenCostBasisResult.cost_basis;
      // newHistory = newHistory.concat(getTokenCostBasisResult.history);
      childHistory = childHistory.concat(getTokenCostBasisResult.history);
      // childHistory.push(getTokenCostBasisResult.history);
    }
    const fee_native_units = transaction_detail.gas * transaction_detail.gas_price / 10 ** (token_meta?.decimals || 18);
    newHistory.push({
      units: transaction.value / 10 ** (token_meta?.decimals || 18),
      transaction_id: transaction.transaction_hash,
      transaction_url: `https://polygonscan.com/tx/${transaction.transaction_hash}`,
      datetime: convertDateTime(transaction.block_timestamp),
      token_id: token.address,
      token_name: token_meta?.name,
      token_img: token_info?.logo_url || '',
      fee_native_coin: chainCoins[chain].native_coin,
      fee_native_units,
      fee_usd: fee_native_units * native_price.usdPrice,
      cost_basis,
      hierarchy_level,
      valued_directly: false,
      child: childHistory,
    })
    
    // ********* STOP CONDITION *********
    if (current_balance <= 0) break;
  }
  
  return {cost_basis, history: newHistory};
}