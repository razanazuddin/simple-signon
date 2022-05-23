const express = require("express");
const bodyParser = require("body-parser");
require("./../middleware");

const apiRouter = express.Router();
apiRouter.use(bodyParser.json()); // to use body object in requests

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Returns all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: the list of the users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */

apiRouter.get("/users", (req, res, next) => {
  var sql = "SELECT * FROM Users"
  var params = []
  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(400).json({
        "error": err.message
      });
      return;
    }
    res.json({
      "message": "success",
      "data": rows
    })
  });
});

/**
 * @swagger
 * /user/{id}:
 *   get:
 *     summary: Returns user by id
 *     tags: [Users]
 *     parameters:
 *       - in : path
 *         name: id
 *         description: id of user
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: user by its id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: user can not be found
 */

apiRouter.get("/user/:id", (req, res, next) => {
  var sql = "SELECT * FROM Users WHERE Id = ?"
  db.all(sql, req.params.id, (err, rows) => {
    if (err) {
      res.status(400).json({
        "error": err.message
      });
      return;
    }
    res.json({
      "message": "success",
      "data": rows
    })
  });
});

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: The user was successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       500:
 *         description: Some server error
 */

apiRouter.post("/register", async (req, res) => {
  var errors = []
  try {
    const {
      Username,
      Email,
      Password,
      UserType
    } = req.body;

    if (!Username) {
      errors.push("Username is missing");
    }
    if (!Email) {
      errors.push("Email is missing");
    }
    if (!UserType) {
      errors.push("UserType is missing");
    }
    if (errors.length) {
      res.status(400).json({
        "error": errors.join(",")
      });
      return;
    }
    let userExists = false;

    var sql = "SELECT * FROM Users WHERE Email = ?"
    await db.all(sql, Email, (err, result) => {
      if (err) {
        res.status(402).json({
          "error": err.message
        });
        return;
      }

      if (result.length === 0) {

        var salt = bcrypt.genSaltSync(10);

        var data = {
          Username: Username,
          Email: Email,
          Password: bcrypt.hashSync(Password, salt),
          UserType: UserType,
          Salt: salt,
          DateCreated: Date("now")
        }

        var sql = "INSERT INTO Users (Username, Email, Password, UserType, Salt, DateCreated) VALUES (?,?,?,?,?,?)"
        var params = [data.Username, data.Email, data.Password, data.UserType, data.Salt, Date("now")]
        db.run(sql, params, function(err, innerResult) {
          if (err) {
            res.status(400).json({
              "error": err.message
            })
            return;
          }
        });
      } else {
        userExists = true;
        // res.status(404).send("User already Exist. Please Login.");  
      }
    });

    setTimeout(() => {
      if (!userExists) {
        res.status(201).json("Success");
      } else {
        res.status(201).json("Record already exists. Please login.");
      }
    }, 500);
  } catch (err) {
    console.log(err);
  }
});

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Log in user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: The user was successfully logged in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       500:
 *         description: Some server error
 */

apiRouter.post("/login", async (req, res) => {
  try {
    const {
      Email,
      Password
    } = req.body;
    // Make sure there is an Email and Password in the request
    if (!(Email && Password)) {
      res.status(400).send("All input is required");
    }

    let user = [];

    var sql = "SELECT * FROM Users WHERE Email = ?";
    db.all(sql, Email, function(err, rows) {
      if (err) {
        res.status(400).json({
          "error": err.message
        })
        return;
      }

      rows.forEach(function(row) {
        user.push(row);
      })

      var PHash = bcrypt.hashSync(Password, user[0].Salt);

      if (PHash === user[0].Password) {
        // Create jwt token
        const token = jwt.sign({
            user_id: user[0].Id,
            username: user[0].Username,
            Email
          },
          process.env.TOKEN_KEY, {
            expiresIn: "1h"
          }
        );

        user[0].Token = token;
      } else {
        return res.status(400).send("No Match");
      }

      return res.status(200).json({
        "message": "Hello world",
        "data": user
      });
    });
  } catch (err) {
    console.log(err);
  }
});


/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - Username
 *         - Email
 *         - Password
 *         - UserType
 *       properties:
 *         Id:
 *           type: integer
 *           description: Auto-generated id of a user
 *         Username:
 *           type: string
 *           description: Username of a user
 *         Email:
 *           type: string
 *           description: Email of a user
 *         Password:
 *           type: string
 *           description: Password of a user
 *         UserType:
 *           type: string
 *           description: User's permission type
 *         DateLoggedIn:
 *           type: string
 *           description: User's last login date
 *         DateCreated:
 *           type: string
 *           description: User's created date
 *       example:
 *         Id: 1
 *         Username: "user1"
 *         Email: "user1@example.com"
 *         Password: "$2a$10$swhOfLEXalEvB1xPK8pgu.DLHvoto9LsOR.vQ1XCdfzkt97/nBoeO"
 *         UserType: 0
 *         DateLoggedIn: null
 *         DateCreated: "Sun May 22 2022 07:37:28 GMT+0800 (Malaysia Time)"
 */

/**
 * @swagger
 *  tags:
 *    name: Users
 *    description: users of users
 */

module.exports = apiRouter;