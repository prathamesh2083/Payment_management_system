const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const bcrypt = require("bcryptjs");


// creating database paymentDB

const app = express();

const port = 3000;
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: "our little secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 },
  })
);
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/paymentDB", {
  useNewUrlParser: true,
});
const accountschema = mongoose.Schema({
  username: String,
  password: String,
  phone_number: Number,
  account_number: Number,
  balance: Number,
  transactions:[],
});
accountschema.plugin(passportLocalMongoose);
const account = mongoose.model("account", accountschema);
passport.use(account.createStrategy());
passport.serializeUser(account.serializeUser());
passport.deserializeUser(account.deserializeUser());
app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("index.ejs", {
      isauth: true,
    });
  } else {
    res.redirect("/login_page");
  }
});

app.get("/login_page", (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect("/");
  } else {
    res.render("login_page.ejs");
  }
});


app.get("/pay_page", (req, res) => {
  var result;
  if (req.isAuthenticated()) {
    res.render("pay_page.ejs", {
      isauth: true,
      result:result,
    });
  } else {
    res.redirect("/");
  }
});
var payto;
var paytoname;
app.post("/find_phone", (req, res) => {
  var result;
  if (req.isAuthenticated()) {
    const phone_number=req.body.phone_number;
    console.log("come to find phone" + phone_number);
    
    
     account.findOne({phone_number:phone_number}).then(function(user,err){
         if(err){
          console.log(err);
         }
         else{
             if(user){
              payto=user.phone_number;
             
              paytoname=user.username;
              
              res.render("pay_page.ejs", {
                isauth: true,
                userfound: payto
              });
             
             }
             else{
               res.render("pay_page.ejs", {
                 isauth: true,
                 result: "Account not found / Invalid phone number"
               });
             }
         }
     });
  } else {
    res.redirect("/");
  }
});
app.post("/pay", (req, res) => {
  
  var result;
  if (req.isAuthenticated()) {
    const phone_number = req.body.phone_number;

   
    var amount=req.body.amount;
    const d = new Date();
    
    const date=d.toLocaleDateString("en-US");
    if(req.user.balance>=amount){
         const receiver = {
           name: req.user.username,
           date: date,
           amount: amount,
           phone_number: req.user.phone_number
         };
         const amt=(-1)*amount;
         const sender={
          name: paytoname,
          date:date,
          amount:amt,
          phone_number:payto

         }
         account
           .findOneAndUpdate(
             { phone_number:payto },
             { $inc: { balance: amount }} 
           )
           .then(function (result, err) {
             if (err) {
               console.log("Amount not added");
             } else {
              console.log(result);
               console.log("Amount added successfully");
             }
           });

         account
           .findOneAndUpdate(
             { phone_number:payto },
             { $push: { transactions: receiver }} 
           )
           .then(function (result, err) {
             if (err) {
               console.log("Amount not added");
             } else {
              console.log(result);
               console.log("Amount added successfully");
             }
           });

           amount=(-1)*amount;
           account
             .findOneAndUpdate(
               { phone_number: req.user.phone_number },
               { $inc: { balance: amount } }
             )
             .then(function (result, err) {
               if (err) {
                 console.log("Amount not added");
               } else {
                 console.log("Amount added successfully");
               }
             });
           account
             .findOneAndUpdate(
               { phone_number: req.user.phone_number },
               { $push: { transactions: sender } }
             )
             .then(function (result, err) {
               if (err) {
                 console.log("Amount not added");
               } else {
                 console.log("Amount added successfully");
               }
             });



             res.redirect("/");
    }
    else{
      res.render("pay_page.ejs",{
          isauth:true,
          result:"Insufficient Balance "
      });
    }
  } else {
    res.redirect("/");
  }
});

app.get("/check_balance", (req, res) => {
  if (req.isAuthenticated()) {
    var account_number = req.user.account_number;
    account_number = account_number.toString();
    account_number = account_number.slice(account_number.length - 4);
    res.render("check_balance.ejs", {
      isauth: true,
      account_num: account_number,
      balance: req.user.balance,
    });
  } else {
    res.redirect("/");
  }
});


app.post(
  "/check",
  passport.authenticate("local", { failureRedirect: "/login_page" }),
  function (req, res) {
    res.redirect("/");
  }
);

app.post("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    
    res.redirect("/");
  });
});

app.get("/register_page", (req, res) => {
  res.render("register_page.ejs");
});

// adding new user in accounts
app.post("/register", (req, res) => {
  // Request body parameters

  const bal = 0; // Setting an initial balance of 0

  // Register the user
  account.register(
    {
      username: req.body.username,
      phone_number: req.body.phone_number,
      account_number: req.body.account_number,
      balance: bal,
    },
    req.body.password,

    function (err, account) {
      if (err) {
        res.redirect("/register_page");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/login_page");
        });
      }
    }
  );
});

// add money page
app.get("/add_money", (req, res) => {
  if (req.isAuthenticated())
    res.render("add_money.ejs", {
      isauth: true,
    });
  else {
    res.redirect("/");
  }
});

app.post("/addamount", (req, res) => {
  if (req.isAuthenticated()) {
    const amt = req.body.amount;

    account
      .findOneAndUpdate(
        { username: req.user.username },
        { $inc: { balance: amt } }
      )
      .then(function (result, err) {
        if (err) {
          console.log("Amount not added");
        } else {
          console.log("Amount added successfully");
        }
      });
  }
  res.redirect("/");
});



// history page
app.get("/history",(req,res)=>{
 if (req.isAuthenticated()) {
   res.render("history.ejs", {
     isauth: true,
     transactions:req.user.transactions
   });
 } else {
   res.redirect("/");
 }
});


app.listen(port, () => {
  console.log("running on port " + port);
});
