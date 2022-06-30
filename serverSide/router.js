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
    `SELECT first_name, last_name, email, address, hash, isWhiteListed, entity_id, password FROM users WHERE address = ${db.escape(
      address
    )} AND hash = ${db.escape(hash)};`,
    (err, result) => {
      if (err) return res.status(400).send({ msg: "Server Error!", err: err });
      return res.send({
        success: true,
        users: result.map((item) => {
          const returnValue = { ...item, registered: !!item.password };
          delete returnValue.password;
          return returnValue;
        }),
      });
    }
  );
});

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

router.get("/get-user", [], (req, res, next) => {
  db.query(
    "SELECT first_name, last_name, email, address, hash, isWhiteListed FROM users",
    function (error, results) {
      if (error) throw error;

      return res.send({
        error: false,
        data: results,
        message: "Fetch Successfully.",
      });
    }
  );
});

const setWhiteListed = (hash, isWhiteListed, wallet, res) => {
  db.query(
    `UPDATE users SET isWhiteListed = ${isWhiteListed}, custom_wallet_address = ${db.escape(
      wallet?.address || ""
    )}, custom_wallet_mnemonic = ${db.escape(
      wallet?.mnemonic || ""
    )} WHERE hash = ${db.escape(hash)};`,
    (err, result) => {
      if (err) return res.status(400).send({ msg: "Server Error!", err: err });
      return res.status(200).send({
        success: true,
      });
    }
  );
};

router.post("/set-whitelist", [], async (req, res, next) => {
  const hash = req.body.hash;
  const isWhiteListed = (req.body.isWhiteListed || "").toLowerCase();
  if (!hash) return res.status(400).send({ msg: "Input hash value!" });
  if (!isWhiteListed)
    return res.status(400).send({ msg: "Input whitelist status!" });
  if (isWhiteListed !== "true" && isWhiteListed !== "false")
    return res.status(400).send({ msg: "Invalid whitelist status!" });

  console.log("here");
  const wallet =
    isWhiteListed === "true"
      ? await generateWallet()
      : { address: "", mnemonic: "" };

  if (isWhiteListed === "true") {
    const transactionResult = await addWhiteUser(wallet);
    if (!transactionResult) {
      return res.status(400).send({ msg: "Failed in setting to contract!" });
    }
    console.log("transaction success", transactionResult);
    setWhiteListed(hash, isWhiteListed, wallet, res);
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
        setWhiteListed(hash, isWhiteListed, wallet, res);
      }
    );
  }
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

module.exports = router;
