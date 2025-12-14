const mongoose=require("mongoose");
const customersSchema=mongoose.Schema({
    customername:{
        type:String
    },
    customerphone:{
        type:Number,
    },
    customeraddress:{
        type:String

    }
})
const customersModel=mongoose.model("customers",customersSchema)
module.exports=customersModel

