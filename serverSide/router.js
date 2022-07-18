const express = require("express");
const router = express.Router();
const db = require("./dbConnection");
const { signupValidation, loginValidation } = require("./validation");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  generateWallet,
  addWhiteUser,
  removeWhiteUser,
  getToken,
  ADMIN,
  getBalance,
} = require("./utils/keplr");

router.post("/register", signupValidation, (req, res, next) => {
  db.query(
    `SELECT * FROM users WHERE address = ${db.escape(
      req.body.address
    )} AND hash = ${db.escape(req.body.hash)};`,
    async (err, result) => {
      if (err) return res.status(400).send(err.message);
      if (result.length) {
        console.log("register", result);
        return res.status(409).send({
          msg: "This user is already in use!",
        });
      } else {
        // username is available
        const wallet = await generateWallet();
        console.log(
          `INSERT INTO users (first_name, last_name, email, address, hash, entity_id, custom_wallet_address, custom_wallet_mnemonic) VALUES ('${
            req.body.firstName
          }', '${req.body.lastName}', ${db.escape(req.body.email)}, '${
            req.body.address
          }', '${req.body.hash}', '${req.body.entityID}', '${
            wallet.address
          }', '${wallet.mnemonic}')`
        );
        db.query(
          `INSERT INTO users (first_name, last_name, email, address, hash, entity_id, custom_wallet_address, custom_wallet_mnemonic) VALUES ('${
            req.body.firstName
          }', '${req.body.lastName}', ${db.escape(req.body.email)}, '${
            req.body.address
          }', '${req.body.hash}', '${req.body.entityID}', '${
            wallet.address
          }', '${wallet.mnemonic}')`,
          (err, result) => {
            if (err) return res.status(400).send(err.message);

            return res.status(201).send({
              msg: "The user has been registerd with us!",
            });
          }
        );
      }
    }
  );
});

router.get("/user", [], (req, res, next) => {
  const address = decodeURI(req.query.address || "");
  const hash = decodeURI(req.query.hash || "");
  console.log("get user. address = ", address, "hash = ", hash);
  if (!address || !hash)
    return res.status(400).send({ msg: "No address or no hash value" });
  db.query(
    `SELECT first_name, last_name, email, address, hash, isWhiteListed, entity_id, password, isAdmin FROM users WHERE address = ${db.escape(
      address
    )} AND hash = ${db.escape(hash)};`,
    (err, result) => {
      if (err) return res.status(400).send(err.message);
      return res.send({
        success: true,
        users: result.map((item) => {
          const returnValue = {
            ...item,
            registered: !!item.password,
            isAdmin: !!item.isAdmin,
          };
          delete returnValue.password;
          return returnValue;
        }),
      });
    }
  );
});

router.get("/get-user", [], (req, res, next) => {
  db.query(
    "SELECT first_name, last_name, email, address, hash, isWhiteListed, whiteListedBy, isAdmin, custom_wallet_address FROM users",
    function (error, results) {
      if (error) throw error;

      let data = [],
        queries = [];
      results.forEach((result) => {
        data.push({
          ...result,
          isWhiteListed: !!result.isWhiteListed,
          whiteListBy: result.whiteListedBy,
        });
        queries.push(getBalance(result.custom_wallet_address));
      });
      Promise.all(queries).then((queryResults) => {
        console.log("queryResults", queryResults);
        queryResults.forEach((queryResult, index) => {
          data[index].balance = `${(+queryResult.amount / 1e6).toFixed(2)}JUNO`;
        });
        return res.status(200).send({
          error: false,
          data,
          message: "Fetch Successfully.",
        });
      });

      // return res.send({
      //   error: false,
      //   data: results.map((user) => ({
      //     ...user,
      //     isWhiteListed: !!user.isWhiteListed,
      //     whiteListBy: user.whiteListedBy,
      //   })),
      //   message: "Fetch Successfully.",
      // });
    }
  );
});

const setWhiteListed = (
  hash,
  isWhiteListed,
  caller,
  wallet,
  res,
  passCallContract
) => {
  db.query(
    `UPDATE users SET isWhiteListed = ${db.escape(
      isWhiteListed
    )}, whiteListedBy = ${db.escape(
      isWhiteListed === "true" ? caller : ""
    )}, custom_wallet_address = ${db.escape(
      wallet?.address || ""
    )}, custom_wallet_mnemonic = ${db.escape(
      wallet?.mnemonic || ""
    )} WHERE hash = ${db.escape(hash)};`,
    (err, result) => {
      if (err) return res.status(400).send(err.message);
      if (!isWhiteListed && !passCallContract) {
        setAdminMainLogic(hash, caller, "false", res);
      } else {
        return res.status(200).send({
          success: true,
        });
      }
    }
  );
};

const setWhiteListedMainLogic = (
  hash,
  caller,
  isWhiteListed,
  res,
  passCallContract
) => {
  if (!hash) return res.status(400).send({ msg: "Input hash value!" });
  if (!isWhiteListed)
    return res.status(400).send({ msg: "Input whitelist status!" });
  if (isWhiteListed !== "true" && isWhiteListed !== "false")
    return res.status(400).send({ msg: "Invalid whitelist status!" });

  db.query(
    `SELECT hash, isAdmin, isWhiteListed, whiteListedBy, custom_wallet_address, custom_wallet_mnemonic FROM users WHERE hash = ${db.escape(
      hash
    )} OR hash = ${db.escape(caller)};`,
    async (err, result) => {
      if (err) return res.status(400).send(err.message);
      if (!result || !result.length)
        return res.status(400).send({ msg: "User Not Found!" });

      let targetUser = null,
        callerUser = null;
      for (let i = 0; i < result.length; i++) {
        if (result[i].hash === hash) targetUser = result[i];
        if (result[i].hash === caller) callerUser = result[i];
      }

      //  ---------- Validation ------------- //
      if (!targetUser) return res.status(400).send({ msg: "User Not Found!" });
      if (!callerUser)
        return res.status(400).send({ msg: "Bad Request: No Permission!" });

      if (isWhiteListed === "true" && targetUser.isWhiteListed)
        return res
          .status(400)
          .send({ msg: "Bad Request: Already set whitelisted!" });
      if (isWhiteListed === "true" && !callerUser.isAdmin)
        return res.status(400).send({ msg: "Bad Request: No Permission!" });
      if (
        isWhiteListed === "false" &&
        !(caller === ADMIN.hash || caller === targetUser.whiteListedBy)
      )
        return res.status(400).send({ msg: "Bad Request: No Permission!" });

      // ---------- Main Logic ----------- //
      const wallet =
        targetUser.custom_wallet_address && targetUser.custom_wallet_mnemonic
          ? {
              address: targetUser.custom_wallet_address,
              mnemonic: targetUser.custom_wallet_mnemonic,
            }
          : await generateWallet();

      if (isWhiteListed === "true") {
        if (!passCallContract) {
          const transactionResult = await addWhiteUser(wallet, {
            address: callerUser.custom_wallet_address,
            mnemonic: callerUser.custom_wallet_mnemonic,
            hash: callerUser.hash,
          });
          if (!transactionResult) {
            return res
              .status(400)
              .send({ msg: "Failed in setting to contract!" });
          }
          console.log("transaction success", transactionResult);
        }
        setWhiteListed(hash, "true", caller, wallet, res);
      } else {
        const transactionResult = await removeWhiteUser(
          {
            address: targetUser.custom_wallet_address,
            mnemonic: targetUser.custom_wallet_mnemonic,
          },
          {
            address: callerUser.custom_wallet_address,
            mnemonic: callerUser.custom_wallet_mnemonic,
            hash: callerUser.hash,
          }
        );
        if (!transactionResult) {
          return res
            .status(400)
            .send({ msg: "Failed in setting to contract!" });
        }
        console.log("transaction success", transactionResult);
        setWhiteListed(hash, "", caller, wallet, res, !targetUser.isAdmin);
      }
    }
  );
};

router.post("/set-whitelist", [], (req, res, next) => {
  const hash = req.body.hash;
  const caller = req.header("account");
  const isWhiteListed = (req.body.isWhiteListed || "").toLowerCase();
  setWhiteListedMainLogic(hash, caller, isWhiteListed, res);
});

router.post("/set-password", [], (req, res, next) => {
  const hash = req.body.hash;
  const password = req.body.password;
  if (!hash) return res.status(400).send({ msg: "Input hash value!" });
  if (!password) return res.status(400).send({ msg: "Input password!" });

  db.query(
    `SELECT * FROM users WHERE hash = ${db.escape(hash)};`,
    (err, result) => {
      if (err) return res.status(400).send(err.message);
      const user = result[0];
      if (!user) return res.status(400).send({ msg: "User does not exist!" });
      if (user.password)
        return res.status(400).send({ msg: "Password already exists!" });
      db.query(
        `UPDATE users SET password = ${db.escape(
          password
        )} WHERE hash = ${db.escape(hash)};`,
        (err, result) => {
          if (err) return res.status(400).send(err.message);
          return res.status(200).send({
            success: true,
          });
        }
      );
    }
  );
});

router.post("/whitelist-login", [], (req, res, next) => {
  const hash = req.body.hash;
  const password = req.body.password;
  if (!hash) return res.status(400).send({ msg: "Input hash value!" });
  if (!password) return res.status(400).send({ msg: "Input password!" });

  db.query(
    `SELECT * FROM users WHERE hash = ${db.escape(hash)};`,
    (err, result) => {
      if (err) return res.status(400).send(err.message);
      const user = result[0];
      if (!user) return res.status(400).send({ msg: "User does not exist!" });
      if (!user.password)
        return res.status(400).send({ msg: "Not Registered User!" });
      if (user.password === password) {
        return res.status(200).send({ success: true });
      }
      return res.status(400).send({ msg: "Incorrect Password!" });
    }
  );
});

const setAdminMainLogic = (hash, caller, isAdmin, res) => {
  if (!hash) return res.status(400).send({ msg: "Input hash value!" });
  if (!isAdmin) return res.status(400).send({ msg: "Input admin status!" });
  if (caller !== ADMIN.hash)
    return res.status(400).send({ msg: "Bad Request: No Permission!" });

  db.query(
    `UPDATE users SET isAdmin = ${isAdmin === "true"} WHERE hash = ${db.escape(
      hash
    )};`,
    (err, result) => {
      if (err) return res.status(400).send(err.message);
      if (isAdmin === "true") {
        db.query(
          `SELECT isWhiteListed FROM users WHERE hash = ${db.escape(hash)};`,
          async (err, result) => {
            if (err) return res.status(400).send(err.message);
            const targetUser = result[0];
            if (!targetUser.isWhiteListed) {
              setWhiteListedMainLogic(hash, caller, "true", res, true);
            } else {
              return res.status(200).send({
                success: true,
              });
            }
          }
        );
      } else {
        return res.status(200).send({
          success: true,
        });
      }
    }
  );
};

router.post("/set-admin", [], (req, res, next) => {
  const hash = req.body.hash;
  const caller = req.header("account");
  const isAdmin = (req.body.isAdmin || "").toLowerCase();
  setAdminMainLogic(hash, caller, isAdmin, res);
});

router.post("/get-token", [], (req, res, next) => {
  const hash = req.body.hash;
  const amount = Number(req.body.amount);
  const caller = req.header("account");
  if (isNaN(amount) || amount <= 0)
    return res.status(400).send({ msg: "Invalid Input Amount!" });
  if (caller !== ADMIN.hash)
    return res.status(400).send({ msg: "No Permission!" });
  db.query(
    `SELECT * FROM users WHERE hash = ${db.escape(hash)};`,
    async (err, result) => {
      if (err) return res.status(400).send(err.message);
      if (!result || !result.length)
        return res.status(400).send({ msg: "User Not Found!" });
      const fromWallet = {
        address: result[0].custom_wallet_address,
        mnemonic: result[0].custom_wallet_mnemonic,
      };
      try {
        await getToken(fromWallet, amount);
        return res.status(200).send({ msg: "Success!" });
      } catch (err) {
        return res.status(400).send(err.message);
      }
    }
  );
});

module.exports = router;

// router.post('/login', loginValidation, (req, res, next) => {
//   db.query(
//     `SELECT * FROM users WHERE email = ${db.escape(req.body.email)};`,
//     (err, result) => {
//       // user does not exists
//       if (err) {
//         throw err;
//         return res.status(400).send({
//           msg: err
//         });
//       }
//       if (!result.length) {
//         return res.status(401).send({
//           msg: 'Email or password is incorrect!'
//         });
//       }
//       // check password
//       bcrypt.compare(
//         req.body.password,
//         result[0]['password'],
//         (bErr, bResult) => {
//           // wrong password
//           if (bErr) {
//             throw bErr;
//             return res.status(401).send({
//               msg: 'Email or password is incorrect!'
//             });
//           }
//           if (bResult) {
//             const token = jwt.sign({id:result[0].id},'the-super-strong-secrect',{ expiresIn: '1h' });
//             db.query(
//               `UPDATE users SET last_login = now() WHERE id = '${result[0].id}'`
//             );
//             return res.status(200).send({
//               msg: 'Logged in!',
//               token,
//               user: result[0]
//             });
//           }
//           return res.status(401).send({
//             msg: 'Username or password is incorrect!'
//           });
//         }
//       );
//     }
//   );
// });
