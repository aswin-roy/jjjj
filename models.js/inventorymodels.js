const mongoose=require("mongoose");
const inventorySchema=mongoose.Schema({
    productname:{
        type:String
    },
    skucode:{
        type:String,//unique:true
    },
    category:{
        type:String,
    },
    price:{
        type:Number
    },
    stock:{
        type:Number
    }
    
},{timestamps:true});
const Inventory=mongoose.model("inventory",inventorySchema);
module.exports=Inventory;