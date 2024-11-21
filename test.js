const cables = require("./index.js");

cables.export({
    "patchId": "pQpie9",
    "patch": true,
    "destination": "test"
}, onFinished, onError);

function onFinished()
{
    console.log("Export finished!");
}

function onError(err)
{
    console.log("There was an error exporting your patch :/");
}
