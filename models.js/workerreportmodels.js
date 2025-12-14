const mongoose= require('mongoose');
const workerreportSchema =new mongoose.Schema({
    name:{
        type:String
    },
    role:{
        type:String
    }
})