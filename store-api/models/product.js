import mongoose from "mongoose";

const prodcutSchema = new mongoose.Schema
({
    ProductID: {type: String, required: true, validate:
        {
            validator: function(val)
            {
                return val.length == 4;
            },
            message: `ProudctID is not valid!`,
        }},
    Name: {type: String},
    Category: {type: String, enum:
        {
            values: ["電腦產品", "美容", "小型電器"],
            message: "The Category is not exist."
        }
    },
    Price: {type: String, match: /^HK\$\d{1,3}(,\d{3})*\.\d{2}$/},
    Description: {type: String}
});

const Product = mongoose.model("Product", prodcutSchema);

export {Product};