import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { Product } from "./store-api/models/product.js";   //revised path
import { Question } from "./store-api/models/question.js"; // revised path
import { Shop } from "./store-api/models/shop.js"; //revised path

mongoose.connect("mongodb://localhost:27017/stores");
let app = express();
app.use(express.json());

const users = [{"id": "1", "username": "admin", "password": "$2a$12$jVJbhRu5aPSsi6WM5b2l2uUKiUrwWTquR1I18vx8ZBujKU8eVx9Ru"}] //password: adminpassword123

const authenticate = (req, res, next) => 
{
    const {username, password} = req.body;
    const user = users.find(u => u.username === username);
    if(user && bcrypt.compareSync(password, user.password))
    {
        req.user = {"id": user.id, "username": user.username};
        next();
    }
    else
    {
        res.status(401).json({"message": "Invalid credentials"});
    }
};


const authorize = (req, res, next) =>
{
    try
    {
        const authHeader = req.headers.authorization;
        if(authHeader === undefined || authHeader === null)
        {
            return res.sendStatus(401);
        }
        const token = authHeader.split(" ")[1];
        if(token == null) return res.sendStatus(401);
        jwt.verify(token, "secret_key", (err, user) =>
        {
            if(err) return res.sendStatus(403);
            req.user = user;
            next();
        });
    }catch(err)
    {
        console.log(err);
    }
};

function haversineDistance(coords1, coords2, isMiles = false) {
    const toRad = (x) => x * Math.PI / 180;

    const lat1 = coords1.latitude;
    const lon1 = coords1.longitude;

    const lat2 = coords2.latitude;
    const lon2 = coords2.longitude;
  

    const R = 6371; 
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    let distance = R * c;

    if (isMiles) {
        distance /= 1.60934;
    }
    return distance;
}

app.post("/login", authenticate, (req, res) => 
{
    const token = jwt.sign(req.user, "secret_key", {"expiresIn": "6h"});
    res.json({token});
});

app.use((err, req, res, next) => 
{
    if(err instanceof SyntaxError && err.status === 400 && "body" in err)
    {
        return res.status(400).json({error: "Invalid JSON input"});
    }
    next(err);
});

app.get("/product/getproduct", async(req, res) => 
{
    try
    {
        const product = await Product.find();
        if(!product)
        {
            return res.status(404).send("Product not found.");
        }
        res.send(product);
    }catch(err)
    {
        res.status(500).send(err);
    }
});

app.get("/product/:keywords", async(req, res) =>
{
    try
    {
        const keyword = req.params.keywords;
        const prodcut = await Product.find
        ({
            $or:
            [
                {ProductID: {$regex: keyword}},
                {Name: {$regex: keyword, $options: "i"}},
                {Category: {$regex: keyword}},
                {Description: {$regex: keyword, $options: "i"}},
            ],
        });
        if(Object.keys(prodcut).length === 0)
        {
            res.status(200).send("No result found!\n未找到结果!");
        }
        else
        {
            res.status(200).send(prodcut);
        }
    }catch(err)
    {
        res.status(500).send(err);
    }
});

app.get("/product/:keywords/:lowestprice/:highestprice", async(req, res) =>
{
    try
    {
        const keyword = req.params.keywords;
        const product = await Product.aggregate
        ([
            {
                $addFields: 
                {
                    NumPrice: 
                    {
                        $toDouble: 
                        {
                            $replaceAll: 
                            {
                                input: 
                                {
                                    $replaceAll: 
                                    {
                                        input: "$Price",
                                        find: "HK$",
                                        replacement: ""
                                    }
                                },
                                find: ",",
                                replacement: ""
                            }
                        }
                    }
                }
            },
            {   
                $match: 
                {
                    $and: 
                    [
                        {NumPrice: { $gte: Number(req.params.lowestprice)}},
                        {NumPrice: { $lte: Number(req.params.highestprice)}},

                        {
                            $or: 
                            [
                                {ProductID: {$regex: keyword}},
                                {Name: {$regex: keyword, $options: "i"}},
                                {Category: {$regex: keyword}},
                                {Description: {$regex: keyword, $options: "i"}},
                            ]
                        }
                    ]
                }
            },
            {
                $unset: "NumPrice"
            }
        ]);
        if(Object.keys(product).length === 0)
        {
            res.status(200).send("No result found!\n未找到结果!");
        }
        else
        {
            res.status(200).send(product);
        }
    }catch(err)
    {
        res.status(500).send(err);
    }
});

app.post("/addproduct", authorize, async(req, res) => 
{
    try
    {
        const productid = await Product.findOne({ProductID: req.body.ProductID});
        if(!productid)
        {
            const product = new Product(req.body);
            await product.save();
            res.status(201).send(product);
        }
        else if(productid)
        {
            res.status(400).send("You cannot add a product with existing ProductID.");
        }
    }catch(err)
    {
        res.status(500).send(err);
    }
});

app.put("/editproduct/:productid", authorize, async(req, res) =>
{
    try
    {
        const product = await Product.findOne({ProductID: req.params.productid})
        if (!product) {
            return res.status(404).send("The Product does not exist.");
        }
        else if(req.params.productid != Number(req.body.ProductID))
        {
            return res.status(400).send("The ProductID does not match.");
        }
        else
        {
            const result = await Product.findOneAndUpdate({ProductID: req.params.productid}, req.body,
            {
                new: true,
                runValidators: true,
            });

            res.send(result);
        }
    }catch(err)
    {
        res.status(500).send(err);
    }
});

app.delete("/delproduct/:productid", authorize, async(req,res) => 
{
    try
    {
        const product = await Product.findOneAndDelete({ProductID: req.params.productid});
        if(!product)
        {
            return res.status(404).send("The product does not exist.");
        }
        res.status(200).json(`Successfully deleted Product ${product.ProductID}`);
    }catch(err)
    {
        res.status(500).send(err);
    }
});

app.get("/shop/getshop", async (req, res) => {
    try {
        const shops = await Shop.find();
        if (!shops) {
            return res.status(404).send("The shop does not exist.");
        }
        res.send(shops);
    } catch (err) {
        res.status(500).send(err);
    }
});

app.post("/addshop", authorize, async (req, res) => {
    // Need to check any duplicated ShopID
    try {
        const shopid = await Shop.findOne({ShopID: req.body.ShopID});
        if(!shopid)
        {
            const shop = new Shop(req.body);
            await shop.save();
            res.status(201).send(shop);
        }
        else if(shopid)
        {
            res.status(400).send("You cannot add a shop with existing ShopID.");
        }
    } catch (err) {
        res.status(500).send(err); //revised error status code
    }
});

app.put("/editshop/:shopid", authorize, async (req, res) => {
    try {
        const shop = await Shop.findOne({ShopID: req.params.shopid})
        if (!shop) {
            return res.status(404).send("The Shop does not exist.");
        }
        else if(req.params.shopid != Number(req.body.ShopID))
        {
            return res.status(400).send("The ShopID does not match.");
        }
        else
        {
            const result = await Shop.findOneAndUpdate({ShopID: req.params.shopid}, req.body,
            {
                new: true,
                runValidators: true,
            });

            res.send(result);
        }
        
        
    } catch (err) {
        res.status(500).send(err)
        //res.status(400).send(err);
        //console.log("Error catched: Edit shop fail.");
        //console.log(err);
    }
});

app.delete("/delshop/:shopid", authorize, async (req, res) => {
    try {
        const shop = await Shop.findOneAndDelete({ ShopID: req.params.shopid });
        if (!shop) {
            return res.status(404).send("The shop does not exist.");
            console.log("Error catched: Delete shop fail.")
            console.log(err);
        }
        //res.send(shop);
        res.status(200).json(`Successfully deleted Shop ${shop.ShopID}`);
    } catch (err) {
        res.status(500).send(err);
    }
});

app.get("/shop/:latitude/:longtitude", async (req, res) => {
    try {

        const coords1 = { latitude: req.params.latitude, longitude: req.params.longtitude };
        const shops = await Shop.find({});
        let result = shops.filter(shop => {
            return haversineDistance(coords1, {latitude: shop.Latitude, longitude: shop.Longitude}) <= 2;
        })

        if (!shops) {
            return res.status(404).send();
        }
        if(Object.keys(result).length == 0)
        {
            res.status(200).send(`No result found!\n未找到结果!`);
        }
        else
        {
            res.send(result);
        }
        //res.status(200).send("No result found!\n未找到结果!");
        //res.status(200).send(`No result found!\n未找到结果! ${result}`);
    } catch (err) {
        res.status(500).send(err);
        console.log(err);
    }
});

app.get("/question/getquestion", async (req, res) => 
{
    try 
    {
        const question = await Question.find();
        if(!question)
        {
            return res.status(404).send("Question not found.");
        }
        res.send(question);
    } catch (err) 
    {
       res.status(500).send(err);
    }
});

app.post("/addquestion", authorize, async (req, res) => 
{
    try 
    {
       const questionid = await Question.findOne({QuestionID: req.body.QuestionID});
        if (!questionid) 
        {
            const question = new Question(req.body);
            await question.save();
            res.status(201).send(question);
        }
        else if (questionid) 
        {
            res.status(400).send("You cannot add a question with existing QuestionID.");
        }
    } catch (err) 
    {
        res.status(500).send(err);
    }
});

app.put("/editquestion/:questionid", authorize, async (req, res) => 
{
    try 
    {
        const question = await Question.findOne({QuestionID: req.params.questionid})
        if (!question) {
            return res.status(404).send("The Question does not exist.");
        }
        else if(req.params.questionid != Number(req.body.QuestionID))
        {
            return res.status(400).send("The QuestionID does not match.");
        }
        else
        {
            const result = await Question.findOneAndUpdate({QuestionID: req.params.questionid}, req.body,
            {
                new: true,
                runValidators: true,
            });

            res.send(result);
        }
    } catch (err) 
    {
        res.status(500).send(err);
    }
});

app.delete("/delquestion/:questionid", authorize, async (req, res) => 
{
    try 
    {
        const question = await Question.findOneAndDelete({QuestionID: req.params.questionid});
        if (!question) 
        {
           return res.status(404).send("The question does not exist.");
        }
        res.status(200).json(`Successfully deleted Question ${question.QuestionID}`);
    } catch (err) 
    {
        res.status(500).send(err);
    }
});

app.get("/question/:keywords", async(req, res) =>
{
    try
    {
        const keyword = req.params.keywords;
        const question = await Question.find
        ({
            $or:
            [
                {QuestionID: {$regex: keyword}},
                {Questions: {$regex: keyword}},
                {Answers: {$regex: keyword}},
            ],
        });
        if(Object.keys(question).length === 0)
        {
            res.status(200).send("No result found!\n未找到结果!");
        }
        else
        {
            res.status(200).send(question);
        }
    }catch(err)
    {
        res.status(500).send(err);
    }
});

let server = app.listen(8080, () =>
{
    let host = server.address().address;
    let port = server.address().port;
    console.log(`Please visit the website http://${host}:${port}`);
});