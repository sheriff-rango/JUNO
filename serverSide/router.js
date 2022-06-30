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
  ADMIN,
} = require("./utils/keplr");

router.post("/register", signupValidation, (req, res, next) => {
  db.query(
    `SELECT * FROM users WHERE address = ${db.escape(
      req.body.address
    )} AND hash = ${db.escape(req.body.hash)};`,
    (err, result) => {
      if (err) return res.status(400).send({ msg: "Server Error!", err: err });
      if (result.length) {
        console.log("register", result);
        return res.status(409).send({
          msg: "This user is already in use!",
        });
      } else {
        // username is available
        db.query(
          `INSERT INTO users (first_name, last_name, email, address, hash, entity_id) VALUES ('${
            req.body.firstName
          }', '${req.body.lastName}', ${db.escape(req.body.email)}, '${
            req.body.address
          }', '${req.body.hash}', '${req.body.entityID}')`,
          (err, result) => {
            if (err)
              return res.status(400).send({ msg: "Server Error!", err: err });

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
      if (err) return res.status(400).send({ msg: "Server Error!", err: err });
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
    "SELECT first_name, last_name, email, address, hash, isWhiteListed, isAdmin FROM users",
    function (error, results) {
      if (error) throw error;

      return res.send({
        error: false,
        data: results.map((user) => ({
          ...user,
          isWhiteListed: !!user.isWhiteListed,
          whiteListBy: user.isWhiteListed,
        })),
        message: "Fetch Successfully.",
      });
    }
  );
});

const setWhiteListed = (hash, isWhiteListed, caller, wallet, res) => {
  db.query(
    `UPDATE users SET isWhiteListed = ${db.escape(
      isWhiteListed
    )}, custom_wallet_address = ${db.escape(
      wallet?.address || ""
    )}, custom_wallet_mnemonic = ${db.escape(
      wallet?.mnemonic || ""
    )} WHERE hash = ${db.escape(hash)};`,
    (err, result) => {
      if (err) return res.status(400).send({ msg: "Server Error!", err: err });
      if (!isWhiteListed) {
        setAdminMainLogic(hash, caller, "false", res);
      } else {
        return res.status(200).send({
          success: true,
        });
      }
    }
  );
};

const setWhiteListedMainLogic = (hash, caller, isWhiteListed, res) => {
  if (!hash) return res.status(400).send({ msg: "Input hash value!" });
  if (!isWhiteListed)
    return res.status(400).send({ msg: "Input whitelist status!" });
  if (isWhiteListed !== "true" && isWhiteListed !== "false")
    return res.status(400).send({ msg: "Invalid whitelist status!" });

  db.query(
    `SELECT hash, isAdmin, isWhiteListed, custom_wallet_address, custom_wallet_mnemonic FROM users WHERE hash = ${db.escape(
      hash
    )} OR hash = ${db.escape(caller)};`,
    async (err, result) => {
      if (err) return res.status(400).send({ msg: "Server Error!", err: err });
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
        !(caller === ADMIN.hash || caller === targetUser.isWhiteListed)
      )
        return res.status(400).send({ msg: "Bad Request: No Permission!" });

      // ---------- Main Logic ----------- //
      const wallet =
        isWhiteListed === "true"
          ? await generateWallet()
          : { address: "", mnemonic: "" };

      if (isWhiteListed === "true") {
        const transactionResult = await addWhiteUser(wallet);
        if (!transactionResult) {
          return res
            .status(400)
            .send({ msg: "Failed in setting to contract!" });
        }
        console.log("transaction success", transactionResult);
        setWhiteListed(hash, caller, caller, wallet, res);
      } else {
        db.query(
          `SELECT custom_wallet_address, custom_wallet_mnemonic FROM users WHERE hash = ${db.escape(
            hash
          )};`,
          async (err, result) => {
            if (err)
              return res.status(400).send({ msg: "Server Error!", err: err });
            if (!result || result.length === 0)
              return res.status(400).send({ msg: "User Not Found!" });
            console.log("saved user", result[0]);
            const transactionResult = await removeWhiteUser({
              address: result[0].custom_wallet_address,
              mnemonic: result[0].custom_wallet_mnemonic,
            });
            if (!transactionResult) {
              return res
                .status(400)
                .send({ msg: "Failed in setting to contract!" });
            }
            console.log("transaction success", transactionResult);
            setWhiteListed(hash, "", caller, wallet, res);
          }
        );
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
      if (err) return res.status(400).send({ msg: "Server Error!", err: err });
      const user = result[0];
      if (!user) return res.status(400).send({ msg: "User does not exist!" });
      if (user.password)
        return res.status(400).send({ msg: "Password already exists!" });
      db.query(
        `UPDATE users SET password = ${db.escape(
          password
        )} WHERE hash = ${db.escape(hash)};`,
        (err, result) => {
          if (err)
            return res.status(400).send({ msg: "Server Error!", err: err });
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
      if (err) return res.status(400).send({ msg: "Server Error!", err: err });
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
      if (err) return res.status(400).send({ msg: "Server Error!", err: err });
      if (isAdmin === "true") {
        db.query(
          `SELECT isWhiteListed FROM users WHERE hash = ${db.escape(hash)};`,
          async (err, result) => {
            if (err) return res.status(400).send({ msg: "Server Error!", err });
            const targetUser = result[0];
            if (!targetUser.isWhiteListed) {
              setWhiteListedMainLogic(hash, caller, "true", res);
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
