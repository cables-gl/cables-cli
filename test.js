import { Cables } from "./index.js";

const cables = new Cables();
cables.export(
    {
        "patch": "pQpie9",
        "destination": "patch",
        "combinejs": false,
        "minify": false,
        "index": false
    }
).then((r) =>
{
    r.log.forEach((log) =>
    {
        console.log(log.message);
    });
    console.log("Export finished!");
}).catch((err) =>
{
    console.log("There was an error exporting your patch :/");
});
