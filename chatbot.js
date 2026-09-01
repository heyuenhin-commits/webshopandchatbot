import {bot} from "./socketio.js";
import axios from "axios";
//import {getJSON} from "./data.js";

async function getJSON(url) {
    return await axios.get(url);
}

function printout(Item, bot, fromId, resp)
{
    Item.forEach(async (item, idx, array) => 
    {
        for (const [key, value] of Object.entries(item))
        {
            resp += `${key}: ${value}\n`;
        }
        //console.log(resp);
        bot.sendMessage(fromId, resp);
        resp = "";
    });
}

bot.onText(/\/start/, function (msg)
{
    let chatId = msg.chat.id;
    let resp = "Welcome to Chatbot.\nYou can access the data from the following command:\nType: /product keywords \nType: /product keywords/lowestprice/highestprice\nType: /question keywords\nClick: Location button to find the nearest shop(s)\n";
    bot.sendMessage(chatId, resp);
});

bot.onText(/\/product (.+)/, async function (msg, match)
{
    try
    {
        let fromId = msg.from.id;
        let resp = "";
        let input = match[1].replace(/\s+/, "");
        if(input.split("/").length > 2)
        {
            return;
        }
        let productJSON = await getJSON("http://localhost:8080/product/getproduct");
        let result = productJSON.data.filter((product) =>
        {
            return product.ProductID.includes(input) || product.Name.includes(input) 
            || product.Category.includes(input) || product.Description.includes(input);
        });
        //console.log(result);
        if(result.length > 0)
        {
            printout(result, bot, fromId, resp);
        }
        else
        {
            bot.sendMessage(fromId, "No result found!\n沒有找到結果!");
        }
    }catch(err)
    {
        console.log(err);
    }
});

bot.onText(/\/product (.+)\/(.+)\/(.+)/, async function(msg, match)
{
    try
    {
        let fromId = msg.from.id;
        let resp = "";
        let input = match[1].replace(/\s+/, "");
        let lowestprice = match[2].replace(/\s+/, "");
        let highestprice = match[3].replace(/\s+/, "");
        let productJSON = await getJSON("http://localhost:8080/product/getproduct");
        let result = productJSON.data.filter((product) =>
        {
            return Number(product.Price.replace("HK$","").replace(/\s+/, "").replace(",", "")) >= lowestprice 
            && Number(product.Price.replace("HK$","").replace(/\s+/, "").replace(",", "")) <= highestprice &&
            (product.ProductID.includes(input) || product.Name.includes(input) 
            || product.Category.includes(input) || product.Description.includes(input));
        });
        //console.log(result);
        if(result.length > 0)
        {
            printout(result, bot, fromId, resp);
        }
        else
        {
            bot.sendMessage(fromId, "No result found!\n沒有找到結果!");
        }
    }catch(err)
    {
        console.log(err);
    }
});

bot.onText(/\/question (.+)/, async function (msg, match)
{
    try
    {
        let fromId = msg.from.id;
        let resp = "";
        let input = match[1].replace(/\s+/, "");
        if(input.split("/").length > 2)
        {
            return;
        }
        let questionJSON = await getJSON("http://localhost:8080/question/getquestion");
        let result = questionJSON.data.filter((question) =>
        {
            return question.QuestionID.includes(input) || question.Questions.includes(input) 
            || question.Answers.includes(input) ;
        });
        //console.log(result);
        if(result.length > 0)
        {
            printout(result, bot, fromId, resp);
        }
        else
        {
            bot.sendMessage(fromId, "No result found!\n沒有找到結果!");
        }
    }catch(err)
    {
        console.log(err);
    }
});

bot.on("location", async (msg) =>
{
    try
    {
        let fromId = msg.from.id;
        let resp = "";
        let result = await getshopdata(msg.location.latitude, msg.location.longitude);
        if(!result) 
        {
            bot.sendMessage(fromId, "No nearby shop(s).");
        }
        else
        {
            printout(result, bot, fromId, resp);
        }
    }catch(err)
    {
        console.log(err);
    }
});

async function getshopdata(latitude, longitude)
{
    const url = `http://localhost:8080/shop/${encodeURIComponent(latitude)}/${encodeURIComponent(longitude)}`;
    try
    {
        const respone = await fetch(url);
        const data = await respone.json();
        return data;
    }
    catch(err)
    {
        return false;
    }
}