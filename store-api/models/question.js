import mongoose from "mongoose";

const questionSchema = new mongoose.Schema
({
    QuestionID: {type: String, required: true, validate:
        {
            validator: function(val)
            {
                return val.length == 4;
            },
            message: `QuestionID is not valid!`,
        }},
    Questions: {type: String},
    Answers: {type: String},
});

const Question = mongoose.model("Question", questionSchema);

export {Question};