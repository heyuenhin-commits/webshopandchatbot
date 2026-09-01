import { mongoose } from "mongoose"

const shopSchema = new mongoose.Schema({
    ShopID: {
        type: String, required: true, validate:
        {
            validator: function (val) {
                return val.length == 4;
            },
            message: `ShopID is not valid!`,
        }
    },
    Name: String,
    Address: String,
    // Business_hours: {
    //     // regex validation for HH:mm
    //     open: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
    //     close: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ }
    // },
    Business_hours: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9] - ([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
    Latitude: { type: Number, min: -90, max: 90 },
    Longitude: { type: Number, min: -180, max: 180 }
});

const Shop = mongoose.model('Shop', shopSchema);
export { Shop }