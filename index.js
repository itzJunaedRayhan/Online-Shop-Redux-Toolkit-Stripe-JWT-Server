const express = require("express");
const app = express();
app.use(express.json());
const cors = require("cors");
app.use(cors());
const port = process.env.PORT || 5000;
const mongoose = require("mongoose");
const register = require("./Routes/register");
const login    = require("./Routes/login");
const stripe   = require("./Routes/stripe");
const products = require("./Products/Products");
const path = require('path');
require('dotenv').config({path:path.resolve(__dirname, './.env')});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@shopping-cart-cluster.a63vaje.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;



app.use("/api/register", register);
app.use("/api/login", login);
app.use("/api/stripe", stripe);

app.get("/", (req, res) => {
    res.send("Welcome to Our Online Shop API...");
});

app.get("/products", (req, res) => {
    res.send(products);
});



app.listen(port, console.log(`Server running on port ${port}`));


mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true})
.then(() => console.log("MongoDB Connection Successfull..."))
.catch((err) => console.log("MongoDB Connection Failed...", err.message));